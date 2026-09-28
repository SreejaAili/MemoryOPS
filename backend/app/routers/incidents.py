import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Incident
from app.schemas import (
    IncidentCreate,
    IncidentUpdate,
    IncidentResolve,
    IncidentResponse,
    MemoryRecallQuery,
    MemoryReflectQuery,
    IncidentAnalysisRequest,
    IncidentAnalysisResponse,
    IncidentInvestigationResponse,
)
from app.hindsight_service import hindsight_service
from app.ai_service import ai_incident_service

router = APIRouter(prefix="/api/v1/incidents", tags=["Incidents"])
legacy_router = APIRouter(prefix="/api/incidents", tags=["Incidents (Legacy Route)"])

def parse_memory_item(item: Any) -> Dict[str, Any]:
    """Helper to convert Hindsight memory result into structured dict."""
    if isinstance(item, dict):
        d = item
    elif hasattr(item, "model_dump"):
        d = item.model_dump()
    elif hasattr(item, "__dict__"):
        d = item.__dict__
    else:
        d = {"text": str(item)}

    text_content = d.get("text") or d.get("content") or str(d)

    # Parse structured fields from text if present
    incident_id = d.get("incident_id") or d.get("document_id") or ""
    service = d.get("service") or ""
    error = d.get("error") or ""
    symptoms = d.get("symptoms") or ""
    root_cause = d.get("root_cause") or ""
    resolution = d.get("resolution") or ""
    outcome = d.get("outcome") or "Resolved"
    date_str = d.get("created_at") or d.get("date") or ""

    lines = text_content.split("\n")
    for line in lines:
        line_clean = line.strip()
        if line_clean.startswith("Incident ID:"):
            incident_id = line_clean.replace("Incident ID:", "").strip()
        elif line_clean.startswith("Service:"):
            service = line_clean.replace("Service:", "").strip()
        elif line_clean.startswith("Error:"):
            error = line_clean.replace("Error:", "").strip()
        elif line_clean.startswith("Symptoms:"):
            symptoms = line_clean.replace("Symptoms:", "").strip()
        elif line_clean.startswith("Root Cause:"):
            root_cause = line_clean.replace("Root Cause:", "").strip()
        elif line_clean.startswith("Resolution:"):
            resolution = line_clean.replace("Resolution:", "").strip()
        elif line_clean.startswith("Outcome:"):
            outcome = line_clean.replace("Outcome:", "").strip()

    return {
        "incident_id": incident_id,
        "service": service,
        "error": error,
        "symptoms": symptoms,
        "root_cause": root_cause,
        "resolution": resolution,
        "outcome": outcome,
        "date": date_str,
        "raw_text": text_content,
    }


async def perform_investigation_workflow(incident: Incident, db: Session) -> IncidentInvestigationResponse:
    # 1. Hindsight RECALL (Async) - concise query, limited results
    recall_query = f"Service: {incident.service} | Error: {incident.error} | Symptoms: {incident.symptoms}"
    recalled = await hindsight_service.arecall_memories(query=recall_query, max_tokens=2048)

    similar_incidents: List[Dict[str, Any]] = []
    previous_root_causes: List[str] = []
    previous_resolutions: List[str] = []

    recall_status = "failed"
    recall_source = "sqlite_fallback"

    if recalled.get("success") and recalled.get("results") is not None:
        recall_source = "hindsight"
        results = recalled["results"]
        items = []
        if isinstance(results, dict):
            items = results.get("results", []) or results.get("memories", [])
        elif isinstance(results, list):
            items = results
        elif hasattr(results, "results"):
            items = getattr(results, "results") or []

        if len(items) > 0:
            recall_status = "success"
            # Limit recalled results to top 5 memories
            for item in items[:5]:
                parsed = parse_memory_item(item)
                similar_incidents.append(parsed)
                if parsed["root_cause"] and parsed["root_cause"] not in previous_root_causes:
                    previous_root_causes.append(parsed["root_cause"])
                if parsed["resolution"] and parsed["resolution"] not in previous_resolutions:
                    previous_resolutions.append(parsed["resolution"])
        else:
            recall_status = "empty"
    else:
        # Hindsight RECALL failed (e.g. 401, 402, network error, or offline)
        recall_status = "failed"
        recall_source = "hindsight_error"
        # Keep similar_incidents, previous_root_causes, and previous_resolutions empty
        # so local SQLite records are not falsely presented as "Hindsight Recalled" memories.

    # 2. Groq Analysis
    ai_res = await ai_incident_service.aanalyze_incident(
        service=incident.service,
        error=incident.error,
        symptoms=incident.symptoms,
        severity=incident.severity,
        recalled_memories=recalled,
    )

    recommended_action = ai_res.get("recommended_action", "Investigate service logs and system metrics.")
    explanation = ai_res.get("reasoning", "Analysis based on current symptoms and historical incident recall.")

    # Persist the AI recommendation and probable root cause to database if missing or updated
    if recommended_action and incident.ai_recommendation != recommended_action:
        incident.ai_recommendation = recommended_action
        db.commit()
        db.refresh(incident)

    ai_analysis_summary = {
        "probable_root_cause": ai_res.get("probable_root_cause"),
        "confidence": ai_res.get("confidence"),
        "reasoning": ai_res.get("reasoning"),
        "supporting_historical_incidents": ai_res.get("supporting_historical_incidents", []),
    }

    return IncidentInvestigationResponse(
        current_incident=IncidentResponse.model_validate(incident),
        similar_historical_incidents=similar_incidents,
        previous_root_causes=previous_root_causes,
        previous_resolutions=previous_resolutions,
        ai_analysis=ai_analysis_summary,
        recommended_action=recommended_action,
        explanation=explanation,
        recall_status=recall_status,
        recall_source=recall_source,
    )

