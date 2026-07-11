"""Auth utilities: password hashing, JWT tokens, current user dependency."""
import os
import time
import uuid
import bcrypt
import jwt
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request

JWT_ALGORITHM = "HS256"
ACCESS_TTL_MIN = 15
REFRESH_TTL_DAYS = 7


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _new_jti() -> str:
    return uuid.uuid4().hex


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "jti": _new_jti(),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MIN),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "jti": _new_jti(),
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response, access_token: str, refresh_token: str):
    response.set_cookie(
        key="access_token", value=access_token, httponly=True,
        secure=True, samesite="none", max_age=ACCESS_TTL_MIN * 60, path="/",
    )
    response.set_cookie(
        key="refresh_token", value=refresh_token, httponly=True,
        secure=True, samesite="none", max_age=REFRESH_TTL_DAYS * 86400, path="/",
    )


def clear_auth_cookies(response):
    # Deleting must match the attributes used when setting the cookie so browsers
    # (and strict middleware) will accept the delete for samesite=none cross-site.
    for name in ("access_token", "refresh_token"):
        response.set_cookie(
            key=name, value="", httponly=True,
            secure=True, samesite="none", max_age=0, expires=0, path="/",
        )


async def blocklist_jti(db, jti: str, exp_epoch: int):
    """Add a token id to the blocklist. TTL index removes it after natural expiry."""
    await db.token_blocklist.update_one(
        {"jti": jti},
        {"$set": {"jti": jti, "expires_at": datetime.fromtimestamp(exp_epoch, tz=timezone.utc)}},
        upsert=True,
    )


async def is_jti_blocklisted(db, jti: str) -> bool:
    if not jti:
        return False
    return (await db.token_blocklist.find_one({"jti": jti})) is not None


async def get_current_user(request: Request, db) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        if await is_jti_blocklisted(db, payload.get("jti", "")):
            raise HTTPException(status_code=401, detail="Session revoked")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        user["_jti"] = payload.get("jti")
        user["_exp"] = int(payload.get("exp", 0))
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# --- Brute force protection ---
# Use email-only as identifier (IP is unreliable behind proxies/ingress).
LOCKOUT_MAX_ATTEMPTS = 5
LOCKOUT_WINDOW_SEC = 900  # 15 min


async def check_lockout(db, identifier: str):
    doc = await db.login_attempts.find_one({"identifier": identifier})
    if not doc:
        return
    if doc.get("count", 0) >= LOCKOUT_MAX_ATTEMPTS:
        locked_until = doc.get("locked_until", 0)
        if locked_until > time.time():
            remaining = int(locked_until - time.time())
            raise HTTPException(status_code=429, detail=f"Too many attempts. Try again in {remaining}s.")


async def record_failure(db, identifier: str):
    doc = await db.login_attempts.find_one({"identifier": identifier})
    count = (doc.get("count", 0) if doc else 0) + 1
    locked_until = time.time() + LOCKOUT_WINDOW_SEC if count >= LOCKOUT_MAX_ATTEMPTS else 0
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {"$set": {"count": count, "locked_until": locked_until}},
        upsert=True,
    )


async def clear_failures(db, identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})
