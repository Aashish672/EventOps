# EventOps

**AI-powered, multi-tenant event operations platform — built for $0.**

EventOps centralizes end-to-end event operations (vendors, budgets, timelines, guests, contracts) governed by five specialized LangGraph AI agents that evaluate risks and propose structured solutions without ever writing directly to the database.

---

## Architecture Overview

- **Frontend**: React 18, TypeScript, Vite, TanStack Query, modern responsive design tokens.
- **Backend**: Python 3.13, Django 5.1, Django REST Framework.
- **Database**: PostgreSQL with Row-Level Security (RLS) keyed on `organization_id`.
- **Background Tasks & Caching**: Celery with Redis broker.
- **AI Agent Orchestration**: LangGraph state graph with single-write-path human-in-the-loop review.
- **Infrastructure**: $0/month free-tier architecture (Supabase, Groq, Gemini 1.5 Flash, Vercel/Render).

---

## Monorepo Structure

```
EventOps/
├── .agents/                      # AI assistant rules and workflows
│   ├── rules/eventops-engineering.md
│   └── workflows/implement-feature.md
├── .github/                      # CI/CD workflows and PR templates
│   ├── workflows/ci.yml
│   └── pull_request_template.md
├── backend/                      # Django + DRF API service
│   ├── apps/
│   │   └── core/                 # Health check, utilities, audit helpers
│   ├── config/                   # Django settings, URLs, ASGI/WSGI, Celery
│   ├── manage.py
│   ├── pytest.ini
│   ├── requirements.txt          # Core runtime dependencies
│   └── requirements-dev.txt      # Testing and linting tools
├── frontend/                     # React + TypeScript + Vite web app
│   ├── src/
│   │   ├── api/                  # API client & endpoints
│   │   ├── App.tsx               # Main dashboard & status check
│   │   ├── index.css             # Theme and design tokens
│   │   └── main.tsx              # Application entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docs/                         # Specifications & PRD
│   └── PRD.md
├── .dockerignore
├── .env.example                  # Environment configuration template
├── .gitignore                    # Monorepo gitignore
├── docker-compose.yml            # Local PostgreSQL 16 & Redis 7 services
└── README.md
```

---

## Prerequisites

- **Python**: 3.13+
- **Node.js**: 22+ (with `npm`)
- **Docker & Docker Compose**: For local PostgreSQL and Redis

---

## Quickstart Guide

### 1. Environment Setup
Copy the environment template to create your local `.env`:
```bash
cp .env.example .env
```

### 2. Start Local Backing Services (Docker)
Start PostgreSQL and Redis in the background:
```bash
docker compose up -d
```
Verify services are healthy:
```bash
docker compose ps
```

### 3. Backend Setup
Create and activate a Python virtual environment:
```bash
# Windows
python -m venv backend/.venv
.\backend\.venv\Scripts\activate

# macOS / Linux
python3 -m venv backend/.venv
source backend/.venv/bin/activate
```

Install backend dependencies:
```bash
pip install -r backend/requirements-dev.txt
```

Run Django system checks and migrations:
```bash
cd backend
python manage.py check
python manage.py migrate
```

Start the Django API server:
```bash
python manage.py runserver
```
Backend will be live at `http://127.0.0.1:8000/api/health/`.

### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Frontend will be live at `http://localhost:5173`.

---

## Running Tests & Quality Checks

### Backend Checks
```bash
# Run linter
ruff check backend/

# Run system checks
python backend/manage.py check

# Run test suite
pytest backend/
```

### Frontend Checks
```bash
cd frontend

# Linting
npm run lint

# TypeScript & build verification
npm run build
```

---

## Git & Branching Workflow

We adhere to a strict three-tier branching strategy:

1. **`main`**: Production / deployment-ready branch. Protected.
2. **`test`**: Integration branch. All features merge here first for automated testing.
3. **`feature/*` or `fix/*`**: Developer branches branched from `test`.

```
feature/my-feature ──(PR + CI Checks)──> test ──(Integration Verification)──> main (Production)
```

### PR Requirements
- All PRs must target `test` first.
- CI pipeline (`.github/workflows/ci.yml`) must pass completely.
- Respect tenant isolation (`organization_id`) on all queries.
- No direct database writes from AI agents (must use `apply_agent_proposal`).
