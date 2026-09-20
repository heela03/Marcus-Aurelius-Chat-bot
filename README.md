# Aurelius — Stoic Counsel

A reflective Marcus Aurelius-inspired chatbot with a React interface, an Express API gateway, and a Python AI orchestration service built with FastAPI, LangChain, LangGraph, and Groq.

For a complete VS Code setup guide, see [`HOW_TO_RUN_IN_VSCODE.md`](HOW_TO_RUN_IN_VSCODE.md).

## Technology stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React
- Wouter
- Radix UI
- TanStack React Query

### Backend and API

- Node.js
- Express 5
- TypeScript
- OpenAPI
- Zod validation
- Pino logging
- ESBuild

### AI service

- Python 3.11
- FastAPI
- Uvicorn
- LangChain
- LangGraph
- `langchain-groq`
- Groq-hosted `openai/gpt-oss-120b`
- Async model calls

The current generation graph is:

```text
Question
  ↓
Casual greeting check
  ↓
Select Stoic principle
  ↓
Build grounded Meditations context
  ↓
Generate concise counsel with Groq
  ↓
Express API response
  ↓
React conversation UI
```

If the Python service is unavailable, the Express API falls back to a direct Groq request and then to curated local counsel.

## Exact development workflow

This is a pnpm workspace with three application services:

```text
Frontend:   pnpm --filter @workspace/aurelius-chat run dev
API:        pnpm --filter @workspace/api-server run dev
AI service: uv run uvicorn services.aurelius_ai.main:app --host 0.0.0.0 --port 8000
```

### Run locally in VS Code

Requirements:

- Node.js 24
- pnpm
- Python 3.11+
- uv

Install dependencies from the project root:

```bash
pnpm install
uv sync
```

If you prefer a standard pip workflow instead of uv:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Set the Groq key in your terminal or local secret manager. Never commit it:

```bash
export GROQ_API_KEY="your-key-here"
export GROQ_MODEL="openai/gpt-oss-120b"
```

Open three VS Code terminals.

Terminal 1 — AI service:

```bash
uv run uvicorn services.aurelius_ai.main:app --host 0.0.0.0 --port 8000
```

Terminal 2 — Express API:

```bash
PORT=8080 pnpm --filter @workspace/api-server run dev
```

Terminal 3 — React frontend:

```bash
PORT=5173 BASE_PATH=/ API_PROXY_TARGET=http://localhost:8080 pnpm --filter @workspace/aurelius-chat run dev
```

Open `http://localhost:5173`.

The frontend sends requests to `/api/counsel`. Vite proxies those requests to the Express API on port 8080. Express sends generation requests to the FastAPI service on port 8000.

## API endpoints

### Health checks

```text
GET http://localhost:8000/healthz
GET http://localhost:8080/api/healthz
```

### Counsel

```text
POST http://localhost:8080/api/counsel
Content-Type: application/json
```

Example body:

```json
{
  "question": "I am worried about tomorrow.",
  "history": []
}
```

Responses are intentionally concise. Casual greetings such as `hey`, `hi`, and `hello` return:

```json
{
  "answer": "Hello. What is on your mind?"
}
```

## Checks

```bash
pnpm run typecheck
uv run python -m py_compile services/aurelius_ai/main.py
```

## Security

- API keys belong in environment variables or a secret manager.
- Do not commit `.env` files or real credentials.
- Pinecone and Tavily are not part of the active generation flow yet.