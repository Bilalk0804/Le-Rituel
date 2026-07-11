"""Le Rituel backend test suite — auth, profile, routine, export, delete, JTI blocklist, brute-force."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fallback: read frontend .env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip()
                    break
    except Exception:
        pass
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@lerituel.app"
ADMIN_PASSWORD = "Admin123!"


def _uniq_email(prefix="TEST_user"):
    # Backend lowercases emails on register/login, so use lower-case for equality asserts.
    return f"{prefix}_{uuid.uuid4().hex[:10]}@lerituel.app".lower()


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Root health ----------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert data.get("app") == "Le Rituel"


# ---------- Auth register/login/me ----------
class TestAuth:
    def test_register_success(self, session):
        email = _uniq_email()
        r = session.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data and len(data["access_token"]) > 20
        assert data["user"]["email"] == email
        assert data["user"]["auth_provider"] == "email"

    def test_register_duplicate(self, session):
        email = _uniq_email()
        r1 = session.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!"})
        assert r1.status_code == 200
        r2 = session.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!"})
        assert r2.status_code == 409

    def test_register_weak_password(self, session):
        r = session.post(f"{API}/auth/register", json={"email": _uniq_email(), "password": "short"})
        assert r.status_code == 422

    def test_login_and_me(self, session):
        email = _uniq_email()
        session.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!"})
        r = session.post(f"{API}/auth/login", json={"email": email, "password": "Test1234!"})
        assert r.status_code == 200
        token = r.json()["access_token"]

        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["user"]["email"] == email

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": _uniq_email(), "password": "Wrong123!"})
        assert r.status_code == 401


# ---------- Brute-force lockout ----------
class TestBruteForceLockout:
    def test_lockout_after_5_fails(self):
        # Use unique email to avoid clashing with other tests / prior state
        email = _uniq_email("TEST_bf")
        # Register the account so the endpoint has a real target (still: wrong pw => 401)
        requests.post(f"{API}/auth/register", json={"email": email, "password": "Correct123!"})

        # 5 wrong attempts -> 401
        for i in range(5):
            r = requests.post(f"{API}/auth/login", json={"email": email, "password": "Wrong0000!"})
            assert r.status_code == 401, f"attempt {i+1} expected 401 got {r.status_code}"

        # 6th attempt -> 429
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": "Wrong0000!"})
        assert r.status_code == 429, f"expected 429, got {r.status_code} body={r.text}"
        assert "Too many" in r.json().get("detail", "") or "try again" in r.json().get("detail", "").lower()


# ---------- Logout invalidates JTI ----------
class TestLogoutBlocklist:
    def test_logout_revokes_access_token(self):
        email = _uniq_email("TEST_logout")
        s = requests.Session()
        reg = s.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!"})
        assert reg.status_code == 200
        token = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # /me works
        r = requests.get(f"{API}/auth/me", headers=headers)
        assert r.status_code == 200

        # logout using bearer token (backend also relies on cookie; session has cookies too)
        lo = s.post(f"{API}/auth/logout", headers=headers)
        assert lo.status_code == 200, lo.text

        # same bearer token should now be revoked
        r2 = requests.get(f"{API}/auth/me", headers=headers)
        assert r2.status_code == 401, f"expected 401 after logout, got {r2.status_code}"


# ---------- Profile ----------
class TestProfile:
    def _fresh_token(self):
        email = _uniq_email("TEST_prof")
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!"})
        return r.json()["access_token"], email

    def test_get_empty_profile(self):
        token, _ = self._fresh_token()
        r = requests.get(f"{API}/profile", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["profile"] is None

    def test_put_and_get_profile_persistence(self):
        token, _ = self._fresh_token()
        h = {"Authorization": f"Bearer {token}"}
        payload = {
            "skin_type": "oily",
            "concerns": ["acne", "dark spots"],
            "allergies": "fragrance",
            "age_range": "20-29",
            "budget": "mid-range",
            "current_routine_level": "basic",
        }
        put = requests.put(f"{API}/profile", json=payload, headers=h)
        assert put.status_code == 200, put.text
        assert put.json()["profile"]["skin_type"] == "oily"

        get = requests.get(f"{API}/profile", headers=h)
        assert get.status_code == 200
        prof = get.json()["profile"]
        assert prof["skin_type"] == "oily"
        assert set(prof["concerns"]) == {"acne", "dark spots"}
        # allergies stored encrypted, but returned decrypted
        assert prof["allergies"] == "fragrance"
        assert prof["budget"] == "mid-range"

    def test_put_profile_invalid_concern(self):
        token, _ = self._fresh_token()
        r = requests.put(
            f"{API}/profile",
            json={
                "skin_type": "oily",
                "concerns": ["not-a-real-concern"],
                "allergies": "",
                "age_range": "20-29",
                "budget": "premium",
                "current_routine_level": "none",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 422


# ---------- Routine generate/get ----------
class TestRoutine:
    def _fresh_token(self):
        email = _uniq_email("TEST_routine")
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!"})
        return r.json()["access_token"], email

    def test_generate_and_get_routine(self):
        token, _ = self._fresh_token()
        h = {"Authorization": f"Bearer {token}"}
        payload = {
            "skin_type": "combination",
            "concerns": ["acne"],
            "allergies": "",
            "age_range": "20-29",
            "budget": "drugstore",
            "current_routine_level": "basic",
        }
        gen = requests.post(f"{API}/routine/generate", json=payload, headers=h)
        assert gen.status_code == 200, gen.text
        routine = gen.json()["routine"]
        assert isinstance(routine["am_steps"], list) and len(routine["am_steps"]) >= 1
        assert isinstance(routine["pm_steps"], list) and len(routine["pm_steps"]) >= 1

        got = requests.get(f"{API}/routine", headers=h)
        assert got.status_code == 200
        r = got.json()["routine"]
        assert len(r["am_steps"]) == len(routine["am_steps"])
        assert len(r["pm_steps"]) == len(routine["pm_steps"])


# ---------- Export & Delete ----------
class TestAccount:
    def test_export_contains_all_sections(self):
        email = _uniq_email("TEST_export")
        reg = requests.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!"})
        token = reg.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}
        # Add profile & routine
        payload = {
            "skin_type": "dry",
            "concerns": ["dullness"],
            "allergies": "alcohol",
            "age_range": "30-39",
            "budget": "premium",
            "current_routine_level": "advanced",
        }
        requests.post(f"{API}/routine/generate", json=payload, headers=h)

        exp = requests.get(f"{API}/account/export", headers=h)
        assert exp.status_code == 200
        data = exp.json()
        assert data["user"]["email"] == email
        assert data["profile"]["skin_type"] == "dry"
        assert data["profile"]["allergies"] == "alcohol"
        assert len(data["routine"]["am_steps"]) >= 1
        assert "exported_at" in data

    def test_delete_account_and_verify_removal(self):
        email = _uniq_email("TEST_del")
        reg = requests.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!"})
        token = reg.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}

        d = requests.delete(f"{API}/account", headers=h)
        assert d.status_code == 200

        # After delete: /auth/me should 401 (user not found)
        me = requests.get(f"{API}/auth/me", headers=h)
        assert me.status_code == 401

        # login with same credentials should now fail (user gone)
        li = requests.post(f"{API}/auth/login", json={"email": email, "password": "Test1234!"})
        assert li.status_code == 401
