"""
=============================================================================
User Model
=============================================================================
SECURITY FEATURES:
  - Password is NEVER stored in plain text (bcrypt hash only)
  - SQLAlchemy ORM prevents SQL injection via parameterized queries
  - Email has a unique constraint to prevent duplicate accounts
  - Timestamps track account creation and modifications

OWASP PROTECTIONS:
  - Broken Authentication: bcrypt hashing with configurable cost factor
  - Injection: SQLAlchemy ORM uses parameterized queries internally
  - Sensitive Data Exposure: password_hash column, never raw password
  - Broken Access Control: role field enables RBAC
=============================================================================
"""

from datetime import datetime, timezone
from extensions import db, bcrypt


class User(db.Model):
    """User account model with secure password handling."""

    __tablename__ = "users"

    # -------------------------------------------------------------------------
    # SECURITY: Primary key is auto-incremented integer, not user-controlled
    # -------------------------------------------------------------------------
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # -------------------------------------------------------------------------
    # User profile fields
    # -------------------------------------------------------------------------
    name = db.Column(db.String(100), nullable=False)

    # SECURITY: Unique constraint prevents duplicate email registration
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)

    # -------------------------------------------------------------------------
    # SECURITY: Only the bcrypt hash is stored — NEVER the plain-text password
    # OWASP: Broken Authentication — passwords hashed with bcrypt
    # -------------------------------------------------------------------------
    password_hash = db.Column(db.String(256), nullable=False)

    # -------------------------------------------------------------------------
    # SECURITY: Role-based access control (RBAC)
    # OWASP: Broken Access Control — roles restrict endpoint access
    # -------------------------------------------------------------------------
    role = db.Column(db.String(20), nullable=False, default="user")
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=True)

    # -------------------------------------------------------------------------
    # Account status fields
    # -------------------------------------------------------------------------
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_email_verified = db.Column(db.Boolean, nullable=False, default=True)
    password_changed_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # -------------------------------------------------------------------------
    # Timestamps for auditing
    # -------------------------------------------------------------------------
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    last_login = db.Column(db.DateTime, nullable=True)

    # -------------------------------------------------------------------------
    # Account lockout fields
    # SECURITY: Mitigates brute-force / credential-stuffing attacks
    # OWASP: Broken Authentication — lockout after repeated failures
    # -------------------------------------------------------------------------
    failed_login_attempts = db.Column(db.Integer, nullable=False, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)

    # Relationships
    role_relation = db.relationship("Role", back_populates="users")
    audit_logs = db.relationship("AuditLog", back_populates="user", lazy="dynamic", cascade="all, delete-orphan")
    login_histories = db.relationship("LoginHistory", back_populates="user", cascade="all, delete-orphan", lazy="dynamic")

    # -------------------------------------------------------------------------
    # Password methods
    # -------------------------------------------------------------------------
    def set_password(self, password: str) -> None:
        """
        Hash and store a password using bcrypt.
        SECURITY: bcrypt includes a random salt automatically, preventing
        rainbow-table attacks. The cost factor is set in config.py.
        """
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password: str) -> bool:
        """
        Verify a plain-text password against the stored hash.
        SECURITY: Constant-time comparison prevents timing attacks.
        """
        return bcrypt.check_password_hash(self.password_hash, password)

    def is_locked(self) -> bool:
        """Check if the account is currently locked out."""
        if self.locked_until is None:
            return False
        return datetime.now(timezone.utc) < self.locked_until

    def record_failed_login(self, max_attempts: int, lockout_duration) -> None:
        """
        Increment failed login counter and lock account if threshold exceeded.
        SECURITY: Account lockout mitigates brute-force attacks.
        """
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= max_attempts:
            self.locked_until = datetime.now(timezone.utc) + lockout_duration

    def reset_failed_logins(self) -> None:
        """Reset the failed login counter after a successful login."""
        self.failed_login_attempts = 0
        self.locked_until = None

    def to_dict(self) -> dict:
        """
        Serialize user to dictionary.
        SECURITY: password_hash is NEVER included in the response.
        OWASP: Sensitive Data Exposure — only safe fields are returned.
        """
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "is_email_verified": self.is_email_verified,
            "password_changed_at": self.password_changed_at.isoformat() if self.password_changed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "failed_login_attempts": self.failed_login_attempts,
            "locked_until": self.locked_until.isoformat() if self.locked_until else None,
        }

    def __repr__(self) -> str:
        return f"<User {self.email}>"
