import os

from cryptography.fernet import Fernet
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


_FERNET_INSTANCE = None


def _get_fernet() -> Fernet:
    """
    Build a cached Fernet instance.

    The secret must be a base64-url-safe 32-byte key.
    """
    global _FERNET_INSTANCE
    if _FERNET_INSTANCE is not None:
        return _FERNET_INSTANCE

    key = getattr(settings, 'FERNET_SECRET_KEY', None) or os.getenv('FERNET_SECRET_KEY')
    if not key:
        raise ImproperlyConfigured(
            'FERNET_SECRET_KEY is required (set via environment variable or Django settings).'
        )

    # Fernet constructor validates key shape.
    _FERNET_INSTANCE = Fernet(key)
    return _FERNET_INSTANCE


def encrypt_value(plaintext: str) -> str:
    """
    Encrypt a UTF-8 string using Fernet.

    Empty-string inputs are returned as-is.
    """
    if plaintext is None or plaintext == '':
        return ''

    fernet = _get_fernet()
    ciphertext = fernet.encrypt(plaintext.encode('utf-8'))
    return ciphertext.decode('utf-8')


def decrypt_value(ciphertext: str) -> str:
    """
    Decrypt a Fernet-encrypted string.

    Empty-string inputs are returned as-is.
    """
    if ciphertext is None or ciphertext == '':
        return ''

    fernet = _get_fernet()
    plaintext = fernet.decrypt(ciphertext.encode('utf-8'))
    return plaintext.decode('utf-8')