@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
@legacy_router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(incident_in: IncidentCreate, db: Session = Depends(get_db)):
    incident_id = incident_in.id
    if incident_id:
        existing = db.query(Incident).filter(Incident.id == incident_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Incident with ID '{incident_id}' already exists."
            )
    else:
        incident_id = f"INC-{uuid.uuid4().hex[:6].upper()}"

    now = datetime.now(timezone.utc)
    is_resolved = incident_in.outcome.lower() == "resolved"
    has_details = bool(incident_in.root_cause and incident_in.resolution)

    incident = Incident(
        id=incident_id,
        service=incident_in.service,
        error=incident_in.error,
        symptoms=incident_in.symptoms,
        severity=incident_in.severity,
        root_cause=incident_in.root_cause,
        resolution=incident_in.resolution,
        outcome=incident_in.outcome,
        created_at=now,
        resolved_at=now if is_resolved else None,
        memory_retained=False,
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)

    # RETAIN only if created as resolved WITH resolution details and not previously retained
    if is_resolved and has_details:
        retain_res = await hindsight_service.aretain_incident(
            incident_id=incident.id,
            service=incident.service,
            error=incident.error,
            symptoms=incident.symptoms,
            severity=incident.severity,
            root_cause=incident.root_cause,
            resolution=incident.resolution,
            outcome=incident.outcome,
        )
        if retain_res.get("success"):
            incident.memory_retained = True
            db.commit()
            db.refresh(incident)

    return incident

