"""
=============================================================================
Security Utilities
=============================================================================
SECURITY FEATURES:
  - Input Sanitization: Bleach library prevents Cross-Site Scripting (XSS)
  - Security Headers: Injects headers (CSP, HSTS, XSS Protection, etc.)
                      to secure the browser context.

OWASP PROTECTIONS:
  - Security Misconfiguration: Missing headers can expose users to clickjacking,
    MIME-sniffing, and downgrade attacks.
  - Cross Site Scripting (XSS): Sanitizing inputs removes malicious HTML scripts.
=============================================================================
"""

import bleach
from flask import Flask, Response


def sanitize_string(input_str: str) -> str:
    """
    Sanitize an input string to prevent XSS attacks.
    Removes HTML tags and attributes.
    OWASP: Cross Site Scripting (XSS) prevention.
    """
    if not input_str:
        return ""
    # Strip all HTML tags completely to prevent any script execution
    return bleach.clean(input_str, tags=[], attributes={}, strip=True).strip()


def configure_security_headers(app: Flask) -> None:
    """
    Register a hook to apply security headers to every response.
    OWASP: Security Misconfiguration prevention.
    """

    @app.after_request
    def add_security_headers(response: Response) -> Response:
        # 1. Content Security Policy (CSP)
        # Limits where the browser can load scripts, styles, and other resources
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data:; "
            "connect-src 'self';"
        )

        # 2. Prevent clickjacking attacks (X-Frame-Options)
        # Denies the site from being framed inside another website
        response.headers["X-Frame-Options"] = "DENY"

        # 3. Disable MIME-type sniffing (X-Content-Type-Options)
        # Forces browser to adhere to the MIME type declared by the server
        response.headers["X-Content-Type-Options"] = "nosniff"

        # 4. HTTP Strict Transport Security (HSTS)
        # Enforces SSL connections (only valid on HTTPS, set max-age to 1 year)
        # We include subdomains and preload request
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

        # 5. X-XSS-Protection
        # Re-enables the legacy browser filter to block identified XSS
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # 6. Referrer Policy
        # Limits the referrer header info sent when navigating to external sites
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 7. Permissions Policy
        # Disables unused browser API features (camera, microphone, geolocation)
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        )

        return response


def parse_user_agent(ua_string: str) -> dict:
    """
    Parse a User-Agent string to extract browser, operating system, and device type.
    """
    if not ua_string:
        return {"browser": "Unknown", "operating_system": "Unknown", "device": "Desktop"}

    ua_lower = ua_string.lower()

    # Device
    if "mobi" in ua_lower or "iphone" in ua_lower:
        device = "Mobile"
    elif "ipad" in ua_lower or "tablet" in ua_lower:
        device = "Tablet"
    else:
        device = "Desktop"

    # OS
    if "windows" in ua_lower:
        os_name = "Windows"
    elif "macintosh" in ua_lower or "mac os x" in ua_lower:
        os_name = "macOS"
    elif "iphone" in ua_lower or "ipad" in ua_lower:
        os_name = "iOS"
    elif "android" in ua_lower:
        os_name = "Android"
    elif "linux" in ua_lower:
        os_name = "Linux"
    else:
        os_name = "Unknown"

    # Browser
    if "edg" in ua_lower:
        browser = "Edge"
    elif "opr" in ua_lower or "opera" in ua_lower:
        browser = "Opera"
    elif "chrome" in ua_lower:
        browser = "Chrome"
    elif "firefox" in ua_lower:
        browser = "Firefox"
    elif "safari" in ua_lower:
        browser = "Safari"
    else:
        browser = "Unknown"

    return {
        "browser": browser,
        "operating_system": os_name,
        "device": device
    }

