import hashlib
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional, Any, Union
from jose import jwt, JWTError
import bcrypt
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type("About", (), {"__version__": bcrypt.__version__})

from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")



def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def generate_secure_qr_token() -> str:
    """Generates a cryptographically random 32-byte URL-safe token."""
    return secrets.token_urlsafe(32)


def hash_qr_token(token: str) -> str:
    """Computes SHA-256 hex digest of the raw token for secure database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_lookup_code() -> str:
    """Generates an 8-character human-friendly booking lookup code (e.g., SS-4X8K9M)."""
    alphabet = string.ascii_uppercase + string.digits
    # Avoid easily confused chars
    safe_chars = [c for c in alphabet if c not in "0O1I"]
    random_str = "".join(secrets.choice(safe_chars) for _ in range(6))
    return f"SS-{random_str}"
