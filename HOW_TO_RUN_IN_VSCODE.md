# How to Run Aurelius in VS Code

This project runs as three local services:

```text
React frontend → Express API → FastAPI/LangGraph AI service → Groq
```

## 1. Install prerequisites

Install these tools:

- Node.js 24+
- pnpm
- Python 3.11+
- uv
- VS Code

Check that they are available:

```bash
node --version
pnpm --version
python --version
uv --version
```

## 2. Open the project

1. Download and unzip the project archive.
2. Open the extracted folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Make sure the terminal is at the project root, where `package.json` and `pyproject.toml` are located.

## 3. Install dependencies

From the project root:

```bash
pnpm install
uv sync
```

If you prefer pip instead of uv:

```bash
python -m venv .venv
```

Activate the virtual environment:

### macOS/Linux

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

### Windows PowerShell

```powershell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 4. Configure the Groq key

The AI service needs a Groq API key. Do not place the real key in GitHub or commit it to the project.

### macOS/Linux

Run this in the AI service terminal:

```bash
export GROQ_API_KEY="your-groq-api-key"
export GROQ_MODEL="openai/gpt-oss-120b"
```

### Windows PowerShell

```powershell
$env:GROQ_API_KEY = "your-groq-api-key"
$env:GROQ_MODEL = "openai/gpt-oss-120b"
```

Keep this terminal open. The environment variables apply to terminals started from that session.

## 5. Start the three services

Open three VS Code terminals. Start them in this order.

### Terminal 1 — FastAPI AI service

macOS/Linux:

```bash
uv run uvicorn services.aurelius_ai.main:app --host 0.0.0.0 --port 8000
```

Windows PowerShell:

```powershell
uv run uvicorn services.aurelius_ai.main:app --host 0.0.0.0 --port 8000
```

Keep this terminal running.

### Terminal 2 — Express API

macOS/Linux:

```bash
PORT=8080 pnpm --filter @workspace/api-server run dev
```

Windows PowerShell:

```powershell
$env:PORT = "8080"
pnpm --filter @workspace/api-server run dev
```

Keep this terminal running.

### Terminal 3 — React frontend

macOS/Linux:

```bash
PORT=5173 BASE_PATH=/ API_PROXY_TARGET=http://localhost:8080 pnpm --filter @workspace/aurelius-chat run dev
```

Windows PowerShell:

```powershell
$env:PORT = "5173"
$env:BASE_PATH = "/"
$env:API_PROXY_TARGET = "http://localhost:8080"
pnpm --filter @workspace/aurelius-chat run dev
```

## 6. Open the app

Open this address in your browser:

```text
http://localhost:5173
```

## 7. Check that services are healthy

### macOS/Linux

```bash
curl http://localhost:8000/healthz
curl http://localhost:8080/api/healthz
```

Expected responses:

```json
{"status":"ok","orchestration":"langgraph"}
```

and:

```json
{"status":"ok"}
```

### Windows PowerShell

```powershell
Invoke-RestMethod http://localhost:8000/healthz
Invoke-RestMethod http://localhost:8080/api/healthz
```

## 8. Test a counsel request

### macOS/Linux

```bash
curl -X POST http://localhost:8080/api/counsel \
  -H "Content-Type: application/json" \
  -d '{"question":"I keep worrying about tomorrow.","history":[]}'
```

### Windows PowerShell

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/counsel `
  -ContentType "application/json" `
  -Body '{"question":"I keep worrying about tomorrow.","history":[]}'
```

Casual greetings such as `hey` intentionally return a short response:

```text
Hello. What is on your mind?
```

## 9. Run checks

TypeScript checks:

```bash
pnpm run typecheck
```

Python syntax check:

```bash
uv run python -m py_compile services/aurelius_ai/main.py
```

## Troubleshooting

### `GROQ_API_KEY is not configured`

Set the key again in the same terminal where you start the FastAPI service.

### Port already in use

Stop the process using the port, or use another port and update the related environment variable:

```bash
lsof -i :8000
lsof -i :8080
lsof -i :5173
```

### Frontend loads but questions fail

Confirm all three services are running. The frontend must point to the Express API through:

```text
API_PROXY_TARGET=http://localhost:8080
```

### GitHub security

Before pushing the project:

- Never commit a real Groq key.
- Never commit `.env` files.
- Keep secrets in VS Code environment variables, GitHub Actions secrets, or a deployment secret manager.