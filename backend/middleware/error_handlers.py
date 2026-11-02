"""
=============================================================================
Centralized Error Handlers
=============================================================================
SECURITY: Consistent, safe error responses across the entire application.

OWASP PROTECTIONS:
  - Sensitive Data Exposure: Error responses never leak stack traces,
    database details, or internal implementation information.
  - Security Misconfiguration: All errors return proper HTTP status codes
    with a consistent JSON structure.
=============================================================================
"""

from flask import jsonify, request, make_response
from werkzeug.exceptions import HTTPException


def register_error_handlers(app):
    """Register global error handlers on the Flask app."""

    @app.errorhandler(400)
    def bad_request(error):
        """SECURITY: Returns generic message — no internal details leaked."""
        return jsonify({
            "error": "Bad request.",
            "status": 400,
        }), 400

    @app.errorhandler(401)
    def unauthorized(error):
        """SECURITY: Generic unauthorized message — no hint about what failed."""
        return jsonify({
            "error": "Authentication required.",
            "status": 401,
        }), 401

    @app.errorhandler(403)
    def forbidden(error):
        """SECURITY: No details about why access was denied."""
        return jsonify({
            "error": "Access denied.",
            "status": 403,
        }), 403

    @app.errorhandler(404)
    def not_found(error):
        """SECURITY: Does not reveal whether the resource exists or not."""
        if request.method == "OPTIONS":
            return make_response("", 200)
        return jsonify({
            "error": "Resource not found.",
            "status": 404,
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        """SECURITY: Clean JSON for unsupported methods; responds to OPTIONS."""
        if request.method == "OPTIONS":
            return make_response("", 200)
        return jsonify({
            "error": "Method not allowed.",
            "status": 405,
        }), 405

    @app.errorhandler(422)
    def unprocessable_entity(error):
        return jsonify({
            "error": "Validation failed.",
            "status": 422,
        }), 422

    @app.errorhandler(429)
    def too_many_requests(error):
        """SECURITY: Rate limit exceeded — prevents brute-force attacks."""
        return jsonify({
            "error": "Too many requests. Please try again later.",
            "status": 429,
        }), 429

    @app.errorhandler(500)
    def internal_server_error(error):
        """
        SECURITY: NEVER expose stack traces or internal error details
        in production. Log them server-side instead.
        """
        return jsonify({
            "error": "An internal server error occurred.",
            "status": 500,
        }), 500

    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        """Catch-all for any other HTTP exceptions."""
        return jsonify({
            "error": error.description,
            "status": error.code,
        }), error.code

    @app.errorhandler(Exception)
    def handle_generic_exception(error):
        """
        SECURITY: Catch unhandled exceptions so they never leak raw
        tracebacks to the client. Log the real error server-side.
        """
        app.logger.error(f"Unhandled exception: {error}", exc_info=True)
        return jsonify({
            "error": "An unexpected error occurred.",
            "status": 500,
        }), 500
