"""
=============================================================================
Folder Model
=============================================================================
SECURITY: Enforces logical folder separation per user owner context.
=============================================================================
"""

from datetime import datetime, timezone
from extensions import db


class Folder(db.Model):
    """Folder model for grouping files inside the Secure File Vault."""

    __tablename__ = "folders"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # SECURITY: Owner reference to guarantee ownership validation (no access to others)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Hierarchical tree support (self-referential FK)
    parent_id = db.Column(db.Integer, db.ForeignKey("folders.id", ondelete="CASCADE"), nullable=True, index=True)

    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    owner = db.relationship("User", backref=db.backref("folders_relation", lazy="dynamic"))
    
    # Self-referential relationships for subfolders
    subfolders = db.relationship("Folder", cascade="all, delete-orphan", backref=db.backref("parent", remote_side=[id]))
    
    # Files inside this folder (FileModel relationship will populates folder)
    files = db.relationship("FileModel", back_populates="folder", cascade="all, delete-orphan", lazy="dynamic")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "parent_id": self.parent_id,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self) -> str:
        return f"<Folder '{self.name}' Owner {self.owner_id}>"
