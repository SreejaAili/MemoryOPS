# MEMORYOPS

> **AI Incident Response That Learns From Every Production Incident**

**MemoryOps** is an AI-powered incident response platform for DevOps and SRE teams. It learns from previous production incidents using persistent memory, recalls relevant past incidents during new investigations, and provides evidence-backed recommendations to help engineers diagnose and resolve incidents faster.

---

## 1. Real-World Problem

During major service outages, DevOps and SRE engineers face intense pressure:
- **Alert Fatigue & Fragmented Information**: Telemetry alerts, error logs, and stack traces arrive fragmented across monitoring systems.
- **Lost Organizational Memory**: Solutions to past production incidents are often buried in closed Slack threads, obscure post-mortems, or lost when senior engineers leave.
- **Repeat Outages**: On-call engineers frequently re-investigate root causes that were already solved in prior incidents on different microservices or environments.
- **Hallucinated Recommendations**: Standard off-the-shelf LLMs lack organizational context and often suggest generic or dangerous remediation steps.

---

## 2. MemoryOps Solution

MemoryOps provides a centralized, memory-augmented incident response workspace:
1. **Persistent Memory via Hindsight**: Automatically retains verified incident learnings (symptoms, root causes, and resolutions) as the persistent memory layer.
2. **Semantic Memory Recall**: When a new incident occurs, MemoryOps queries Hindsight using semantic search to pull relevant historical incidents—even if the error text is not verbatim identical.
3. **Grounded AI Reasoning via Groq**: Groq AI acts as the AI reasoning layer, synthesizing current incident symptoms with recalled historical memories to recommend concrete remediation actions while clearly keeping historical evidence separated from AI-generated analysis.
4. **Human-in-the-Loop Control**: MemoryOps never executes actions autonomously. The engineer remains in complete control of the final incident-response decision.

---

## 3. Target Users & Workflow

### Target Users
- **Site Reliability Engineers (SREs)** responding to critical production alerts.
- **DevOps Engineers** managing infrastructure microservices.
- **On-Call Incident Commanders** coordinating multi-team incident mitigation.

### High-Level Incident Workflow
```
[ Alerts Fire / Incident Reported ]
                 │
                 ▼
     [ 1. Incident Creation ]
   (Service, Error, Symptoms, Severity)
                 │
                 ▼
    [ 2. Investigation Request ]
                 │
  ┌──────────────┴──────────────┐
  │  Hindsight Memory Bank       │  ──► Semantic Search (RECALL)
  └──────────────┬──────────────┘
                 │ (Historical Matches)
                 ▼
  ┌─────────────────────────────┐
  │  Groq AI Reasoning Engine   │  ──► Grounded Recommendation
  └──────────────┬──────────────┘
                 │
                 ▼
    [ 3. Human Engineer Review ]
   (Approves & Executes Remediation)
                 │
                 ▼
   [ 4. Incident Resolution ]
  (Document Root Cause & Fix)
                 │
                 ▼
   [ 5. Hindsight Memory RETAIN ]
  (Learnings saved for future incidents)
```

---

## 4. System Architecture

MemoryOps uses a decoupled monorepo architecture designed for maintainability and future enterprise extensions:

```
                  ┌─────────────────────────────────┐
                  │   React + Vite + Tailwind UI    │
                  │ (Dashboard, Investigation, Mem) │
                  └────────────────┬────────────────┘
                                   │ HTTP / JSON
                                   ▼
                  ┌─────────────────────────────────┐
                  │    FastAPI REST Backend         │
                  │   (API Gateway & Controller)    │
                  └────────┬───────────────┬────────┘
                           │               │
            SQLAlchemy ORM │               │ REST API
                           ▼               ▼
            ┌──────────────────┐  ┌──────────────────┐
            │  SQLite Storage  │  │ Hindsight Memory │
            │ (data/incidentiq)│  │ (RETAIN/RECALL)  │
            └──────────────────┘  └──────────────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │   Groq AI LLM    │
                                  │ (GPT-OSS 20B)    │
                                  └──────────────────┘
```

---

## 5. Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS (`@tailwindcss/vite`), Lucide React icons.
- **Backend API**: FastAPI, Python 3.12, Uvicorn, Pydantic v2.
- **Database**: SQLite with SQLAlchemy ORM.
- **Central Memory Engine**: Hindsight (via official `hindsight-client` Python SDK).
- **AI Reasoning Engine**: Groq Cloud LLM SDK (`groq` Python package with `openai/gpt-oss-20b`).

