"""
=============================================================================
Authentication Routes
=============================================================================
Endpoints: /api/register, /api/login, /api/logout, /api/refresh

OWASP PROTECTIONS:
  - Broken Authentication: bcrypt hashing, JWT tokens, rate limiting, lockout
  - Injection: SQLAlchemy ORM (parameterized queries)
  - Sensitive Data Exposure: Passwords never returned; generic error messages
  - Security Misconfiguration: Proper HTTP status codes, JSON error bodies
=============================================================================
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from extensions import limiter
from models.user import User
from services.auth_service import (
    create_user,
    authenticate_user,
    add_token_to_blocklist,
    log_action,
)
from services.validators import validate_registration_input
from utils.security import sanitize_string

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/register", methods=["POST"])
@limiter.limit("10 per minute")  # SECURITY: Rate limit prevents mass-registration bots
def register():
    """
    Register a new user account.

    SECURITY MEASURES:
      1. Input sanitization (XSS prevention)
      2. Server-side validation (defence-in-depth)
      3. Email uniqueness check (prevents duplicate accounts)
      4. Password hashed with bcrypt before storage
      5. Rate limited to prevent abuse
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required."}), 400

    # SECURITY: Sanitize all string inputs to prevent XSS
    name = sanitize_string(data.get("name", ""))
    email = sanitize_string(data.get("email", ""))
    password = data.get("password", "")  # Passwords are not sanitized — they are hashed
    confirm_password = data.get("confirmPassword", "")

    # SECURITY: Server-side validation (never trust the client)
    errors = validate_registration_input(name, email, password, confirm_password)
    if errors:
        return jsonify({"error": "Validation failed.", "details": errors}), 422

    # SECURITY: Check email uniqueness (SQLAlchemy parameterized query)
    if User.query.filter_by(email=email.strip().lower()).first():
        return jsonify({"error": "An account with this email already exists."}), 409

    # Create user (password is hashed inside create_user)
    user = create_user(name, email, password)

    # Generate JWT tokens
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "message": "Registration successful.",
        "user": user.to_dict(),
        "accessToken": access_token,
        "refreshToken": refresh_token,
    }), 201


@auth_bp.route("/api/login", methods=["POST"])
@limiter.limit("5 per minute")  # SECURITY: Strict rate limit on login prevents brute-force
def login():
    """
    Authenticate a user and return JWT tokens.

    SECURITY MEASURES:
      1. Rate limiting (5 attempts/minute)
      2. Account lockout after repeated failures
      3. Generic error messages (prevent username enumeration)
      4. Constant-time password comparison (bcrypt)
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required."}), 400

    email = data.get("email", "")
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    # Authenticate (includes lockout check)
    user, error = authenticate_user(email, password, current_app.config)

    if error:
        return jsonify({"error": error}), 401

    # Generate JWT tokens
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful.",
        "user": user.to_dict(),
        "accessToken": access_token,
        "refreshToken": refresh_token,
    }), 200


@auth_bp.route("/api/logout", methods=["POST"])
@jwt_required()
def logout():
    """
    Logout by revoking the current JWT.

    SECURITY: Token is added to a blocklist so it cannot be reused.
    This prevents token-replay attacks after logout.
    """
    jti = get_jwt()["jti"]
    add_token_to_blocklist(jti)

    # Audit log
    user_id = int(get_jwt_identity())
    log_action(user_id, "LOGOUT")

    return jsonify({"message": "Logout successful."}), 200


@auth_bp.route("/api/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """
    Issue a new access token using a valid refresh token.

    SECURITY: Allows the client to get a fresh access token without
    re-sending credentials. The refresh token has a longer lifespan
    but is only used for this single purpose.
    """
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)

    return jsonify({"accessToken": access_token}), 200
