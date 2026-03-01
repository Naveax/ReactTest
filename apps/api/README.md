# API (FastAPI + Motor + PDM)

## Run

```bash
cp .env.example .env
pdm install
pdm run dev
```

Default database connection:

- `MONGODB_URL=mongodb://localhost:27017`
- `ENABLE_MEMORY_FALLBACK=false`
