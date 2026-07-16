# Deploying Le Rituel with Docker

Three services: **mongo**, **backend** (FastAPI on port 8001), **frontend** (nginx serving the React build + reverse-proxying `/api` to the backend).

## Quick start

```bash
# 1. From the repo root
cp .env.example .env

# 2. Generate the two required secrets and paste them into .env
python3 -c "import secrets; print(secrets.token_hex(32))"                              # → JWT_SECRET
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"  # → DATA_ENCRYPTION_KEY

# 3. (Optional) paste EMERGENT_LLM_KEY from your Emergent profile if you want
#    the AI skin-photo analysis and the chat assistant to work.

# 4. Bring the stack up
docker compose up --build -d

# 5. Open the app
open http://localhost:8080
```

The admin account is seeded on first run using `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (defaults: `admin@lerituel.app` / `Admin123!` — **change these before going public**).

## Architecture

```
┌─ Browser (http://localhost:8080)
│
├─ frontend container (nginx :80)
│    ├─ Serves /  → CRA build (index.html + /static/*)
│    └─ Proxies /api/* → backend:8001
│
├─ backend container (uvicorn :8001)
│    └─ Talks to → mongo:27017
│
└─ mongo container (:27017, persistent volume `mongo_data`)
```

Because the frontend proxies `/api` to the backend inside the compose network, the browser only ever sees one origin — no CORS friction and cookies (`SameSite=None; Secure`) work naturally when you put this behind HTTPS.

## Environment variables

Fully documented in `.env.example`. The two you **must** set:

| Variable              | Why                                                                 |
|-----------------------|---------------------------------------------------------------------|
| `JWT_SECRET`          | Signs auth tokens. 64+ hex chars.                                   |
| `DATA_ENCRYPTION_KEY` | Fernet key encrypting sensitive fields (allergies) at rest.         |

Optional but recommended:

| Variable            | Effect                                                                  |
|---------------------|-------------------------------------------------------------------------|
| `EMERGENT_LLM_KEY`  | Enables Claude skin-photo analysis + AI chat assistant.                 |
| `ADMIN_*`           | Seeded admin login on first startup.                                    |
| `FRONTEND_URL`      | Used in password-reset links; set to your public URL in production.     |
| `FRONTEND_PORT`     | Host port to publish the nginx container on. Default `8080`.            |
| `PUBLIC_URL`        | If you split frontend/backend across hosts, set to the API's public URL.|

## Production notes

- **HTTPS is required** for cookie auth to work outside `localhost` — the backend sets `Secure; SameSite=None` cookies. Terminate TLS at a reverse proxy (Caddy, Traefik, Cloudflare, ALB, etc.) and point it at the `frontend` container on port 80.
- Persistent data lives in the named volume `mongo_data`. Back it up with `docker run --rm -v le-rituel_mongo_data:/data -v $PWD:/backup alpine tar czf /backup/mongo.tgz /data`.
- The frontend image builds with `REACT_APP_BACKEND_URL` baked in. In compose mode this is left empty so the browser hits `/api` on the same origin (recommended). If you deploy frontend and backend to separate domains, set `PUBLIC_URL=https://api.your-domain.com` before `docker compose build`.

## Common commands

```bash
docker compose logs -f backend           # tail backend logs
docker compose exec mongo mongosh        # open a mongo shell
docker compose down                      # stop everything (keeps data)
docker compose down -v                   # stop + delete the mongo volume (!)
docker compose build --no-cache frontend # rebuild the CRA bundle
```
