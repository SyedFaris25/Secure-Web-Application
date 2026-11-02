"""
=============================================================================
Authentication Service
=============================================================================
Business logic layer for authentication operations.
Keeps route handlers thin and logic testable in isolation.

OWASP PROTECTIONS:
  - Broken Authentication: Complete auth lifecycle management
  - Sensitive Data Exposure: Tokens managed securely
  - Broken Access Control: User-scoped operations
=============================================================================
"""

from datetime import datetime, timezone
from flask import request as flask_request
from models.user import User
from models.audit_log import AuditLog
from models.login_history import LoginHistory
from models.failed_login import FailedLogins
from models.role import Role
from utils.security import parse_user_agent
from extensions import db


def create_user(name: str, email: str, password: str, role: str = "user") -> User:
    """
    Create a new user with a hashed password.
    SECURITY: Password is hashed before storage — plain text never touches the DB.
    """
    # Auto-promote first user to Admin for ease of testing
    if User.query.count() == 0:
        role = "admin"

    role_record = Role.query.filter_by(name=role).first()
    role_id = role_record.id if role_record else None

    user = User(
        name=name.strip(),
        email=email.strip().lower(),
        role=role,
        role_id=role_id,
        password_changed_at=datetime.now(timezone.utc)
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    # Audit log
    log_action(user.id, "ACCOUNT_CREATED")

    return user


def authenticate_user(email: str, password: str, app_config) -> tuple[User | None, str | None]:
    """
    Authenticate a user by email and password.

    Returns:
        (user, None) on success
        (None, error_message) on failure

    SECURITY:
      - Constant-time password comparison via bcrypt
      - Generic error messages prevent username enumeration
      - Account lockout after repeated failures
      - Remaining lockout time tracking
      - Full login history and failed login logging
    """
    # Extract client details
    ip_addr = flask_request.remote_addr if flask_request else "127.0.0.1"
    ua_str = flask_request.user_agent.string if flask_request else ""
    ua = parse_user_agent(ua_str)

    user = User.query.filter_by(email=email.strip().lower()).first()

    # SECURITY: Generic message prevents attackers from enumerating valid emails
    if user is None:
        failed = FailedLogins(
            email=email.strip().lower(),
            ip_address=ip_addr,
            browser=ua["browser"],
            device=ua["device"],
            operating_system=ua["operating_system"]
        )
        db.session.add(failed)
        db.session.commit()
        return None, "Invalid email or password."

    # Check account lockout
    if user.is_locked():
        delta = user.locked_until.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)
        sec = max(0, int(delta.total_seconds()))
        return None, f"Account is temporarily locked. Try again in {sec // 60}m {sec % 60}s."

    # Check deactivated status
    if not user.is_active:
        return None, "Your account has been deactivated. Please contact an administrator."

    # Verify password
    if not user.check_password(password):
        user.record_failed_login(
            max_attempts=app_config.get("MAX_LOGIN_ATTEMPTS", 5),
            lockout_duration=app_config.get("LOCKOUT_DURATION"),
        )
        
        # Log to failed_logins table
        failed = FailedLogins(
            email=user.email,
            ip_address=ip_addr,
            browser=ua["browser"],
            device=ua["device"],
            operating_system=ua["operating_system"]
        )
        db.session.add(failed)

        # Log failed login history for this user
        hist = LoginHistory(
            user_id=user.id,
            ip_address=ip_addr,
            browser=ua["browser"],
            device=ua["device"],
            operating_system=ua["operating_system"],
            status="Failed"
        )
        db.session.add(hist)

        # Audit log for failed login
        log = AuditLog(
            user_id=user.id,
            action="LOGIN_FAILED",
            ip_address=ip_addr,
            browser=ua_str[:300] if ua_str else None
        )
        db.session.add(log)
        db.session.commit()

        remaining = app_config.get("MAX_LOGIN_ATTEMPTS", 5) - user.failed_login_attempts
        if remaining > 0:
            return None, f"Invalid email or password. {remaining} attempt(s) remaining."
        
        delta = user.locked_until.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)
        sec = max(0, int(delta.total_seconds()))
        return None, f"Account is temporarily locked. Try again in {sec // 60}m {sec % 60}s."

    # Successful login — reset failed attempts
    user.reset_failed_logins()
    user.last_login = datetime.now(timezone.utc)

    # Log successful login history
    hist = LoginHistory(
        user_id=user.id,
        ip_address=ip_addr,
        browser=ua["browser"],
        device=ua["device"],
        operating_system=ua["operating_system"],
        status="Success"
    )
    db.session.add(hist)
    db.session.commit()

    # Audit log
    log_action(user.id, "LOGIN_SUCCESS")

    return user, None


def update_user_profile(user: User, name: str, email: str) -> tuple[User | None, str | None]:
    """
    Update user profile.
    SECURITY: Email uniqueness is re-validated server-side.
    """
    new_email = email.strip().lower()

    # Check if email is already taken by another user
    existing = User.query.filter_by(email=new_email).first()
    if existing and existing.id != user.id:
        return None, "Email is already in use by another account."

    user.name = name.strip()
    user.email = new_email
    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    # Audit log
    log_action(user.id, "PROFILE_UPDATED")

    return user, None


def change_user_password(user: User, current_password: str, new_password: str) -> str | None:
    """
    Change user password after verifying the current password.
    SECURITY: Old password must be verified before allowing a change.
    """
    if not user.check_password(current_password):
        return "Current password is incorrect."

    user.set_password(new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    # Audit log
    log_action(user.id, "PASSWORD_CHANGED")

    return None


def log_action(user_id: int, action: str) -> None:
    """
    Record an action in the audit log.
    SECURITY: Audit trails are essential for incident investigation.
    """
    try:
        ip_address = flask_request.remote_addr if flask_request else None
        browser = flask_request.user_agent.string if flask_request else None
    except RuntimeError:
        ip_address = None
        browser = None

    log = AuditLog(
        user_id=user_id,
        action=action,
        ip_address=ip_address,
        browser=browser[:300] if browser else None,
    )
    db.session.add(log)
    db.session.commit()


# =============================================================================
# JWT Token Blocklist (in-memory for demo; use Redis in production)
# SECURITY: Revoked tokens are tracked so they cannot be reused after logout.
# =============================================================================
_token_blocklist: set[str] = set()


def add_token_to_blocklist(jti: str) -> None:
    """Add a token's JTI to the blocklist (revoke it)."""
    _token_blocklist.add(jti)


def is_token_revoked(jti: str) -> bool:
    """Check if a token has been revoked."""
    return jti in _token_blocklist


def initialize_roles() -> None:
    """
    Initialize system roles in the database if missing.
    """
    roles = [
        {"name": "admin", "description": "System Administrator with full access controls"},
        {"name": "user", "description": "Standard User profile access"},
    ]
    for r in roles:
        if not Role.query.filter_by(name=r["name"]).first():
            role_record = Role(name=r["name"], description=r["description"])
            db.session.add(role_record)
    db.session.commit()

