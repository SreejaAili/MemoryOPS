# Building an Agent That Learns from Every Interaction with Hindsight

Picture the 3 a.m. version of this. An alert fires, you open your incident response tool, and the assistant says: *"This looks like INC-214: connection pool exhaustion, fixed by raising max_connections."* You go looking for INC-214 in your issue tracker. It doesn't exist.

That failure mode is why I built MemoryOps. To be clear, INC-214 is a hypothetical example of an LLM hallucination, not a captured model response: seed data in this repository spans INC-101 through INC-116, so any citation of INC-214 is invented. During an outage, a fabricated citation is worse than a generic answer because a citation reads like verified evidence. You either burn minutes verifying it, or you trust it and apply a fix that was never tested.

I reduced this risk by building persistent operational memory into the incident response lifecycle. Here is how the architecture and implementation work.

---

## 1. What MemoryOps Does

MemoryOps is an AI-powered incident response platform for DevOps and SRE teams. The frontend is built with React 19, Vite, and Tailwind CSS (providing Dashboard, Incident Creation, Investigation, and Memory Explorer views). The backend is FastAPI with SQLAlchemy over SQLite (`data/incidentiq.db`) as the system of record for live incident records.

Hindsight acts as the long-term persistent memory layer for resolved incident learnings, while Groq Cloud LLM (`openai/gpt-oss-20b`) serves as the AI reasoning engine. Nothing executes actions autonomously; the human engineer remains in full control.

```
React UI ─► FastAPI ─► SQLite     (incidents, ai_recommendation)
              ├──────► Hindsight  (RETAIN on resolve, RECALL on analyze, REFLECT)
              └──────► Groq LLM   (current incident + recalled memories)
```

![MemoryOps system architecture](images/architecture.png)
*MemoryOps system architecture showing the React frontend, FastAPI backend, SQLite database of record, Hindsight persistent memory layer, and Groq LLM reasoning engine.*

The workflow begins when an engineer declares an incident via `POST /api/v1/incidents`. Navigating to the investigation page invokes `POST /api/v1/incidents/{incident_id}/analyze`. The backend recalls relevant past incidents from Hindsight, passes them alongside current symptoms to Groq LLM, and presents evidence-backed recommendations. When the incident is resolved via `POST /api/v1/incidents/{incident_id}/resolve`, its verified learnings are retained in Hindsight.

---

## 2. Hindsight Memory Lifecycle: RETAIN, RECALL, and REFLECT

