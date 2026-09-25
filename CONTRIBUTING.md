# Contributing to EventOps

First off, thank you for considering contributing to EventOps! It's people like you that make this tool great.

## Development Workflow

### 1. Branch Naming Convention
Please create a new branch from `test` (or `main`) before starting your work. Use the following prefixes:
- `feat/`: A new feature (e.g. `feat/guest-management`)
- `fix/`: A bug fix (e.g. `fix/login-crash`)
- `chore/`: Routine tasks, dependency updates, repo management
- `docs/`: Documentation updates

### 2. Setting Up the Local Environment

**Backend (Django):**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python manage.py migrate
```

**Frontend (React/Vite):**
```bash
cd frontend
npm install
npm run dev
```

### 3. Pull Request Process
1. Make sure all your code passes linting (`ruff check backend/` and `npm run lint`).
2. Ensure you have written or updated necessary unit and integration tests.
3. Push your branch to GitHub and open a Pull Request against the `test` branch.
4. Fill out the Pull Request template comprehensively, linking the relevant Issue.
5. A maintainer will review your code.

### 4. Code Standards
- We strictly enforce tenant isolation and RBAC. **Never** trust client-supplied organization IDs.
- For Python code, we use `ruff`.
- For TypeScript, we use strict typing, ESLint, and Prettier.

### 5. Reporting Bugs
Use the GitHub Issues tab to report bugs. Please use the Bug Report template provided.
