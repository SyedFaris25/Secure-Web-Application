"""
=============================================================================
Flask Extensions
=============================================================================
Centralised extension instances to avoid circular imports.
Each extension is initialised with the app in the application factory (app.py).
=============================================================================
"""

from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()
cors = CORS()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per hour"],
    storage_uri="memory://",
)
