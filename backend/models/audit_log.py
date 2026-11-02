"""
=============================================================================
Audit Log Model
=============================================================================
SECURITY: Records all significant user actions for forensic analysis.
OWASP: Security Misconfiguration / Broken Access Control — audit trails
        help detect and investigate unauthorized access or anomalies.
=============================================================================
"""

from datetime import datetime, timezone
from extensions import db


class AuditLog(db.Model):
    """Immutable audit log entry for tracking user actions."""

    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # Foreign key to users table
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    # Description of the action performed
    action = db.Column(db.String(200), nullable=False)

    # Client metadata for forensic analysis
    ip_address = db.Column(db.String(45), nullable=True)  # IPv6 can be up to 45 chars
    browser = db.Column(db.String(300), nullable=True)

    # Timestamp
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationship back to User (use back_populates to match User model)
    user = db.relationship("User", back_populates="audit_logs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action": self.action,
            "ip_address": self.ip_address,
            "browser": self.browser,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} by user {self.user_id}>"
