"""Le Rituel FastAPI backend — auth, quiz-based recommendation engine, routines."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", override=False)

import os
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from bson import ObjectId
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from starlette.middleware.cors import CORSMiddleware

from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies,
    get_current_user, check_lockout, record_failure, clear_failures,
    get_jwt_secret, blocklist_jti,
)
from crypto_utils import encrypt_str, decrypt_str
from products_seed import seed_products
from recommender import build_routine
from skin_analysis import analyze_skin_photo
from ingredient_checker import check_pair, known_ingredients

import jwt as _jwt

# --- Mongo ---
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Le Rituel API")
api = APIRouter(prefix="/api")

# --- CORS ---
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
allowed = [frontend_url, "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("le-rituel")


# ---------- Pydantic Models ----------
SkinType = Literal["oily", "dry", "combination", "normal", "sensitive"]
Budget = Literal["drugstore", "mid-range", "premium"]
RoutineLevel = Literal["none", "basic", "advanced"]
AgeRange = Literal["under-20", "20-29", "30-39", "40-49", "50-plus"]

ALLOWED_CONCERNS = {"acne", "dark spots", "fine lines", "redness", "dullness", "large pores"}


class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: Optional[str] = Field(default=None, max_length=80)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v):
        return v.strip() if v else v


class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    token: str = Field(min_length=10, max_length=128)
    password: str = Field(min_length=8, max_length=128)


class SkinAnalyzeInput(BaseModel):
    image_base64: str = Field(min_length=32, max_length=8_000_000)
    mime_type: Optional[str] = Field(default="image/jpeg", max_length=32)

    @field_validator("mime_type")
    @classmethod
    def check_mime(cls, v):
        if v is None:
            return "image/jpeg"
        v = v.lower().strip()
        if v not in {"image/jpeg", "image/jpg", "image/png", "image/webp"}:
            raise ValueError("Only JPEG, PNG or WEBP images are supported")
        return v


class UpdateStepInput(BaseModel):
    time_of_day: Literal["am", "pm"]
    step_order: int = Field(ge=1, le=10)
    product_name: str = Field(default="", max_length=120)

    @field_validator("product_name")
    @classmethod
    def clean_name(cls, v):
        cleaned = "".join(ch for ch in (v or "") if ch.isprintable()).strip()
        return cleaned


class IngredientCheckInput(BaseModel):
    ingredient_a: str = Field(min_length=1, max_length=80)
    ingredient_b: str = Field(min_length=1, max_length=80)

    @field_validator("ingredient_a", "ingredient_b")
    @classmethod
    def clean_name(cls, v):
        return "".join(ch for ch in (v or "") if ch.isprintable()).strip()


class ProgressRatings(BaseModel):
    acne: int = Field(ge=1, le=5)
    redness: int = Field(ge=1, le=5)
    oiliness: int = Field(ge=1, le=5)
    hydration: int = Field(ge=1, le=5)


class ProgressEntryInput(BaseModel):
    image_base64: str = Field(min_length=32, max_length=3_500_000)
    mime_type: str = Field(default="image/jpeg", max_length=32)
    ratings: ProgressRatings
    notes: Optional[str] = Field(default=None, max_length=280)

    @field_validator("mime_type")
    @classmethod
    def check_mime(cls, v):
        v = (v or "image/jpeg").lower().strip()
        if v not in {"image/jpeg", "image/jpg", "image/png", "image/webp"}:
            raise ValueError("Only JPEG, PNG or WEBP images are supported")
        return v

    @field_validator("notes")
    @classmethod
    def clean_notes(cls, v):
        if not v:
            return None
        cleaned = "".join(ch for ch in v if ch.isprintable()).strip()
        return cleaned or None


class SkinProfileInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    skin_type: SkinType
    concerns: List[str] = Field(default_factory=list, max_length=3)
    allergies: str = Field(default="", max_length=500)
    age_range: AgeRange
    budget: Budget
    current_routine_level: RoutineLevel
    ai_notes: Optional[str] = Field(default=None, max_length=400)

    @field_validator("concerns")
    @classmethod
    def validate_concerns(cls, v):
        cleaned = [c.strip().lower() for c in v if c and c.strip()]
        for c in cleaned:
            if c not in ALLOWED_CONCERNS:
                raise ValueError(f"invalid concern: {c}")
        if len(cleaned) > 3:
            raise ValueError("max 3 concerns")
        return cleaned

    @field_validator("allergies")
    @classmethod
    def clean_allergies(cls, v):
        # Strip control characters / HTML
        return "".join(ch for ch in (v or "") if ch.isprintable()).strip()

    @field_validator("ai_notes")
    @classmethod
    def clean_ai_notes(cls, v):
        if not v:
            return None
        cleaned = "".join(ch for ch in v if ch.isprintable()).strip()
        return cleaned or None


class PublicUser(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    auth_provider: str = "email"
    created_at: Optional[str] = None


# ---------- Startup ----------
@app.on_event("startup")
async def _startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.skin_profiles.create_index("user_id", unique=True)
    await db.routines.create_index("user_id")
    await db.token_blocklist.create_index("expires_at", expireAfterSeconds=0)
    await db.progress_entries.create_index([("user_id", 1), ("created_at", -1)])
    # Seed
    await seed_products(db)
    await _seed_admin()
    # Test credentials file
    _write_test_credentials()


async def _seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@lerituel.app").lower()
    pw = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "email": email,
            "password_hash": hash_password(pw),
            "name": "Admin",
            "role": "admin",
            "auth_provider": "email",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(pw, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": email}, {"$set": {"password_hash": hash_password(pw)}}
        )


def _write_test_credentials():
    try:
        Path("/app/memory").mkdir(parents=True, exist_ok=True)
        content = f"""# Le Rituel — Test Credentials

