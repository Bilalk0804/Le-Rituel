# Le Rituel 🌿

> **Live at → [nodeflowai.in](https://nodeflowai.in)**

**Le Rituel** is a production-grade, AI-powered skincare platform that builds a personalized AM/PM routine for every user from scratch. Answer a short quiz (or let the AI analyse a selfie), get a curated routine matched to your skin type, budget, and concerns — then track your progress day by day.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [API Reference](#api-reference)
6. [Security Model](#security-model)
7. [Environment Variables](#environment-variables)
8. [Running Locally](#running-locally)
9. [Docker Deployment](#docker-deployment)
10. [Production Notes](#production-notes)
11. [Testing](#testing)

---

## Features

### 🔬 AI Skin Photo Analysis
Upload a selfie and **Claude Sonnet 4.5 (vision)** non-diagnostically reads your skin surface — oiliness, texture, redness, pore size, fine lines, dark marks — and maps the result to a skin type (`oily / dry / combination / normal / sensitive`) and up to three concerns. The photo is discarded after the API call; **nothing is persisted**.

### 🧴 Quiz-Based Personalization
A short onboarding quiz captures:
- Skin type · Top concerns (max 3) · Known allergies
- Age range · Budget tier (`drugstore / mid-range / premium`)
- Current routine experience level

### 🤖 Smart Routine Engine
A deterministic, score-based recommendation engine (`recommender.py`) builds an ordered AM/PM routine from a curated product catalogue seeded into MongoDB:

| Time | Steps |
|------|-------|
| **AM** | Cleanser → Moisturizer → Sunscreen |
| **PM** | Cleanser → Serum → Moisturizer (+ Retinol for 30+, if applicable) |

Scoring weights: skin-type match (+5), concern overlap (+3 each), budget proximity (+0–3). Allergy keywords are filtered out before scoring. Retinol is automatically added for users aged 30+ or with fine-line/dark-spot concerns, and excluded for sensitive skin.

### 💬 AI Skincare Chat Assistant
A context-aware chat powered by **Claude Sonnet 4.5** — scoped *strictly* to skincare topics. The system prompt is enriched with the user's quiz results and current routine steps, so advice is always personalized. History is capped at the last 8 turns for cost control.

### 🧪 Ingredient Conflict Checker
Static rule-based lookup of 13 canonical ingredient families with alias resolution (`ascorbic acid` → `Vitamin C`). Returns one of three verdicts:

- **avoid** — known conflict (e.g. Retinol + AHA) with a plain-language reason
- **safe** — including synergy notes (e.g. Vitamin C + Vitamin E)
- **unknown** — ingredient not in the catalogue

### 📈 Progress Tracking
Log daily skin selfies with self-rated scores (acne, redness, oiliness, hydration on 1–5 scales) and optional notes. Up to 60 entries are retained per user.

### 🔥 Routine Streak Tracker
Mark AM and PM routines complete per calendar day. The backend computes the **current consecutive streak** and **all-time longest streak** (both require a full AM + PM day to count). The last 400 completion records are considered.

### ⏰ Reminder Settings
Users can configure preferred AM and PM reminder times (stored as `HH:MM` 24-hour strings).

### 📦 Data Export & Account Deletion
- `GET /api/account/export` — download all personal data (profile, routine, progress ratings) as JSON
- `DELETE /api/account` — hard-deletes all user data and revokes the session immediately

---

## Architecture

```
┌─ Browser (https://nodeflowai.in)
│
├─ frontend container  (nginx :80)
│    ├─ Serves /           → React 19 (CRA + craco) static build
│    └─ Proxies /api/*     → backend:8001  (same-origin, no CORS)
│
├─ backend container   (uvicorn :8001)
│    ├─ FastAPI async API
│    ├─ JWT auth (15-min access + 7-day refresh, HttpOnly cookies)
│    ├─ Motor (async MongoDB driver)
│    └─ Emergent LLM integration (Claude Sonnet 4.5)
│
└─ mongo container     (:27017, persistent volume `mongo_data`)
     └─ Collections: users, skin_profiles, routines, products,
                     progress_entries, routine_completions,
                     login_attempts, password_reset_tokens,
                     token_blocklist
```

Because nginx proxies `/api` to the backend within the Docker network, the browser hits a **single origin** — no CORS preflight needed, and `SameSite=None; Secure` cookies work transparently when TLS is terminated upstream.

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | **FastAPI** 0.110 (async) |
| Runtime | **Python 3.11**, uvicorn 0.25 |
| Database | **MongoDB 7** via Motor 3.3 (async) |
| Auth | **PyJWT** (HS256), **bcrypt** password hashing |
| Encryption | **Fernet** (AES-128-CBC) for allergy data at rest |
| AI | **Emergent Integrations** → Claude Sonnet 4.5 (vision + chat) |
| Validation | **Pydantic v2** |

### Frontend
| Layer | Technology |
|---|---|
| Framework | **React 19** (Create React App + craco) |
| Routing | **React Router v7** |
| UI Library | **shadcn/ui** (Radix UI primitives + Tailwind CSS 3) |
| State | **SWR** (data fetching + revalidation), React Context |
| Forms | **React Hook Form** + **Zod** |
| Animations | **Framer Motion** |
| Charts | **Recharts** |
| HTTP | **Axios** |
| Bundler | **Webpack** (via react-scripts 5 + craco) |

### Infrastructure
| Concern | Tool |
|---|---|
| Containerisation | **Docker** + **Docker Compose** v2 |
| Web server | **nginx** (static file serving + reverse proxy) |
| TLS | Terminated at Cloudflare / upstream reverse proxy |
| Data persistence | Named Docker volume (`mongo_data`) |

---

## Project Structure

```
le-rituel/
├── docker-compose.yml          # Three-service compose stack
├── .env.example                # All supported env vars with docs
│
├── backend/
│   ├── server.py               # FastAPI app, all route handlers
│   ├── auth.py                 # JWT creation/validation, brute-force lockout
│   ├── crypto_utils.py         # Fernet encrypt/decrypt helpers
│   ├── recommender.py          # Score-based routine builder
│   ├── skin_analysis.py        # Claude vision skin-photo analyzer
│   ├── ingredient_checker.py   # Static ingredient conflict lookup
│   ├── chat_assistant.py       # Claude Sonnet chat, skincare-scoped
│   ├── products_seed.py        # Initial product catalogue (seeded on startup)
│   ├── requirements.txt
│   └── Dockerfile
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Landing.jsx         # Public landing / hero
    │   │   ├── Login.jsx           # Email/password login
    │   │   ├── Register.jsx        # Account creation
    │   │   ├── ForgotPassword.jsx  # Password reset request
    │   │   ├── ResetPassword.jsx   # Token-gated password reset
    │   │   ├── Quiz.jsx            # Skin quiz + photo analysis
    │   │   ├── Result.jsx          # Generated routine display & edit
    │   │   ├── Dashboard.jsx       # Streak, completions, overview
    │   │   ├── Progress.jsx        # Photo journal + progress charts
    │   │   ├── Chat.jsx            # AI skincare chat
    │   │   ├── CheckIngredients.jsx# Ingredient conflict checker
    │   │   └── Settings.jsx        # Reminders, export, account deletion
    │   ├── components/
    │   │   ├── ProtectedRoute.jsx  # Auth guard for private pages
    │   │   ├── SkinPhotoStep.jsx   # Webcam/upload for photo analysis
    │   │   ├── ReminderBanner.jsx  # Routine reminder prompt
    │   │   ├── InstallPrompt.jsx   # PWA install banner
    │   │   └── TopBar.jsx          # Global navigation header
    │   ├── context/                # Auth context (user + session)
    │   ├── hooks/                  # Custom React hooks
    │   ├── lib/                    # Axios client, utilities
    │   └── constants/
    ├── nginx.conf                  # nginx config (SPA fallback + /api proxy)
    ├── tailwind.config.js
    └── Dockerfile
```

---

## API Reference

All endpoints are prefixed with `/api`. Authentication uses **HttpOnly cookies** (`access_token` + `refresh_token`). The access token is also returned in the response body for clients that prefer the `Authorization: Bearer <token>` header.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | — | Create account. Returns user + sets auth cookies |
| `POST` | `/api/auth/login` | — | Email/password login. Brute-force protected |
| `POST` | `/api/auth/logout` | ✅ | Revokes current access token (JTI blocklist) |
| `GET`  | `/api/auth/me` | ✅ | Returns current user |
| `POST` | `/api/auth/refresh` | — | Issues new access + refresh tokens from refresh cookie |
| `POST` | `/api/auth/forgot-password` | — | Issues a password-reset link (logged; email hookup ready) |
| `POST` | `/api/auth/reset-password` | — | Validates reset token and updates password hash |

### Skin Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/api/profile` | ✅ | Fetch the user's skin profile (allergies decrypted in-flight) |
| `PUT`  | `/api/profile` | ✅ | Create or update skin profile (allergies Fernet-encrypted at rest) |

### Routine

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/routine/generate` | ✅ | Run the recommendation engine + save the routine |
| `GET`  | `/api/routine` | ✅ | Fetch the saved routine |
| `PATCH`| `/api/routine/steps` | ✅ | Override a single step's product name |
| `POST` | `/api/routine/complete` | ✅ | Mark AM or PM routine as done for a given date |
| `GET`  | `/api/routine/streak` | ✅ | Current + longest streak |
| `GET`  | `/api/routine/completions` | ✅ | Last 60 completion records |

### Products

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/api/products` | — | Full product catalogue |

### Progress

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/progress/entries` | ✅ | Log a progress entry (photo + ratings + notes) |
| `GET`  | `/api/progress/entries` | ✅ | List last 60 entries |
| `DELETE`| `/api/progress/entries/{id}` | ✅ | Delete a specific entry |

### AI Features

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/skin/analyze` | ✅ | Claude vision photo analysis. Photo discarded after call |
| `POST` | `/api/chat` | ✅ | Skincare-scoped Claude chat with personalized context |

### Ingredients

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/api/ingredients` | — | List of known canonical ingredients |
| `POST` | `/api/ingredients/check` | ✅ | Check two ingredients for conflicts |

### Account

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/api/account/export` | ✅ | Download all user data as JSON |
| `DELETE`| `/api/account` | ✅ | Permanently delete account + all data |

### Settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/api/settings/reminders` | ✅ | Get reminder preferences |
| `PUT`  | `/api/settings/reminders` | ✅ | Update reminder preferences |

---

## Security Model

| Concern | Implementation |
|---------|----------------|
| **Password storage** | bcrypt with per-password salt |
| **Session tokens** | HS256 JWT — 15-min access + 7-day refresh, both HttpOnly |
| **Token revocation** | JTI blocklist in MongoDB (TTL-indexed, expires with token) |
| **Brute-force protection** | 5 failed attempts → 15-min lockout per email |
| **Sensitive data at rest** | Fernet (AES-128-CBC + HMAC) encryption for allergy field |
| **Photo privacy** | Selfies for AI analysis are **never persisted** server-side |
| **Input validation** | Pydantic v2 models on every request body; control chars stripped |
| **CORS** | Locked to `FRONTEND_URL`; same-origin in compose mode |
| **Cookie attributes** | `HttpOnly; Secure; SameSite=None` (required for cross-site HTTPS) |
| **Password reset** | Single-use tokens, 1-hour TTL, TTL-indexed in MongoDB |
| **Email enumeration** | Forgot-password always returns `200 OK` regardless of email existence |
| **Admin seeding** | Admin credentials loaded from env vars, never hardcoded in source |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the secrets before starting.

### Required

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | 64+ hex chars — signs all JWT tokens. Generate with `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `DATA_ENCRYPTION_KEY` | Fernet key — encrypts allergy data at rest. Generate with `python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |

### Optional — Strongly Recommended

| Variable | Default | Description |
|----------|---------|-------------|
| `EMERGENT_LLM_KEY` | — | Enables Claude skin-photo analysis and chat assistant |
| `ADMIN_EMAIL` | `admin@lerituel.app` | Seeded admin account email |
| `ADMIN_PASSWORD` | `Admin123!` | Seeded admin account password — **change before going public** |
| `FRONTEND_URL` | `http://localhost:8080` | Used in password-reset links and CORS allowlist |
| `FRONTEND_PORT` | `8080` | Host port to expose the nginx container on |
| `DB_NAME` | `le_rituel` | MongoDB database name |
| `MONGO_URL` | `mongodb://mongo:27017` | MongoDB connection string |
| `PUBLIC_URL` | — | Set to the API's public URL only if frontend and backend are on separate domains |

---

## Running Locally

### Prerequisites
- Docker Desktop ≥ 24 (includes Compose V2)
- Python 3.11+ (for generating secrets)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Bilalk0804/Le-Rituel.git
cd Le-Rituel

# 2. Create and populate the .env file
cp .env.example .env

# 3. Generate the required secrets and paste them into .env
python3 -c "import secrets; print(secrets.token_hex(32))"          # → JWT_SECRET
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"  # → DATA_ENCRYPTION_KEY

# (Optional) Add your EMERGENT_LLM_KEY to enable Claude AI features

# 4. Start the stack
docker compose up --build

# 5. Open the app
open http://localhost:8080
```

The `backend` container seeds the MongoDB product catalogue and the admin account on first startup. The stack is ready when you see:
```
backend  | INFO:     Application startup complete.
```

### Local Development (without Docker)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
# Set env vars (or create a .env file in backend/)
uvicorn server:app --reload --port 8001
```

**Frontend:**
```bash
cd frontend
yarn install
REACT_APP_BACKEND_URL=http://localhost:8001 yarn start
```

---

## Docker Deployment

The compose stack runs three containers on an isolated bridge network (`le_rituel`). Only the frontend's port 80 is published to the host:

```
mongo      → internal only  (port 27017, volume: mongo_data)
backend    → internal only  (port 8001)
frontend   → host:8080 → container:80  (nginx)
```

### Bring the stack up

```bash
docker compose up --build -d
```

### Common Operations

```bash
# Tail backend logs
docker compose logs -f backend

# Open a MongoDB shell
docker compose exec mongo mongosh

# Stop all containers (data persists in the volume)
docker compose down

# Stop and delete all data (destructive!)
docker compose down -v

# Rebuild the React bundle only
docker compose build --no-cache frontend
```

### Backup MongoDB

```bash
docker run --rm \
  -v le-rituel_mongo_data:/data \
  -v $PWD:/backup \
  alpine tar czf /backup/mongo_backup.tgz /data
```

---

## Production Notes

### TLS / HTTPS
HTTPS is **required** for cookie-based auth outside `localhost`. The cookies are set with `Secure; SameSite=None`, so browsers reject them over plain HTTP.

Terminate TLS at an upstream reverse proxy and point it at the frontend container on port 80:

- **Cloudflare Tunnel** — easiest, works with the free plan
- **Caddy** — automatic HTTPS via Let's Encrypt
- **Traefik** — good for multi-service Docker setups
- **nginx** on host with Certbot

### Scaling
The backend is stateless (all state in MongoDB); you can run multiple backend replicas behind a load balancer. The frontend nginx container serves only static files.

### Data Persistence
User data lives exclusively in the `mongo_data` Docker volume. **Back this up regularly.** The progress image blobs (base64) are stored in MongoDB documents — monitor document size if your user base grows.

### Password Reset Email
The `forgot-password` endpoint logs the reset link to stdout. Wire it up to an email service (SendGrid, SES, Postmark, etc.) by replacing the `logger.info(...)` call in `server.py` with your preferred transactional email SDK.

### Monitoring
Structured JSON logging is available. Pipe `docker compose logs` to your preferred aggregator (Loki, Datadog, CloudWatch, etc.).

---

## Testing

```bash
cd backend
pytest -v
```

Test fixtures and configuration live in `backend/tests/` and `backend/pytest.ini`.

---

## License

This project is proprietary software. All rights reserved.

---

*Built with ❤️ · Deployed at [nodeflowai.in](https://nodeflowai.in)*