---

## 6. Hindsight Integration

MemoryOps relies on **Hindsight** as its long-term persistent memory layer. Instead of passing massive unstructured logs to an LLM, MemoryOps stores structured experience documents in Hindsight vector memory banks (`HINDSIGHT_BANK_ID`).

### Hindsight Integration Architecture
- `backend/app/hindsight_service.py` encapsulates the `Hindsight` client.
- Uses bank isolation, metadata tagging (`service`, `severity`, `outcome`), and document IDs.

---

## 7. Hindsight RETAIN Workflow

When an incident is resolved by an engineer via `POST /api/v1/incidents/{incident_id}/resolve`:
1. The incident state is updated in SQLite with `root_cause`, `resolution`, `outcome="Resolved"`, and `resolved_at` timestamp.
2. `HindsightService.retain_incident()` formats a structured memory document:
   ```
   Incident ID: INC-101
   Service: Payment API
   Error: Database connection timeout
   Symptoms: High HTTP 504 Gateway Timeouts on /v1/charge endpoint
   Severity: high
   Outcome: Resolved
   Root Cause: Connection pool exhaustion due to leaked unclosed DB sessions
   Resolution: Increased connection pool size from 20 to 100 and deployed hotfix
   ```
3. The experience is stored into the Hindsight memory bank, enabling all future incidents across the organization to learn from this resolution.

---

## 8. Hindsight RECALL Workflow

When an incident is analyzed via `POST /api/v1/incidents/{incident_id}/analyze`:
1. MemoryOps forms a semantic query: `Service: <service> | Error: <error> | Symptoms: <symptoms>`.
2. `HindsightService.recall_memories()` executes vector recall against Hindsight.
3. Relevant memories are returned along with matched historical root causes and resolutions.
4. Even if a new incident has slightly different wording (e.g., "Postgres connection pool exhausted" vs "Database connection timeout"), Hindsight recalls the matching past outage.

---

## 9. How Historical Incident Memory Influences Recommendations

1. **Context Injection**: Recalled Hindsight memories are injected directly into the Groq AI prompt as grounded evidence.
2. **Anti-Hallucination Guardrails**: Groq AI is strictly instructed to prioritize solutions that succeeded in past incidents over generic advice.
3. **Evidence Attribution**: The AI output explicitly lists `supporting_historical_incidents` so engineers can verify *why* a specific action was recommended.
4. **Uncertainty Disclosure**: If Hindsight returns no matching memories, the system lowers the confidence rating (`low`) and explicitly informs the user that no prior precedent was found.

---

## 10. Groq Integration

MemoryOps uses Groq's high-speed inference engine (`openai/gpt-oss-20b` model) as its AI reasoning layer, implemented in `backend/app/ai_service.py`:
- Formats structured system prompts with strict JSON output schemas.
- Parses JSON responses containing: `probable_root_cause`, `recommended_action`, `confidence`, `reasoning`, and `supporting_historical_incidents`.
- Features fallback mechanisms: if `GROQ_API_KEY` is not provided or API limits are reached, the service falls back gracefully without breaking the UI.

---

## 11. SQLite & Incident Persistence

- SQLite provides zero-config relational storage for live incident records (`data/incidentiq.db`).
- Tables and schema definitions are handled via SQLAlchemy in `backend/app/models.py`.
- Seed data (`backend/app/seed.py`) automatically initializes 6 realistic DevOps incidents on backend startup and retains them in Hindsight.

---

## 12. API Endpoints

### Health & Monitoring
- `GET /api/v1/health`: Service and database health check.

### Incident Management
- `GET /api/v1/incidents`: List all incidents (supports filtering by `service`, `severity`, `outcome`).
- `POST /api/v1/incidents`: Create a new incident.
- `GET /api/v1/incidents/{incident_id}`: Get incident details.
- `PATCH /api/v1/incidents/{incident_id}`: Update incident details.
- `POST /api/v1/incidents/{incident_id}/resolve`: Resolve an incident (triggers Hindsight RETAIN).

### Memory & Investigation
- `POST /api/v1/incidents/{incident_id}/analyze`: Execute complete investigation workflow (DB -> Hindsight RECALL -> Groq AI).
- `POST /api/v1/incidents/recall`: Query Hindsight memory index directly.
- `POST /api/v1/incidents/reflect`: Synthesize cross-incident patterns.
- `POST /api/v1/incidents/analyze`: Analyze arbitrary symptom input without pre-existing DB record.

