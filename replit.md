# Aurelius — Stoic Counsel

A reflective chatbot that provides concise, grounded Stoic counsel inspired by Marcus Aurelius.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the Express API server (port 8080)
- `uv run uvicorn services.aurelius_ai.main:app --host 0.0.0.0 --port 8000` — run the LangGraph/FastAPI AI service
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, Python 3.11, TypeScript 5.9
- API: Express 5
- AI orchestration: FastAPI, LangChain, LangGraph, and Groq
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- The React app keeps the stable `/api/counsel` contract while Express delegates generation to the Python AI service when it is available.
- LangGraph keeps principle selection and counsel generation as explicit workflow nodes so retrieval and evaluation stages can be added without changing the UI.
- Express retains direct Groq and local counsel fallbacks so a Python-service outage does not turn the chat into a dead interface.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
