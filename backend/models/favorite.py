"""
=============================================================================
Favorite Model
=============================================================================
SECURITY: Maps user favorites list under exact owner scope.
=============================================================================
"""

from datetime import datetime, timezone
from extensions import db


class Favorite(db.Model):
    """Favorite association model for tracking user favorite files."""

    __tablename__ = "favorites"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    file_id = db.Column(db.Integer, db.ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = db.relationship("User", backref=db.backref("favorites_relation", lazy="dynamic"))
    file = db.relationship("FileModel", backref=db.backref("favorited_by", cascade="all, delete-orphan", lazy="dynamic"))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "file_id": self.file_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self) -> str:
        return f"<Favorite User {self.user_id} File {self.file_id}>"
