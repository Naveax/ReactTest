# Certificate Generator + Public Verification (Monorepo)

This repository contains:
- `apps/api`: FastAPI + Pydantic + Motor (managed with PDM)
- `apps/web`: Bun + Vite + React (JSX) + TailwindCSS + Axios
- `docker-compose.yml`: MongoDB + optional mongo-express

## 1) Start MongoDB (persistent on `localhost:27017`)

```bash
docker compose up -d
```

Optional Mongo Express UI:

```bash
docker compose --profile tools up -d
```

Mongo data is persisted in the named Docker volume `mongo_data`.

## 2) First-time setup

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
bun run setup
```

`setup:api` automatically stops stale API/watch processes on port `8000` before installing packages.

Optional environment preflight:

```bash
bun run doctor
```

## 3) Run both backend + frontend with one command (recommended)

```bash
bun install
bun run dev
```

This starts:
- API: `http://localhost:8000`
- Web: `http://localhost:5173`

`bun run dev` starts API via the local `.venv` Python launcher (`scripts/dev-api.cjs`) for stability on Windows.
If `.venv` is missing, it auto-runs `pdm install` once.

Do not delete `apps/api/.venv` on every run. Keep it for stable startup speed.

## Alternative: run services separately

Backend:

```bash
cd apps/api
pdm install
pdm run dev
```

Frontend:

```bash
cd apps/web
bun install
bun run dev
```

## Routes

- Create certificate: `http://localhost:5173/`
- Verify certificate code: `http://localhost:5173/verify`
- Logs: `http://localhost:5173/logs`
- Verification data: `http://localhost:5173/data`
- Public certificate view: `http://localhost:5173/c/:certificate_id`

## API Endpoints

- `POST /api/certificates`
- `GET /api/certificates/{certificate_id}`
- `GET /api/certificates/verify?code=...`

## Smoke test

After `bun run dev` is running:

```bash
bun run test:smoke
```

## Stability notes

- Frontend dev server proxies `/api` requests to `http://127.0.0.1:8000` by default.
- `VITE_API_BASE` is optional. If empty, frontend uses same-origin + Vite proxy (recommended for local dev).
- CORS defaults include both `localhost:5173` and `127.0.0.1:5173`.
- Backend is configured to use real MongoDB by default (`MONGODB_URL=mongodb://localhost:27017`, `MONGODB_DB=GPV`).
- Canonical project database name is `GPV` (Generator Public Verification).
- `ENABLE_MEMORY_FALLBACK=false` by default to avoid accidental non-persistent data usage.
- UI includes a top-right theme toggle (`Dark Mode` / `Light Mode`) and stores selection in localStorage.
- If no saved selection exists, UI defaults to dark theme between 19:00 and 07:00 local time.
- API hot reload is disabled by default for maximum stability on Windows.  
  If needed: `API_RELOAD=1 bun run dev`
- When `API_RELOAD=1`, exclude patterns avoid wildcard expansion issues on Windows (`.venv`, `__pycache__`).
- `setup:api` and `dev:api` auto-recreate `.venv` if it was created by a different OS runtime (Windows vs WSL/Linux).

## MongoDB Compass (WSL)

If you run the project inside WSL and Compass runs on Windows, `localhost:27017` may point to a different MongoDB instance.

1) Get WSL IP:

```bash
hostname -I | awk '{print $1}'
```

2) Connect from Compass with:

```text
mongodb://<WSL_IP>:27017/?directConnection=true
```

3) Verify project DB is visible:
- Database: `GPV`
- Collection: `certificates`

## Troubleshooting

- If you see `Network Error` in UI:
  1) Ensure MongoDB is running: `docker compose up -d`
  2) Ensure API is healthy: open `http://localhost:8000/health` and confirm `"database":"mongo"`
  3) Start everything from root: `bun run dev`
- If Compass does not show `GPV`:
  1) Confirm container data: `docker exec certificate-mongodb mongosh --quiet --eval 'printjson(db.adminCommand({listDatabases:1}).databases.map(d=>d.name))'`
  2) If `GPV` appears in command output but not in Compass, reconnect Compass using WSL IP (section above).
- If `docker compose up -d` fails with `dockerDesktopLinuxEngine` pipe error:
  1) Start Docker Desktop manually
  2) Wait until Docker is fully running
  3) Re-run `docker compose up -d`
