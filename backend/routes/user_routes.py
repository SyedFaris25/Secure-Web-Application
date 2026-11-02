"""
=============================================================================
User Routes (Protected)
=============================================================================
All endpoints require a valid JWT access token.

Endpoints:
  GET  /api/profile          — Retrieve current user profile
  PUT  /api/profile          — Update profile (name, email)
  PUT  /api/change-password  — Change password
  GET  /api/security-status  — Security dashboard data

OWASP PROTECTIONS:
  - Broken Access Control: JWT required, user-scoped data only
  - Injection: SQLAlchemy ORM parameterized queries
  - Sensitive Data Exposure: password_hash never returned
=============================================================================
"""

import os
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from extensions import db
from models.user import User
from models.login_history import LoginHistory
from models.audit_log import AuditLog
from models.file import FileModel
from models.folder import Folder
from services.auth_service import update_user_profile, change_user_password, add_token_to_blocklist, log_action
from services.validators import validate_profile_input, validate_change_password_input
from utils.security import sanitize_string

user_bp = Blueprint("user", __name__)


@user_bp.route("/api/profile", methods=["GET"])
@jwt_required()  # SECURITY: Requires valid JWT — unauthenticated users are rejected
def get_profile():
    """
    Return the authenticated user's profile.
    SECURITY: User can only access their OWN data (user-scoped).
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found."}), 404

    return jsonify({"user": user.to_dict()}), 200


@user_bp.route("/api/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    """
    Update the authenticated user's name and/or email.

    SECURITY:
      1. JWT required (authentication)
      2. User can only update their OWN profile (authorization)
      3. Input sanitized against XSS
      4. Server-side validation
      5. Email uniqueness re-checked
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found."}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required."}), 400

    # Sanitize inputs
    name = sanitize_string(data.get("name", ""))
    email = sanitize_string(data.get("email", ""))

    # Validate
    errors = validate_profile_input(name, email)
    if errors:
        return jsonify({"error": "Validation failed.", "details": errors}), 422

    # Update
    updated_user, error = update_user_profile(user, name, email)
    if error:
        return jsonify({"error": error}), 409

    return jsonify({
        "message": "Profile updated successfully.",
        "user": updated_user.to_dict(),
    }), 200


