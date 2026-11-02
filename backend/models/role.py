"""
=============================================================================
Role Model
=============================================================================
SECURITY: Enforces Role-Based Access Control (RBAC).
OWASP: Broken Access Control protection.
=============================================================================
"""

from extensions import db


class Role(db.Model):
    """Role model for RBAC access levels."""

    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(250), nullable=True)

    # Relationships
    users = db.relationship("User", back_populates="role_relation")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
        }

    def __repr__(self) -> str:
        return f"<Role {self.name}>"
