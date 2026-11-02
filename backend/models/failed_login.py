"""
=============================================================================
Failed Logins Model
=============================================================================
SECURITY: Logs failed credential entries to track credential stuffing attacks.
OWASP: Identification and Authentication Failures tracking.
=============================================================================
"""

from datetime import datetime, timezone
from extensions import db


class FailedLogins(db.Model):
    """Tracks failed authentication attempts for security locks auditing."""

    __tablename__ = "failed_logins"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(150), nullable=False)
    ip_address = db.Column(db.String(45), nullable=True)
    browser = db.Column(db.String(150), nullable=True)
    device = db.Column(db.String(50), nullable=True)
    operating_system = db.Column(db.String(50), nullable=True)
    attempt_time = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "ip_address": self.ip_address,
            "browser": self.browser,
            "device": self.device,
            "operating_system": self.operating_system,
            "attempt_time": self.attempt_time.isoformat() if self.attempt_time else None,
        }

    def __repr__(self) -> str:
        return f"<FailedLogin attempt for email {self.email} from {self.ip_address}>"