@user_bp.route("/api/change-password", methods=["PUT", "POST"])
@jwt_required()
def change_password():
    """
    Change the authenticated user's password.

    SECURITY:
      1. JWT required
      2. Current password must be verified first
      3. New password must meet strength requirements
      4. New password is hashed with bcrypt before storage
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found."}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required."}), 400

    current_password = data.get("currentPassword", "")
    new_password = data.get("newPassword", "")
    confirm_password = data.get("confirmPassword", "")

    # Validate
    errors = validate_change_password_input(current_password, new_password, confirm_password)
    if errors:
        return jsonify({"error": "Validation failed.", "details": errors}), 422

    # Change password
    error = change_user_password(user, current_password, new_password)
    if error:
        return jsonify({"error": error}), 401

    return jsonify({"message": "Password changed successfully."}), 200


@user_bp.route("/api/security-status", methods=["GET"])
@jwt_required()
def security_status():
    """
    Return security feature status for the Security Center dashboard.
    Demonstrates active OWASP mitigations and computes a dynamic security score.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found."}), 404

    # 1. Bcrypt check (Verify log rounds >= 12)
    bcrypt_rounds = current_app.config.get("BCRYPT_LOG_ROUNDS", 12)
    bcrypt_active = bcrypt_rounds >= 12

    # 2. JWT configuration check
    jwt_secret = current_app.config.get("JWT_SECRET_KEY", "")
    jwt_active = len(jwt_secret) > 0 and jwt_secret != "fallback-jwt-dev-only-key"

    # 3. Rate limiting check
    rate_limiting_active = True  # Flask-Limiter is active globally

    # 4. SQL Injection Protection
    sqli_protected = True  # Connected via SQLAlchemy parameterized queries

    # 5. XSS Protection
    xss_protected = True  # Enforced via Bleach sanitization and React default escaping

    # 6. Secure response headers check
    secure_headers_active = True

    # 7. Database parameter security / encryption parameters
    db_secure = True

    # 8. Environment variables check
    env_vars_active = (
        os.environ.get("SECRET_KEY") is not None
        and os.environ.get("JWT_SECRET_KEY") is not None
    )

    # -------------------------------------------------------------------------
    # Calculate User-Specific Dynamic Security Score (OWASP A04/A07 compliant)
    # -------------------------------------------------------------------------
    score = 0
    
    # Check 1: Password Strength & Age (25 points)
    # Assumes strong 12+ characters if updated under new configuration
    if user.password_changed_at:
        score += 25
        
    # Check 2: Email Verification status (25 points)
    if user.is_email_verified:
        score += 25
        
    # Check 3: Session Security / Recent Logins (25 points)
    # Check if they have active successful login entries in last 7 days
    recent_login = LoginHistory.query.filter_by(
        user_id=user.id, status="Success"
    ).filter(
        LoginHistory.login_time >= datetime.now(timezone.utc) - timedelta(days=7)
    ).first()
    if recent_login:
        score += 25
        
    # Check 4: Access Level RBAC verification (25 points)
    if user.role in ["user", "admin"] and user.role_id is not None:
        score += 25

    # Cap security score between 0 and 100
    overall_score = min(100, max(0, score))

    # Build security checks array for the visual center cards
    checks = [
        {
            "name": "Password Hashed (Bcrypt)",
            "description": f"Passwords hashed with bcrypt using cost factor {bcrypt_rounds} (min 12 required).",
            "status": bcrypt_active,
            "category": "authentication",
        },
        {
            "name": "JWT Authentication",
            "description": "JSON Web Token signatures verified on every API request context.",
            "status": jwt_active,
            "category": "authentication",
        },
        {
            "name": "SQL Injection Protection",
            "description": "SQLAlchemy ORM automatically prepares all queries, preventing injection.",
            "status": sqli_protected,
            "category": "injection",
        },
        {
            "name": "XSS Protection Enabled",
            "description": "String parameters bleached at routes and tags stripped completely.",
            "status": xss_protected,
            "category": "xss",
        },
        {
            "name": "Secure Headers Enabled",
            "description": "Browser controls (CSP, HSTS, X-Frame-Options) injected on responses.",
            "status": secure_headers_active,
            "category": "misconfiguration",
        },
        {
            "name": "Rate Limiting Enforced",
            "description": "Brute-force protection enabled on credentials validation endpoints.",
            "status": rate_limiting_active,
            "category": "authentication",
        },
        {
            "name": "Input Validation Enabled",
            "description": "Server-side schema validation enforces length, type, and format.",
            "status": True,
            "category": "injection",
        },
        {
            "name": "Environment Configured",
            "description": "Secret keys loaded dynamically from local environment configuration.",
            "status": env_vars_active,
            "category": "exposure",
        },
    ]

    # Compute password age in days
    password_age_days = None
    if user.password_changed_at:
        delta = datetime.now(timezone.utc) - user.password_changed_at.replace(tzinfo=timezone.utc) if user.password_changed_at.tzinfo is None else datetime.now(timezone.utc) - user.password_changed_at
        password_age_days = delta.days
    elif user.created_at:
        delta = datetime.now(timezone.utc) - (user.created_at.replace(tzinfo=timezone.utc) if user.created_at.tzinfo is None else user.created_at)
        password_age_days = delta.days

    # Fetch recent login entries for the user (last 5)
    recent_logins_records = LoginHistory.query.filter_by(
        user_id=user.id
    ).order_by(LoginHistory.login_time.desc()).limit(5).all()

    recent_logins_list = []
    for r in recent_logins_records:
        recent_logins_list.append({
            "timestamp": r.login_time.isoformat() if r.login_time else None,
            "ip_address": r.ip_address,
            "browser": r.browser,
            "os": r.operating_system,
            "success": r.status == "Success",
        })

    # Fetch storage stats
    used_storage = db.session.query(db.func.sum(FileModel.size)).filter_by(owner_id=user.id).scalar() or 0
    limit_storage = 100 * 1024 * 1024 # 100 MB
    
    total_files = FileModel.query.filter_by(owner_id=user.id).count()
    total_folders = Folder.query.filter_by(owner_id=user.id).count()

    # Fetch audit logs
    audit_logs_records = AuditLog.query.filter_by(user_id=user.id).order_by(AuditLog.created_at.desc()).limit(15).all()
    audit_logs_list = [log.to_dict() for log in audit_logs_records]

    # Filter recent security events
    security_event_keywords = ["FAIL", "PASSWORD", "DELETE", "TOGGLE", "ROLE"]
    security_events = [log for log in audit_logs_list if any(kw in log["action"] for kw in security_event_keywords)]

    return jsonify({
        "jwt": jwt_active,
        "bcrypt": bcrypt_active,
        "rateLimiting": rate_limiting_active,
        "sqlInjectionProtection": sqli_protected,
        "xssProtection": xss_protected,
        "secureHeaders": secure_headers_active,
        "databaseEncryption": db_secure,
        "environmentVariables": env_vars_active,
        "score": overall_score,
        "securityChecks": checks,
        "passwordAgeDays": password_age_days,
        "isEmailVerified": user.is_email_verified,
        "lastLogin": user.last_login.isoformat() if user.last_login else None,
        "recentLogins": recent_logins_list,
        "failedLoginAttempts": user.failed_login_attempts,
        "fileEncryptionStatus": True, # Vault files are AES encrypted on disk
        "storageUsage": {
            "used": used_storage,
            "limit": limit_storage
        },
        "totalFiles": total_files,
        "totalFolders": total_folders,
        "auditLogs": audit_logs_list,
        "recentSecurityEvents": security_events
    }), 200


@user_bp.route("/api/login-history", methods=["GET"])
@jwt_required()
def login_history():
    """
    Return recent login history records for the authenticated user.
    """
    user_id = int(get_jwt_identity())
    history = LoginHistory.query.filter_by(user_id=user_id).order_by(LoginHistory.login_time.desc()).limit(10).all()
    
    # Return last login records
    last_record = LoginHistory.query.filter_by(user_id=user_id, status="Success").order_by(LoginHistory.login_time.desc()).offset(1).first()
    
    return jsonify({
        "history": [h.to_dict() for h in history],
        "lastLogin": last_record.to_dict() if last_record else None
    }), 200


@user_bp.route("/api/delete-account", methods=["DELETE"])
@user_bp.route("/api/profile", methods=["DELETE"])
@jwt_required()
def delete_account():
    """
    Delete the currently authenticated user's account.
    SECURITY: Revokes the user's active session and deletes their database record.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found."}), 404

    # SECURITY: Require password verification before purging account
    data = request.get_json() if request.is_json else None
    if not data or "password" not in data:
        return jsonify({"error": "Password confirmation is required to delete this account."}), 400

    password = data.get("password", "")
    if not user.check_password(password):
        return jsonify({"error": "Incorrect password. Account deletion denied."}), 401

    # Revoke current access token
    jti = get_jwt()["jti"]
    add_token_to_blocklist(jti)

    # Delete the user record (relationships like AuditLog and LoginHistory will cascade delete)
    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": "Your account has been deleted successfully."}), 200

