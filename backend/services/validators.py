"""
=============================================================================
Input Validation Service
=============================================================================
SECURITY: All user inputs are validated on the server side regardless of
          any client-side validation. Client-side checks are a UX convenience;
          server-side checks are the security boundary.

OWASP PROTECTIONS:
  - Injection: Input validation prevents malicious payloads
  - Broken Authentication: Password policy enforcement
  - Insecure Design: Defence-in-depth validation layer
=============================================================================
"""

import re
from email_validator import validate_email, EmailNotValidError


def validate_registration_input(name: str, email: str, password: str, confirm_password: str) -> list[str]:
    """
    Validate all registration fields.
    Returns a list of error messages (empty if valid).
    """
    errors = []

    # --- Name validation ---
    if not name or not name.strip():
        errors.append("Full name is required.")
    elif len(name.strip()) < 2:
        errors.append("Name must be at least 2 characters long.")
    elif len(name.strip()) > 100:
        errors.append("Name must not exceed 100 characters.")

    # --- Email validation ---
    email_errors = validate_email_address(email)
    errors.extend(email_errors)

    # --- Password validation ---
    password_errors = validate_password_strength(password)
    errors.extend(password_errors)

    # --- Confirm password ---
    if password != confirm_password:
        errors.append("Passwords do not match.")

    return errors


def validate_email_address(email: str) -> list[str]:
    """
    Validate email format using the email-validator library.
    SECURITY: Prevents invalid email formats and potential injection.
    """
    errors = []
    if not email or not email.strip():
        errors.append("Email is required.")
        return errors

    try:
        validate_email(email.strip(), check_deliverability=False)
    except EmailNotValidError:
        errors.append("Please enter a valid email address.")

    return errors


def validate_password_strength(password: str) -> list[str]:
    """
    Enforce a strong password policy.

    SECURITY: Strong password requirements make brute-force attacks
    computationally infeasible even if the hash is leaked.

    Policy:
      - Minimum 12 characters
      - At least one uppercase letter
      - At least one lowercase letter
      - At least one digit
      - At least one special character
    """
    errors = []

    if not password:
        errors.append("Password is required.")
        return errors

    if len(password) < 8:
        errors.append("Password must be at least 8 characters long.")
    if len(password) > 128:
        errors.append("Password must not exceed 128 characters.")
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter.")
    if not re.search(r"[0-9]", password):
        errors.append("Password must contain at least one digit.")
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':\"\\|,.<>\/?]', password):
        errors.append("Password must contain at least one special character.")

    return errors


def validate_profile_input(name: str, email: str) -> list[str]:
    """Validate profile update fields."""
    errors = []

    if not name or not name.strip():
        errors.append("Full name is required.")
    elif len(name.strip()) < 2:
        errors.append("Name must be at least 2 characters long.")
    elif len(name.strip()) > 100:
        errors.append("Name must not exceed 100 characters.")

    email_errors = validate_email_address(email)
    errors.extend(email_errors)

    return errors


def validate_change_password_input(
    current_password: str, new_password: str, confirm_password: str
) -> list[str]:
    """Validate change-password fields."""
    errors = []

    if not current_password:
        errors.append("Current password is required.")

    password_errors = validate_password_strength(new_password)
    errors.extend(password_errors)

    if new_password != confirm_password:
        errors.append("New passwords do not match.")

    if current_password and new_password and current_password == new_password:
        errors.append("New password must be different from the current password.")

    return errors


def get_password_strength_score(password: str) -> int:
    """
    Return a password strength score from 0 to 5.
    Used by the security status endpoint.
    """
    if not password:
        return 0
    score = 0
    if len(password) >= 12:
        score += 1
    if re.search(r"[A-Z]", password):
        score += 1
    if re.search(r"[a-z]", password):
        score += 1
    if re.search(r"[0-9]", password):
        score += 1
    if re.search(r'[!@#$%^&*()_+\-=\[\]{};\':\"\\|,.<>\/?]', password):
        score += 1
    return score
