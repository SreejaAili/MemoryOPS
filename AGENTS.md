# AGENTS.md

Instructions for AI Agents working on MemoryOps.

## Project Overview

MemoryOps is an AI-powered incident response assistant designed for DevOps/SRE engineers.

## Codebase Guidelines & Standards

- **Frontend**:
  - Located in `frontend/`.
  - Built with React, Vite, and Tailwind CSS.
  - Follow modular component structure and clean functional React paradigms.
  - Run `npm run build` or frontend tests to verify UI changes.

- **Backend**:
  - Located in `backend/`.
  - Built with Python 3, FastAPI, SQLAlchemy, `hindsight-client`, and `groq`.
  - Service logic resides in `backend/app/ai_service.py` and `backend/app/hindsight_service.py`.
  - Route handlers reside in `backend/app/routers/incidents.py`.
  - Ensure database interactions use SQLAlchemy sessions cleanly.
  - Run `pytest` to verify backend routes, database connections, investigation workflows, and AI/memory integrations.

- **Investigation Workflow**:
  - Endpoint `POST /api/incidents/{incident_id}/analyze` orchestrates:
    Incident -> Hindsight RECALL -> Groq AI Analysis -> Recommendation
  - Returns `current_incident`, `similar_historical_incidents`, `previous_root_causes`, `previous_resolutions`, `ai_analysis`, `recommended_action`, and `explanation`.

- **Resolution Workflow**:
  - Endpoint `POST /api/incidents/{incident_id}/resolve` marks incident resolved and invokes Hindsight RETAIN to store learnings for future recall.

- **Data**:
  - Persistent SQLite database files reside in `data/`. Do not commit `.db` binary files to git.

- **Testing & Verification**:
  - Always verify that both frontend builds and backend tests pass before completing tasks.
