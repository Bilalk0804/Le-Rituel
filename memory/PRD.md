# Le Rituel — PRD

## Problem statement
Build a mobile-first web app called **Le Rituel**, a personalized skincare recommendation app. A user answers a short guided quiz about their skin, and the app instantly generates a personalized skincare routine (AM/PM) with specific product-type recommendations. Design principle: simplicity above all else, under-2-minute time-to-value, no clutter, one primary action per screen.

## Target user
Someone overwhelmed by skincare choices who wants a fast, trustworthy answer to "what should I actually be using?" — not an expert, not a community-seeker.

## Core requirements (stable)
- 6-step onboarding quiz (skin type, concerns max 3, allergies, current routine level, age, budget)
- AM/PM routine result screen with step cards (cleanser → treatment → moisturizer → SPF)
- Auth: email + password (bcrypt, JWT httpOnly cookies + refresh rotation, brute force lockout)
- Dashboard: saved routine, retake quiz, edit profile
- Account deletion + data export (GDPR)
- Rule-based recommendation engine (swappable) — no ML/AI photo analysis in v1
- Sensitive fields (allergies) encrypted at rest with Fernet
- Product DB seedable from `products_seed.py`, tagged by skin_type / concerns / budget

## Non-goals for v1
- No AI photo/selfie analysis
- No e-commerce / checkout
- No community/reviews/feed
- No push notifications
- No admin CMS

## Architecture
- Backend: FastAPI + Motor/Mongo. Modules cleanly separated: `auth.py`, `crypto_utils.py`, `recommender.py`, `products_seed.py`, `server.py`
- Frontend: React 19 + react-router-dom + framer-motion + Tailwind + Manrope/Fraunces fonts
- Recommendation engine takes `(products, profile_dict)` — swap-in ready
- Auth cookies: `access_token` (15 min) + `refresh_token` (7 days), httpOnly, secure, samesite=none

## Data model
- `users` { _id, email(unique), password_hash, name, auth_provider, role, created_at }
- `skin_profiles` { user_id(unique), skin_type, concerns[], allergies_enc, age_range, budget, current_routine_level, updated_at }
- `routines` { user_id, am_steps[], pm_steps[], generated_at }
- `products` { name, brand, category, skin_types[], concerns[], budget_tier, description }
- `login_attempts` { identifier, count, locked_until }
- `password_reset_tokens` { token, expires_at, used }

## What's implemented (2026-02)
- Full auth flow: register / login / logout / me / refresh with httpOnly cookies
- Brute-force protection (5 attempts → 15 min lockout)
- Bcrypt hashing, secret from env, admin seeding on startup
- Skin profile CRUD with field-level encryption for allergies
- Rule-based recommender with skin-type match (5pts), concern overlap (3pts each), budget proximity (0-3pts), allergy blacklist
- Routine generation persists to Mongo + returns AM (4 steps) / PM (3 steps)
- 21-product seed across 5 popular brands, all tiers
- Frontend: Landing → Register/Login → 6-step Quiz with progress + framer-motion slide transitions → Result page (soft sage bg, staggered reveal) → Dashboard → Settings (export/delete)
- Data export as JSON download, hard delete of account+profile+routine
- Design system: Manrope + Fraunces italic display, warm-white / sage / blush palette, no gradients, generous whitespace, pill CTAs

## Prioritized backlog

### P1 (next iteration)
- Emergent-managed Google OAuth (currently JWT email/password only)
- Password reset flow (endpoints scaffolded, no UI yet)
- More products (currently 21; add cleansers/actives for combination + sensitive)
- Success confirmation animation on save routine (currently just toast)

### P2
- HTTPS-only cookies flag configurable per environment (currently forced secure=true which requires https)
- Analytics opt-in banner
- v2: AI photo skin analysis module swap-in

## Known limitations
- Google OAuth deferred to v1.1 (email/password fulfills login requirement)
- No password-reset UI (backend endpoints exist per playbook but frontend forgot-password screen not built)
