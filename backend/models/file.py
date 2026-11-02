"""
=============================================================================
File Model
=============================================================================
SECURITY: Encrypted file descriptors with ownership credentials mapping.
=============================================================================
"""

from datetime import datetime, timezone
from extensions import db


class FileModel(db.Model):
    """File metadata model for files uploaded into the Secure File Vault."""

    __tablename__ = "files"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # SECURITY: Owner reference to guarantee ownership validation (no access to others)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Associated folder (null means root directory)
    folder_id = db.Column(db.Integer, db.ForeignKey("folders.id", ondelete="CASCADE"), nullable=True, index=True)

    # Secure random unique name on disk (e.g. UUID) to prevent direct filename access or traversal
    filename = db.Column(db.String(256), nullable=False, unique=True)
    
    # Sanitized original name for display/restoration
    original_name = db.Column(db.String(256), nullable=False)
    
    # Storage details
    size = db.Column(db.Integer, nullable=False)  # Size in bytes
    file_type = db.Column(db.String(100), nullable=False)  # Extension or mime type

    # Timestamps
    upload_time = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    last_modified = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Features
    favorite = db.Column(db.Boolean, nullable=False, default=False)
    
    # SECURITY: Cryptographic metadata for AES-256-GCM file contents encryption
    encryption_key_salt = db.Column(db.String(64), nullable=True)  # Salt used to derive the file encryption key
    encryption_iv = db.Column(db.String(64), nullable=True)  # IV used during AES encryption

    # Relationships
    owner = db.relationship("User", backref=db.backref("files_relation", lazy="dynamic"))
    folder = db.relationship("Folder", back_populates="files")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "folder_id": self.folder_id,
            "filename": self.filename,
            "original_name": self.original_name,
            "size": self.size,
            "file_type": self.file_type,
            "upload_time": self.upload_time.isoformat() if self.upload_time else None,
            "last_modified": self.last_modified.isoformat() if self.last_modified else None,
            "favorite": self.favorite
        }

    def __repr__(self) -> str:
        return f"<File ID {self.id} '{self.original_name}' Owner {self.owner_id}>"