@router.get("", response_model=List[IncidentResponse])
@legacy_router.get("", response_model=List[IncidentResponse])
def get_incidents(
    service: Optional[str] = Query(None, description="Filter by service name"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    outcome: Optional[str] = Query(None, description="Filter by outcome/status"),
    db: Session = Depends(get_db),
):
    query = db.query(Incident)
    if service:
        query = query.filter(Incident.service.ilike(f"%{service}%"))
    if severity:
        query = query.filter(Incident.severity.ilike(severity))
    if outcome:
        query = query.filter(Incident.outcome.ilike(outcome))

    return query.order_by(Incident.created_at.desc()).all()

@router.post("/recall")
@legacy_router.post("/recall")
async def recall_similar_incidents(query_in: MemoryRecallQuery, db: Session = Depends(get_db)):
    search_parts = []
    if query_in.query:
        search_parts.append(query_in.query)
    if query_in.service:
        search_parts.append(f"Service: {query_in.service}")
    if query_in.error:
        search_parts.append(f"Error: {query_in.error}")
    if query_in.symptoms:
        search_parts.append(f"Symptoms: {query_in.symptoms}")

    full_query = " | ".join(search_parts) if search_parts else "historical incidents"

    result = await hindsight_service.arecall_memories(
        query=full_query,
        max_tokens=2048,
        tags=query_in.tags,
    )

    memories_parsed = []
    if result.get("success") and result.get("results") is not None:
        raw_res = result["results"]
        items = []
        if isinstance(raw_res, dict):
            items = raw_res.get("results", []) or raw_res.get("memories", [])
        elif isinstance(raw_res, list):
            items = raw_res
        for item in items[:5]:
            memories_parsed.append(parse_memory_item(item))
    else:
        db_resolved = db.query(Incident).filter(Incident.outcome.ilike("resolved")).all()
        for past in db_resolved[:5]:
            memories_parsed.append({
                "incident_id": past.id,
                "service": past.service,
                "error": past.error,
                "symptoms": past.symptoms,
                "root_cause": past.root_cause or "",
                "resolution": past.resolution or "",
                "outcome": past.outcome,
                "date": past.created_at.isoformat() if past.created_at else "",
                "raw_text": f"Incident ID: {past.id}\nService: {past.service}\nError: {past.error}\nRoot Cause: {past.root_cause}\nResolution: {past.resolution}",
            })

    return {
        "success": True,
        "query": full_query,
        "memories": memories_parsed,
        "results": result.get("results"),
        "raw_response": result,
    }

@router.post("/reflect")
@legacy_router.post("/reflect")
async def reflect_incident_patterns(query_in: MemoryReflectQuery, db: Session = Depends(get_db)):
    result = await hindsight_service.areflect_patterns(
        query=query_in.query,
        context=query_in.context,
    )
    return result

@router.post("/analyze", response_model=IncidentAnalysisResponse)
@legacy_router.post("/analyze", response_model=IncidentAnalysisResponse)
async def analyze_new_incident(analysis_in: IncidentAnalysisRequest):
    return await ai_incident_service.aanalyze_incident(
        service=analysis_in.service,
        error=analysis_in.error,
        symptoms=analysis_in.symptoms,
        severity=analysis_in.severity,
        custom_query=analysis_in.custom_query,
    )

@router.post("/{incident_id}/analyze", response_model=IncidentInvestigationResponse)
@legacy_router.post("/{incident_id}/analyze", response_model=IncidentInvestigationResponse)
async def analyze_existing_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    return await perform_investigation_workflow(incident, db)

@router.get("/{incident_id}", response_model=IncidentResponse)
@legacy_router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )
    return incident

@router.patch("/{incident_id}", response_model=IncidentResponse)
@legacy_router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: str,
    incident_in: IncidentUpdate,
    db: Session = Depends(get_db),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    update_data = incident_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(incident, field, value)

    if "outcome" in update_data and update_data["outcome"]:
        if update_data["outcome"].lower() == "resolved" and not incident.resolved_at:
            incident.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(incident)

    # RETAIN only if resolved, has resolution details, and NOT already retained
    if incident.outcome.lower() == "resolved" and incident.resolution and not incident.memory_retained:
        retain_res = await hindsight_service.aretain_incident(
            incident_id=incident.id,
            service=incident.service,
            error=incident.error,
            symptoms=incident.symptoms,
            severity=incident.severity,
            root_cause=incident.root_cause,
            resolution=incident.resolution,
            outcome=incident.outcome,
        )
        if retain_res.get("success"):
            incident.memory_retained = True
            db.commit()
            db.refresh(incident)

    return incident

@router.post("/{incident_id}/resolve", response_model=IncidentResponse)
@legacy_router.post("/{incident_id}/resolve", response_model=IncidentResponse)
async def resolve_incident(
    incident_id: str,
    resolve_in: IncidentResolve,
    db: Session = Depends(get_db),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    if resolve_in.root_cause:
        incident.root_cause = resolve_in.root_cause
    incident.resolution = resolve_in.resolution
    incident.outcome = resolve_in.outcome
    incident.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(incident)

    # RETAIN only if NOT already retained
    if not incident.memory_retained:
        retain_res = await hindsight_service.aretain_incident(
            incident_id=incident.id,
            service=incident.service,
            error=incident.error,
            symptoms=incident.symptoms,
            severity=incident.severity,
            root_cause=incident.root_cause,
            resolution=incident.resolution,
            outcome=incident.outcome,
        )
        if retain_res.get("success"):
            incident.memory_retained = True
            db.commit()
            db.refresh(incident)

    return incident
