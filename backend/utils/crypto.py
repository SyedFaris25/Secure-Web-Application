"""
=============================================================================
File Encryption Utilities
=============================================================================
SECURITY: Encrypts and decrypts files using AES-256-GCM.
          Keys are derived using PBKDF2 from the server's JWT_SECRET_KEY and 
          a file-specific salt, protecting against forensic recovery.
=============================================================================
"""

import os
from flask import current_app
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

def _derive_key(salt: bytes) -> bytes:
    """
    Derive a 256-bit AES key from the application's JWT_SECRET_KEY and a unique file salt.
    OWASP: Cryptographic Failures prevention.
    """
    secret = current_app.config.get("JWT_SECRET_KEY", "default-vault-development-key-12345")
    # Convert secret to bytes
    secret_bytes = secret.encode("utf-8")
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    return kdf.derive(secret_bytes)

def encrypt_file_data(data: bytes) -> tuple[bytes, bytes, bytes]:
    """
    Encrypt file data using AES-256-GCM.
    Returns: (salt, iv/nonce, ciphertext)
    """
    salt = os.urandom(16)
    key = _derive_key(salt)
    
    aesgcm = AESGCM(key)
    iv = os.urandom(12)  # GCM standard IV size is 12 bytes
    
    ciphertext = aesgcm.encrypt(iv, data, None)
    return salt, iv, ciphertext

def decrypt_file_data(ciphertext: bytes, salt: bytes, iv: bytes) -> bytes:
    """
    Decrypt AES-256-GCM encrypted file data.
    """
    key = _derive_key(salt)
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(iv, ciphertext, None)
