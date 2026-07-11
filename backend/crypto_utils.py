"""Field-level encryption for sensitive skin profile data."""
import os
import base64
from cryptography.fernet import Fernet


def _get_key() -> bytes:
    raw = os.environ["DATA_ENCRYPTION_KEY"]
    # Accept either a fernet key (44 chars b64) or a 32-byte b64 seed.
    try:
        key_bytes = base64.urlsafe_b64decode(raw)
        if len(key_bytes) == 32:
            return base64.urlsafe_b64encode(key_bytes)
    except Exception:
        pass
    return raw.encode()


_fernet = None


def _fernet_instance() -> Fernet:
    global _fernet
    if _fernet is None:
        _fernet = Fernet(_get_key())
    return _fernet


def encrypt_str(plain: str) -> str:
    if plain is None:
        return None
    return _fernet_instance().encrypt(plain.encode()).decode()


def decrypt_str(token: str) -> str:
    if token is None:
        return None
    try:
        return _fernet_instance().decrypt(token.encode()).decode()
    except Exception:
        return ""