## Admin
- Email: {os.environ.get('ADMIN_EMAIL')}
- Password: {os.environ.get('ADMIN_PASSWORD')}
- Role: admin

## Test User (create via /api/auth/register or use seeded)
- Email: test@lerituel.app
- Password: Test1234!

## Auth endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me
- POST /api/auth/refresh

## Core endpoints
- GET/PUT /api/profile
- POST    /api/routine/generate
- GET     /api/routine
- DELETE  /api/account
- GET     /api/account/export
"""
        Path("/app/memory/test_credentials.md").write_text(content)
    except Exception as e:
        logger.warning("failed to write test_credentials: %s", e)


# ---------- Helpers ----------
def _user_public(u: dict) -> dict:
    return {
        "id": u.get("id") or str(u.get("_id")),
        "email": u.get("email"),
        "name": u.get("name"),
        "auth_provider": u.get("auth_provider", "email"),
        "created_at": u.get("created_at"),
    }


async def _current(request: Request):
    return await get_current_user(request, db)


# ---------- Auth Endpoints ----------
@api.post("/auth/register")
async def register(body: RegisterInput, response: Response):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already registered")
    user_doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name or email.split("@")[0],
        "auth_provider": "email",
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(user_doc)
    uid = str(result.inserted_id)
    at = create_access_token(uid, email)
    rt = create_refresh_token(uid)
    set_auth_cookies(response, at, rt)
    user_doc["id"] = uid
    return {"user": _user_public(user_doc), "access_token": at}


@api.post("/auth/login")
async def login(body: LoginInput, request: Request, response: Response):
    email = body.email.lower().strip()
    identifier = email  # email-only to be robust behind proxies
    await check_lockout(db, identifier)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        await record_failure(db, identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await clear_failures(db, identifier)
    uid = str(user["_id"])
    at = create_access_token(uid, email)
    rt = create_refresh_token(uid)
    set_auth_cookies(response, at, rt)
    user["id"] = uid
    return {"user": _user_public(user), "access_token": at}


@api.post("/auth/logout")
async def logout(response: Response, user=Depends(_current)):
    # Revoke the current token by adding its jti to the blocklist until its natural expiry.
    jti = user.get("_jti")
    exp = user.get("_exp", 0)
    if jti and exp:
        await blocklist_jti(db, jti, exp)
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(_current)):
    return {"user": _user_public(user)}


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = _jwt.decode(rt, get_jwt_secret(), algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except _jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    uid = payload["sub"]
    user = await db.users.find_one({"_id": ObjectId(uid)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    at = create_access_token(uid, user["email"])
    new_rt = create_refresh_token(uid)
    set_auth_cookies(response, at, new_rt)
    return {"ok": True}


@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordInput):
    """Issue a password reset token. Always returns success to avoid email enumeration."""
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if user:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": str(user["_id"]),
            "email": email,
            "expires_at": expires_at,
            "used": False,
            "created_at": datetime.now(timezone.utc),
        })
        reset_link = f"{frontend_url}/reset-password?token={token}"
        logger.info("Password reset requested for %s — link: %s", email, reset_link)
        # In production, dispatch this via email service.
    return {"ok": True, "message": "If that email exists, we've sent a reset link."}


@api.post("/auth/reset-password")
async def reset_password(body: ResetPasswordInput):
    doc = await db.password_reset_tokens.find_one({"token": body.token})
    if not doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    if doc.get("used"):
        raise HTTPException(status_code=400, detail="This reset link has already been used")
    exp = doc.get("expires_at")
    if exp:
        exp_utc = exp if exp.tzinfo else exp.replace(tzinfo=timezone.utc)
        if exp_utc < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="This reset link has expired")
    user = await db.users.find_one({"_id": ObjectId(doc["user_id"])})
    if not user:
        raise HTTPException(status_code=400, detail="Account no longer exists")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(body.password)}},
    )
    await db.password_reset_tokens.update_one(
        {"token": body.token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc)}},
    )
    # Clear any brute-force lockout for this account.
    await clear_failures(db, user["email"])
    return {"ok": True}


# ---------- Skin Profile ----------
@api.get("/profile")
async def get_profile(user=Depends(_current)):
    prof = await db.skin_profiles.find_one({"user_id": user["id"]})
    if not prof:
        return {"profile": None}
    return {"profile": _profile_public(prof)}


@api.put("/profile")
async def upsert_profile(body: SkinProfileInput, user=Depends(_current)):
    doc = {
        "user_id": user["id"],
        "skin_type": body.skin_type,
        "concerns": body.concerns,
        "allergies_enc": encrypt_str(body.allergies) if body.allergies else "",
        "age_range": body.age_range,
        "budget": body.budget,
        "current_routine_level": body.current_routine_level,
        "ai_notes": body.ai_notes or "",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.skin_profiles.update_one(
        {"user_id": user["id"]}, {"$set": doc}, upsert=True
    )
    return {"profile": _profile_public(doc)}


def _profile_public(doc: dict) -> dict:
    return {
        "skin_type": doc.get("skin_type"),
        "concerns": doc.get("concerns", []),
        "allergies": decrypt_str(doc.get("allergies_enc", "")) if doc.get("allergies_enc") else "",
        "age_range": doc.get("age_range"),
        "budget": doc.get("budget"),
        "current_routine_level": doc.get("current_routine_level"),
        "ai_notes": doc.get("ai_notes") or "",
        "updated_at": doc.get("updated_at"),
    }


# ---------- Routine ----------
@api.post("/routine/generate")
async def generate_routine(body: SkinProfileInput, user=Depends(_current)):
    # Persist profile
    await upsert_profile(body, user)  # type: ignore
    # Fetch products
    products = await db.products.find({}).to_list(500)
    profile_dict = body.model_dump()
    routine = build_routine(products, profile_dict)
    routine_doc = {
        "user_id": user["id"],
        "steps": routine["steps"],
        "ai_notes": body.ai_notes or "",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.routines.update_one(
        {"user_id": user["id"]}, {"$set": routine_doc}, upsert=True
    )
    return {"routine": _routine_public(routine_doc)}


@api.get("/routine")
async def get_routine(user=Depends(_current)):
    doc = await db.routines.find_one({"user_id": user["id"]})
    if not doc:
        return {"routine": None}
    return {"routine": _routine_public(doc)}


@api.patch("/routine/steps")
async def patch_step(body: UpdateStepInput, user=Depends(_current)):
    """Update a single step's product_name (user-provided override)."""
    doc = await db.routines.find_one({"user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="No routine yet")
    steps = doc.get("steps", [])
    updated = False
    for s in steps:
        if s.get("time_of_day") == body.time_of_day and int(s.get("step_order", 0)) == body.step_order:
            s["product_name"] = body.product_name
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Step not found")
    await db.routines.update_one(
        {"user_id": user["id"]},
        {"$set": {"steps": steps, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"routine": _routine_public({**doc, "steps": steps})}


def _routine_public(doc: dict) -> dict:
    steps = doc.get("steps")
    if steps is None:
        # Legacy shape (am_steps/pm_steps) — synthesize the flat schema on the fly
        # so older stored routines keep rendering after the schema switch.
        steps = _legacy_to_flat_steps(doc)
    return {
        "steps": steps,
        "ai_notes": doc.get("ai_notes") or "",
        "generated_at": doc.get("generated_at"),
    }


def _legacy_to_flat_steps(doc: dict) -> List[dict]:
    """Best-effort migration from the old am_steps/pm_steps shape."""
    out: List[dict] = []
    legacy_map = {"cleanser": "cleanser", "treatment": "serum", "moisturizer": "moisturizer", "spf": "sunscreen"}
    for time_key, tod in (("am_steps", "am"), ("pm_steps", "pm")):
        order = 1
        for s in doc.get(time_key, []) or []:
            cat = legacy_map.get(s.get("step") or "", s.get("step") or "")
            examples = s.get("examples") or []
            out.append({
                "time_of_day": tod,
                "step_order": order,
                "product_category": cat,
                "product_name": (examples[0].get("name") if examples else "") if isinstance(examples, list) else "",
                "why": s.get("why", ""),
                "suggestions": examples,
            })
            order += 1
    return out


# ---------- Products ----------
@api.get("/products")
async def list_products():
    docs = await db.products.find({}, {"_id": 0}).to_list(500)
    return {"products": docs}


# ---------- Progress Tracking (manual self-rated) ----------
@api.post("/progress/entries")
async def create_progress_entry(body: ProgressEntryInput, user=Depends(_current)):
    # Strip data-URL prefix if present so we store only the raw base64 payload.
    payload = body.image_base64
    if payload.startswith("data:"):
        _, _, payload = payload.partition(",")
    doc = {
        "user_id": user["id"],
        "image_base64": payload,
        "mime_type": body.mime_type,
        "ratings": body.ratings.model_dump(),
        "notes": body.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.progress_entries.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return {"entry": _progress_public(doc)}


@api.get("/progress/entries")
async def list_progress_entries(user=Depends(_current)):
    cursor = db.progress_entries.find({"user_id": user["id"]}).sort("created_at", -1).limit(60)
    entries = [_progress_public(d) async for d in cursor]
    return {"entries": entries}


@api.delete("/progress/entries/{entry_id}")
async def delete_progress_entry(entry_id: str, user=Depends(_current)):
    try:
        oid = ObjectId(entry_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    res = await db.progress_entries.delete_one({"_id": oid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"ok": True}


def _progress_public(doc: dict) -> dict:
    return {
        "id": str(doc.get("_id") or doc.get("id") or ""),
        "image_base64": doc.get("image_base64", ""),
        "mime_type": doc.get("mime_type", "image/jpeg"),
        "ratings": doc.get("ratings") or {},
        "notes": doc.get("notes") or "",
        "created_at": doc.get("created_at"),
    }


# ---------- Ingredient Conflict Checker ----------
@api.get("/ingredients")
async def list_ingredients():
    """Return the canonical list of known ingredients for the dropdown."""
    return {"ingredients": known_ingredients()}


@api.post("/ingredients/check")
async def check_ingredients(body: IngredientCheckInput, user=Depends(_current)):
    """Check whether two ingredients can be combined. Static rule-based lookup."""
    result = check_pair(body.ingredient_a, body.ingredient_b)
    return {"result": result}


# ---------- Skin Photo Analysis (Claude Sonnet 4.5 vision) ----------
@api.post("/skin/analyze")
async def skin_analyze(body: SkinAnalyzeInput, user=Depends(_current)):
    """Analyze an uploaded face photo. The photo is discarded after analysis."""
    try:
        result = await analyze_skin_photo(body.image_base64, session_id=f"skin-{user['id']}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Skin analysis failed: %s", e)
        raise HTTPException(status_code=502, detail="Skin analysis is temporarily unavailable")
    return {"analysis": result}


# ---------- Account: export & delete ----------
@api.get("/account/export")
async def export_account(user=Depends(_current)):
    profile = await db.skin_profiles.find_one({"user_id": user["id"]})
    routine = await db.routines.find_one({"user_id": user["id"]})
    progress_docs = await db.progress_entries.find({"user_id": user["id"]}).sort("created_at", -1).to_list(200)
    return {
        "user": _user_public(user),
        "profile": _profile_public(profile) if profile else None,
        "routine": _routine_public(routine) if routine else None,
        "progress": [
            {
                "created_at": d.get("created_at"),
                "ratings": d.get("ratings"),
                "notes": d.get("notes"),
                # Image intentionally omitted to keep the export lightweight;
                # users can re-download individual photos from the UI.
            }
            for d in progress_docs
        ],
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }


@api.delete("/account")
async def delete_account(response: Response, user=Depends(_current)):
    uid = user["id"]
    await db.skin_profiles.delete_many({"user_id": uid})
    await db.routines.delete_many({"user_id": uid})
    await db.progress_entries.delete_many({"user_id": uid})
    await db.users.delete_one({"_id": ObjectId(uid)})
    clear_auth_cookies(response)
    return {"ok": True}


# ---------- Root ----------
@api.get("/")
async def root():
    return {"app": "Le Rituel", "status": "ok"}


app.include_router(api)


@app.on_event("shutdown")
async def _shutdown():
    client.close()
