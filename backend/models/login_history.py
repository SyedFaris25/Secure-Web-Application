"""
=============================================================================
Login History Model
=============================================================================
SECURITY: Logs all active session entries and devices for auditing.
OWASP: Identification and Authentication Failures tracking.
=============================================================================
"""

from datetime import datetime, timezone
from extensions import db


class LoginHistory(db.Model):
    """Logs history of every login action on the system."""

    __tablename__ = "login_history"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    ip_address = db.Column(db.String(45), nullable=True)
    browser = db.Column(db.String(150), nullable=True)
    device = db.Column(db.String(50), nullable=True)  # Desktop, Mobile, Tablet
    operating_system = db.Column(db.String(50), nullable=True)

    login_time = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    logout_time = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="Success")  # Success, Failed

    # Relationships
    user = db.relationship("User", back_populates="login_histories")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "ip_address": self.ip_address,
            "browser": self.browser,
            "device": self.device,
            "operating_system": self.operating_system,
            "login_time": self.login_time.isoformat() if self.login_time else None,
            "logout_time": self.logout_time.isoformat() if self.logout_time else None,
            "status": self.status,
        }

    def __repr__(self) -> str:
        return f"<LoginHistory ID {self.id} for User {self.user_id}>"