Instead of passing massive unstructured log streams to an LLM, MemoryOps uses [Hindsight](https://hindsight.vectorize.io/) to store structured experience documents. SQLite answers *"what is happening now,"* while Hindsight answers *"what did we learn from past outages."*

```
Incident Created ──► Investigation ──► Root Cause & Resolution ──► Hindsight RETAIN ──► Future RECALL
```

### RETAIN Runs Only on Verified Resolution

An incident is never retained when merely created, during unresolved investigation, or from AI guesses. When an engineer resolves an incident, `HindsightService.aretain_incident()` stores a complete experience document containing ID, service, error, symptoms, severity, root cause, resolution steps, and post-mortem:

```python
response = await client.aretain(
    bank_id=self.bank_id,
    content=content_text,
    metadata=metadata,
    document_id=incident_id,
    tags=[service, severity, outcome],
)
```

To guarantee idempotent retention, `document_id` is set deterministically to `incident.id` (`INC-101`). The `Incident` database model tracks a `memory_retained` boolean flag, which is flipped to `True` only after Hindsight confirms successful retention.

### RECALL Runs During Incident Investigation

When an investigation is triggered, MemoryOps constructs a semantic search query from the current incident:

```python
recall_query = f"Service: {incident.service} | Error: {incident.error} | Symptoms: {incident.symptoms}"
recalled = await hindsight_service.arecall_memories(query=recall_query, max_tokens=2048)
```

The router parses returned memories using `parse_memory_item()` and supplies them as grounded context to Groq.

### REFLECT Synthesizes Patterns

MemoryOps also provides `POST /api/v1/incidents/reflect` and a Memory Explorer tab so engineers can query cross-incident patterns across historical outages.

![MemoryOps memory explorer view](images/memory-explorer.png)
*Memory Explorer view demonstrating direct Hindsight RECALL vector search and REFLECT pattern synthesis.*

---

## 3. Separating Evidence from Analysis

In the investigation API response (`IncidentInvestigationResponse`), historical evidence and AI reasoning are kept strictly separate:
- `similar_historical_incidents`: Populated directly from Hindsight recalled memories.
- `ai_analysis`: Contains the structured JSON output returned by Groq LLM.

The UI renders these inputs as distinct pipeline stages so the engineer can evaluate raw facts independently from LLM reasoning.

![MemoryOps investigation view](images/investigation-view.png)
*MemoryOps investigation view displaying the step-by-step pipeline, explicit memory status banner, recalled historical memories, and Groq AI recommendation.*

---

## 4. Explicit Memory Status: No Fake Fallback Memories

MemoryOps explicitly exposes three distinct memory states in the API and UI:

1. **`memory_status = "ok"`**: Hindsight successfully recalled relevant memories (`✓ Historical Memory Used`).
2. **`memory_status = "empty"`**: Hindsight searched but found no matching memories (`○ No Relevant Historical Memory`).
3. **`memory_status = "unavailable"`**: Hindsight service was offline or unconfigured (`⚠ Historical Memory Unavailable`).

If Hindsight is unavailable, MemoryOps **never** queries SQLite incident records and labels them as Hindsight memories. Local SQLite records are system-of-record entries and must never be disguised as vector-recalled memories.

---

## 5. Before-and-After Example

### Before (Hypothetical LLM Hallucination)
> *Probable cause:* Connection pool exhaustion. Matches INC-214, resolved by increasing max_connections to 100.

### Stored Memory (Real Seed Data for INC-101 in `seed.py`)
- **Service:** Payment API
- **Error:** Database connection timeout
- **Symptoms:** High HTTP 504 Gateway Timeouts on /v1/charge endpoint, elevated API latency
- **Root Cause:** Connection pool exhaustion due to leaked unclosed DB sessions during traffic surge
- **Resolution:** Increased connection pool size from 20 to 100 and deployed hotfix for session leak
- **Post-mortem:** Connection pool configuration was insufficient for observed traffic surges. Added automated connection pool utilization alerting at 80% capacity.

### After (Verified Integration Test Response Structure)

```json
{
  "probable_root_cause": "Database connection pool exhaustion",
  "recommended_action": "Increase max_connections parameter from 20 to 100 and deploy session leak hotfix",
  "confidence": "high",
  "reasoning": "INC-101 historical incident showed identical Gateway Timeout symptoms and was resolved by expanding the pool.",
  "supporting_historical_incidents": [
    "INC-101: Payment API database connection timeout"
  ]
}
```

System prompt instructions direct Groq to cite only actual recalled memories. However, prompt instructions are guidance rather than mathematical guarantees; application-side validation ensures that missing memories are explicitly reported.

---

## 6. Failure Handling and Graceful Degradation

When external services fail, MemoryOps degrades gracefully without crashing.

If Hindsight returns an error or HTTP 402 insufficient credits, the backend sets `memory_status = "unavailable"`, clears `similar_historical_incidents`, and continues investigation using current incident details alone. If Groq LLM is unconfigured, `_fallback_analysis()` applies rule-based heuristic analysis and sets `analysis_status = "fallback"` with `confidence = "low"`.

![MemoryOps graceful degradation](images/graceful-degradation.png)
*MemoryOps graceful degradation view displaying explicit memory status warning and low-confidence fallback heuristic reasoning when external services are unavailable.*

---

## 7. Engineering Lessons and Limitations

1. **Persistent Memory vs Weight Fine-Tuning**: "Learning" in MemoryOps refers to persistent operational memory through Hindsight RAG, not altering LLM weights.
2. **System of Record vs Memory Bank**: SQLite records state ("what happened"), while Hindsight stores reusable operational experience ("what worked").
3. **Explicit State Over Silent Fallbacks**: Disguising dependency failures with mock memories destroys user trust during active production outages.
4. **Idempotent Retention**: Using deterministic document IDs (`document_id = incident.id`) ensures retries do not pollute vector banks with duplicate entries.
