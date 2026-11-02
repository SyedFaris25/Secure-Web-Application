"""
=============================================================================
Application Factory / Entry Point
=============================================================================
Initializes extensions, configurations, middleware, routes, and security filters.

OWASP PROTECTIONS:
  - Security Misconfiguration: Centralized setup, headers, environment variables
  - Broken Authentication: JWT revocation callbacks connected
  - Identification and Authentication Failures: Rate limiter init
=============================================================================
"""

import os
from flask import Flask, jsonify
from config import get_config
from extensions import db, bcrypt, jwt, cors, limiter
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.admin_routes import admin_bp
from routes.file_routes import file_bp
from middleware.error_handlers import register_error_handlers
from utils.security import configure_security_headers
from services.auth_service import is_token_revoked


def create_app(config_class=None):
    """Factory to create and configure the Flask application."""
    app = Flask(__name__)

    # Load configuration
    if config_class is None:
        config_class = get_config()
    app.config.from_object(config_class)

    # ---------------------------------------------------------------------------
    # Initialise Extensions
    # ---------------------------------------------------------------------------
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    # Configure CORS origins to support localhost, explicit Vercel URL, and wildcards
    origins_list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://secure-web-application-flame.vercel.app"
    ]
    # Dynamically read and append configured origins from environment Config
    config_origins = app.config.get("CORS_ORIGINS", [])
    if isinstance(config_origins, str):
        config_origins = config_origins.split(",")
    elif isinstance(config_origins, (list, tuple)):
        config_origins = list(config_origins)
    else:
        config_origins = [config_origins] if config_origins else []
        
    for origin in config_origins:
        o_clean = str(origin).strip()
        if o_clean and o_clean not in origins_list:
            origins_list.append(o_clean)
            
    # Include regex pattern for Vercel wildcards
    origins_list.append(r"https://.*\.vercel\.app")
    
    cors.init_app(app, resources={r"/*": {
        "origins": origins_list,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": ["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
        "expose_headers": ["Authorization", "Content-Type"],
        "supports_credentials": False
    }})
    limiter.init_app(app)

    # ---------------------------------------------------------------------------
    # JWT Callbacks (Revocation & Claims)
    # SECURITY: Tokens are checked against the blocklist for logout status
    # ---------------------------------------------------------------------------
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked_callback(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        return is_token_revoked(jti)

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "error": "The token has been revoked.",
            "status": 401
        }), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "error": "The token has expired.",
            "status": 401
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            "error": "Signature verification failed.",
            "status": 401
        }), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            "error": "Request does not contain an access token.",
            "status": 401
        }), 401

    # ---------------------------------------------------------------------------
    # Register Blueprints / Routes
    # ---------------------------------------------------------------------------
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(file_bp)

    # ---------------------------------------------------------------------------
    # Root & Health Check Routes (JSON Responses Only)
    # ---------------------------------------------------------------------------
    @app.route("/", methods=["GET"])
    def root_route():
        """Root endpoint returning basic server info."""
        return jsonify({
            "status": "running",
            "message": "Secure Web Application Backend"
        }), 200

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint checking API and DB status."""
        db_connected = "connected"
        try:
            db.session.execute(db.text("SELECT 1"))
        except Exception:
            db_connected = "disconnected"
            
        return jsonify({
            "status": "online",
            "server": "running",
            "database": db_connected,
            "version": "1.0"
        }), 200


    # ---------------------------------------------------------------------------
    # Register Middleware & Security Filters
    # ---------------------------------------------------------------------------
    register_error_handlers(app)
    configure_security_headers(app)

    # Make sure uploads directory exists
    upload_dir = os.path.join(os.path.abspath(os.path.dirname(__file__)), "uploads")
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir, exist_ok=True)
    app.config["UPLOAD_FOLDER"] = upload_dir

    # Create tables inside the application context (SQLite database setup)
    with app.app_context():
        # Imports needed inside app context to register models with SQLAlchemy
        import models.user
        import models.audit_log
        import models.role
        import models.login_history
        import models.failed_login
        import models.folder
        import models.file
        import models.favorite
        db.create_all()

        # Dynamic Schema Alterations for SQLite
        try:
            with db.engine.connect() as conn:
                try:
                    conn.execute(db.text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                    conn.commit()
                except Exception:
                    pass
                try:
                    conn.execute(db.text("ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT 1"))
                    conn.commit()
                except Exception:
                    pass
                try:
                    conn.execute(db.text("ALTER TABLE users ADD COLUMN password_changed_at DATETIME"))
                    conn.commit()
                except Exception:
                    pass
                try:
                    conn.execute(db.text("ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id)"))
                    conn.commit()
                except Exception:
                    pass
        except Exception as e:
            app.logger.warning(f"Database migration helper skipped or failed: {e}")

        # Seed roles
        from services.auth_service import initialize_roles
        initialize_roles()

    return app


app = create_app()


if __name__ == "__main__":
    # Run the application (Local Dev Server)
    # SECURITY: Debug should be False in production (configured via FLASK_ENV)
    app.run(host="0.0.0.0", port=5000)
