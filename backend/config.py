"""
=============================================================================
Configuration Module
=============================================================================
SECURITY: All sensitive values are loaded from environment variables.
OWASP: Sensitive Data Exposure — secrets never hardcoded in source code.
OWASP: Security Misconfiguration — centralized, auditable configuration.
=============================================================================
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Base configuration class."""

    # ---------------------------------------------------------------------------
    # SECURITY: Secret keys loaded from environment variables
    # If not set, a fallback is used ONLY for development — production MUST set these
    # ---------------------------------------------------------------------------
    SECRET_KEY = os.environ.get("SECRET_KEY", "fallback-dev-only-key")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "fallback-jwt-dev-only-key")

    # ---------------------------------------------------------------------------
    # Database — SQLite for demo; use PostgreSQL in production
    # SECURITY: SQLAlchemy ORM prevents SQL injection via parameterized queries
    # ---------------------------------------------------------------------------
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///users.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ---------------------------------------------------------------------------
    # JWT Configuration
    # SECURITY: Short-lived access tokens limit damage from token theft
    # Refresh tokens allow re-authentication without re-entering credentials
    # ---------------------------------------------------------------------------
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # Enable token blocklist for logout / revocation
    JWT_BLACKLIST_ENABLED = True
    JWT_BLACKLIST_TOKEN_CHECKS = ["access", "refresh"]

    # ---------------------------------------------------------------------------
    # Bcrypt — cost factor for password hashing
    # SECURITY: Higher rounds = slower hashing = more resistant to brute force
    # 12 rounds is a good balance between security and performance
    # ---------------------------------------------------------------------------
    BCRYPT_LOG_ROUNDS = 12

    # ---------------------------------------------------------------------------
    # CORS — Cross-Origin Resource Sharing
    # SECURITY: Restricts which origins can communicate with the API
    # ---------------------------------------------------------------------------
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

    # ---------------------------------------------------------------------------
    # Rate Limiting
    # SECURITY: Prevents brute-force attacks and abuse
    # OWASP: Broken Authentication — rate limiting mitigates credential stuffing
    # ---------------------------------------------------------------------------
    RATELIMIT_DEFAULT = "200 per hour"
    RATELIMIT_STORAGE_URI = "memory://"

    # ---------------------------------------------------------------------------
    # Account Lockout
    # SECURITY: Locks account after repeated failed login attempts
    # ---------------------------------------------------------------------------
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION = timedelta(minutes=15)


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    # In production, enforce stricter settings
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    BCRYPT_LOG_ROUNDS = 14


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    BCRYPT_LOG_ROUNDS = 4  # Faster hashing for tests


# Configuration map
config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def get_config():
    """Return the configuration class based on FLASK_ENV."""
    env = os.environ.get("FLASK_ENV", "development")
    return config_map.get(env, DevelopmentConfig)