*(Legacy route aliases are also mounted at `/api/incidents/...` for backward compatibility).*

---

## 13. Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm

### 1. Repository Clone & Environment Setup
```bash
cp .env.example .env
```

### 2. Backend Installation & Run
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend API will run at `http://localhost:8000`. API docs available at `http://localhost:8000/docs`.

### 3. Frontend Installation & Run
```bash
cd frontend
npm install
npm run dev
```
Frontend UI will run at `http://localhost:5173`.

---

## 14. Environment Variables

Configured via `.env` in the root directory:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | SQLite connection string | `sqlite:///../data/incidentiq.db` |
| `HINDSIGHT_API_URL` | Hindsight service URL | `http://localhost:8888` |
| `HINDSIGHT_API_KEY` | Hindsight authentication API key | `""` |
| `HINDSIGHT_BANK_ID` | Hindsight memory bank name | `incidentiq` |
| `GROQ_API_KEY` | Groq Cloud API key | `""` |
| `GROQ_MODEL` | Groq LLM model name | `openai/gpt-oss-20b` |

---

## 15. Security & Safety Considerations

- **Secret Protection**: `.env` files and `.db` database binaries are excluded from version control via `.gitignore`.
- **No Direct Key Exposure**: API keys are accessed exclusively on the backend via environment variables.
- **Human-in-the-Loop Safeguard**: MemoryOps provides evidence-backed recommendations; it does not perform destructive infrastructure commands autonomously.
- **Data Sanitization**: Pydantic input validation prevents malformed payloads or injection attempts into database queries.

---

## 16. Example Real-World Incident Workflow

1. **Alert Received**: `Payment API` throws HTTP 504 Gateway Timeouts under load.
2. **Create Incident**: Engineer enters `Payment API` / `Database connection timeout` in MemoryOps.
3. **Run Investigation**: MemoryOps executes Hindsight RECALL and finds `INC-101` where a connection pool session leak was fixed by expanding pool size to 100.
4. **AI Recommendation**: Groq AI recommends inspecting active pool connections and increasing pool capacity.
5. **Human Action**: On-call engineer verifies connection metrics, applies hotfix, and marks incident resolved.
6. **Experience Retained**: Resolution details are retained in Hindsight for future on-call engineers.

---

## 17. Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── ai_service.py          # Groq AI analysis service
│   │   ├── config.py              # Pydantic environment configuration
│   │   ├── database.py            # SQLAlchemy database connection & session
│   │   ├── hindsight_service.py   # Hindsight RETAIN/RECALL/REFLECT service
│   │   ├── main.py                # FastAPI app initialization & CORS setup
│   │   ├── models.py              # SQLAlchemy ORM database models
│   │   ├── schemas.py             # Pydantic request/response schemas
│   │   ├── seed.py                # Seed incidents loader (INC-101 to INC-106)
│   │   └── routers/
│   │       └── incidents.py       # API route handlers
│   ├── tests/                     # Pytest suite (23 unit & integration tests)
│   └── requirements.txt           # Backend Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CreateIncident.jsx # Incident creation form view
│   │   │   ├── Dashboard.jsx      # Metrics overview & incident feed
│   │   │   ├── IncidentInvestigation.jsx # Investigation pipeline view
│   │   │   └── MemoryExplorer.jsx # Hindsight memory explorer & pattern analysis
│   │   ├── api.js                 # Axios API integration client
│   │   ├── App.jsx                # Layout & navigation controller
│   │   └── index.css              # Tailwind CSS styles
│   ├── package.json               # Frontend dependencies
│   └── vite.config.js             # Vite build configuration
├── data/                          # SQLite database directory (`incidentiq.db`)
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git exclusion rules
├── AGENTS.md                      # Instructions for AI agents
└── README.md                      # Complete project documentation
```

---

## 18. Current Limitations & Future Improvements

### Current Limitations
- **Local or Cloud Hindsight Instance Required for Full Vector RAG**: When Hindsight API is offline or unconfigured, MemoryOps gracefully falls back to querying resolved incidents stored in SQLite.
- **Single-Tenant Database**: Designed for single-team or small-organization deployment.

### Future Improvements
- **Multi-Tenant User Authentication**: Add JWT/OAuth2 role-based access control for enterprise SRE teams.
- **Integrations Framework**: Connect directly to PagerDuty, Opsgenie, Datadog, Prometheus, and Slack Webhooks.
- **Automated Post-Mortem Generator**: Export PDF / Markdown post-mortem reports summarizing the incident timeline and Hindsight learnings.
