import sys
import uuid
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.seed import seed_incidents
from app.models import Incident

client = TestClient(app)

def test_1_creation_does_not_retain():
    """Requirement 1: Creating an incident does NOT retain it."""
    with patch("app.routers.incidents.hindsight_service.aretain_incident") as mock_retain:
        resp = client.post("/api/v1/incidents", json={
            "service": "Billing API",
            "error": "Gateway Timeout",
            "symptoms": "504 on payment webhook",
            "severity": "high",
            "outcome": "Open"
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["outcome"] == "Open"
        assert data["memory_retained"] is False
        mock_retain.assert_not_called()

def test_2_unresolved_incident_does_not_retain():
    """Requirement 2: Unresolved incident (e.g. PATCH to Investigating) does NOT retain it."""
    inc_id = f"INC-TEST-{uuid.uuid4().hex[:6].upper()}"
    client.post("/api/v1/incidents", json={
        "id": inc_id,
        "service": "Inventory Service",
        "error": "Stock mismatch",
        "symptoms": "Negative inventory balance",
        "severity": "medium",
        "outcome": "Open"
    })

    with patch("app.routers.incidents.hindsight_service.aretain_incident") as mock_retain:
        resp = client.patch(f"/api/v1/incidents/{inc_id}", json={
            "outcome": "Investigating",
            "symptoms": "Negative inventory balance detected across 3 shards"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["outcome"] == "Investigating"
        assert data["memory_retained"] is False
        mock_retain.assert_not_called()

def test_3_resolved_incident_retains_complete_experience():
    """Requirement 3: Resolved incident DOES retain its root cause, resolution steps, post-mortem, ID, service, outcome."""
    inc_id = f"INC-RES-{uuid.uuid4().hex[:6].upper()}"
    client.post("/api/v1/incidents", json={
        "id": inc_id,
        "service": "User API",
        "error": "Database deadlocks",
        "symptoms": "HTTP 500 spike during transaction commit",
        "severity": "high",
        "outcome": "Open"
    })

    with patch("app.routers.incidents.hindsight_service.aretain_incident") as mock_retain:
        mock_retain.return_value = {"success": True, "incident_id": inc_id}

        resp = client.post(f"/api/v1/incidents/{inc_id}/resolve", json={
            "root_cause": "Unordered SQL updates across user_profiles table causing circular lock waits",
            "resolution": "Enforced strict alphabetical lock ordering in ORM transaction handler",
            "post_mortem": "ORM batch update queries lacked lock ordering rules. Added CI database lint check for batch queries.",
            "outcome": "Resolved"
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data["outcome"] == "Resolved"
        assert data["memory_retained"] is True

        mock_retain.assert_called_once()
        kwargs = mock_retain.call_args.kwargs
        assert kwargs["incident_id"] == inc_id
        assert kwargs["service"] == "User API"
        assert kwargs["root_cause"] == "Unordered SQL updates across user_profiles table causing circular lock waits"
        assert kwargs["resolution"] == "Enforced strict alphabetical lock ordering in ORM transaction handler"
        assert kwargs["post_mortem"] == "ORM batch update queries lacked lock ordering rules. Added CI database lint check for batch queries."
        assert kwargs["outcome"] == "Resolved"

def test_4_recall_retrieves_historical_memory():
    """Requirement 4: Recall retrieves historical incident memory."""
    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall:
        mock_recall.return_value = {
            "success": True,
            "results": {
                "memories": [
                    {
                        "content": "Incident ID: INC-101\nService: Payment API\nError: Connection timeout\nRoot Cause: Pool exhaustion\nResolution: Expanded pool to 100\nPost-mortem: Added pool metrics alarm"
                    }
                ]
            }
        }

        resp = client.post("/api/v1/incidents/recall", json={
            "service": "Payment API",
            "error": "Connection timeout"
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["memory_status"] == "ok"
        assert len(data["memories"]) == 1
        assert data["memories"][0]["incident_id"] == "INC-101"
        assert data["memories"][0]["root_cause"] == "Pool exhaustion"
        assert data["memories"][0]["post_mortem"] == "Added pool metrics alarm"

def test_5_recalled_memories_passed_to_ai_prompt():
    """Requirement 5: Recalled historical incidents are passed to the AI prompt."""
    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall, \
         patch("app.routers.incidents.ai_incident_service.aanalyze_incident") as mock_analyze:

        recalled_data = {
            "success": True,
            "results": {
                "memories": [
                    {"content": "Incident ID: INC-101\nService: Payment API\nRoot Cause: Pool exhaustion"}
                ]
            }
        }
        mock_recall.return_value = recalled_data

        mock_analyze.return_value = {
            "success": True,
            "analysis_status": "success",
            "memory_status": "ok",
            "service": "Payment API",
            "error": "Timeout",
            "probable_root_cause": "Database connection pool exhaustion",
            "recommended_action": "Increase connection pool size",
            "confidence": "high",
            "reasoning": "INC-101 match",
            "supporting_historical_incidents": ["INC-101: Payment API database connection timeout"]
        }

        resp = client.post("/api/v1/incidents/INC-101/analyze")
        assert resp.status_code == 200
        mock_analyze.assert_called_once()
        kwargs = mock_analyze.call_args.kwargs
        assert kwargs["recalled_memories"] == recalled_data

def test_6_hindsight_returns_no_results_memory_status_empty():
    """Requirement 6: Hindsight returns no results -> memory_status = empty."""
    inc_id = f"INC-EMPTY-{uuid.uuid4().hex[:6].upper()}"
    client.post("/api/v1/incidents", json={
        "id": inc_id,
        "service": "New Microservice",
        "error": "Unique error",
        "symptoms": "Unique symptoms",
        "severity": "low",
        "outcome": "Open"
    })

    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall, \
         patch("app.routers.incidents.ai_incident_service.aanalyze_incident") as mock_analyze:

        mock_recall.return_value = {"success": True, "results": {"memories": []}}
        mock_analyze.return_value = {
            "success": True,
            "analysis_status": "success",
            "memory_status": "empty",
            "service": "New Microservice",
            "error": "Unique error",
            "probable_root_cause": "General code error",
            "recommended_action": "Check application logs",
            "confidence": "low",
            "reasoning": "No past memories found in Hindsight.",
            "supporting_historical_incidents": []
        }

        resp = client.post(f"/api/v1/incidents/{inc_id}/analyze")
        assert resp.status_code == 200
        data = resp.json()
        assert data["memory_status"] == "empty"
        assert len(data["similar_historical_incidents"]) == 0

def test_7_hindsight_raises_error_memory_status_unavailable():
    """Requirement 7: Hindsight raises an error -> memory_status = unavailable."""
    inc_id = "INC-101"
    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall, \
         patch("app.routers.incidents.ai_incident_service.aanalyze_incident") as mock_analyze:

        mock_recall.return_value = {"success": False, "error": "Connection refused"}
        mock_analyze.return_value = {
            "success": False,
            "analysis_status": "fallback",
            "memory_status": "unavailable",
            "service": "Payment API",
            "error": "Database connection timeout",
            "probable_root_cause": "Potential DB issue",
            "recommended_action": "Inspect DB connections",
            "confidence": "low",
            "reasoning": "Fallback rule applied because Hindsight memory was unavailable.",
            "supporting_historical_incidents": []
        }

        resp = client.post(f"/api/v1/incidents/{inc_id}/analyze")
        assert resp.status_code == 200
        data = resp.json()
        assert data["memory_status"] == "unavailable"
        assert len(data["similar_historical_incidents"]) == 0

def test_8_hindsight_failure_no_fake_sqlite_fallback():
    """Requirement 8: Hindsight failure must NOT cause SQLite incidents to be falsely labelled as Hindsight memories."""
    inc_id = "INC-101"
    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall, \
         patch("app.routers.incidents.ai_incident_service.aanalyze_incident") as mock_analyze:

        mock_recall.return_value = {"success": False, "error": "HTTP 500 internal hindsight error"}
        mock_analyze.return_value = {
            "success": False,
            "analysis_status": "fallback",
            "memory_status": "unavailable",
            "service": "Payment API",
            "error": "Timeout",
            "probable_root_cause": "Heuristic cause",
            "recommended_action": "Check logs",
            "confidence": "low",
            "reasoning": "Fallback reasoning",
            "supporting_historical_incidents": []
        }

        resp = client.post(f"/api/v1/incidents/{inc_id}/analyze")
        assert resp.status_code == 200
        data = resp.json()
        assert data["memory_status"] == "unavailable"
        # Verify similar_historical_incidents is strictly EMPTY and does NOT contain local DB records
        assert data["similar_historical_incidents"] == []
        assert data["recalled_memories_details"] == []

def test_9_groq_failure_visible_in_analysis_status():
    """Requirement 9: Groq failure must be visible through analysis_status='fallback'."""
    inc_id = "INC-101"
    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall, \
         patch("app.routers.incidents.ai_incident_service.aanalyze_incident") as mock_analyze:

        mock_recall.return_value = {"success": True, "results": {"memories": []}}
        # Groq analysis failed / fallback used
        mock_analyze.return_value = {
            "success": False,
            "analysis_status": "fallback",
            "memory_status": "empty",
            "service": "Payment API",
            "error": "Timeout",
            "probable_root_cause": "Heuristic cause",
            "recommended_action": "Check service logs",
            "confidence": "low",
            "reasoning": "Fallback heuristic applied because Groq API Key was unconfigured.",
            "supporting_historical_incidents": []
        }

        resp = client.post(f"/api/v1/incidents/{inc_id}/analyze")
        assert resp.status_code == 200
        data = resp.json()
        assert data["analysis_status"] == "fallback"

def test_10_supporting_incidents_only_from_hindsight():
    """Requirement 10: Supporting historical incidents must only contain actual Hindsight results."""
    inc_id = "INC-101"
    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall, \
         patch("app.routers.incidents.ai_incident_service.aanalyze_incident") as mock_analyze:

        mock_recall.return_value = {"success": False, "error": "Hindsight unavailable"}
        mock_analyze.return_value = {
            "success": False,
            "analysis_status": "fallback",
            "memory_status": "unavailable",
            "service": "Payment API",
            "error": "Timeout",
            "probable_root_cause": "Heuristic cause",
            "recommended_action": "Check service logs",
            "confidence": "low",
            "reasoning": "Fallback heuristic applied",
            "supporting_historical_incidents": []
        }

        resp = client.post(f"/api/v1/incidents/{inc_id}/analyze")
        assert resp.status_code == 200
        data = resp.json()
        # Verify supporting_historical_incidents inside ai_analysis is empty when recall fails
        assert data["ai_analysis"]["supporting_historical_incidents"] == []

def test_11_seeded_resolved_incidents_retained_and_recalled():
    """Requirement 11: Seeded resolved incidents can be retained and subsequently recalled."""
    db = SessionLocal()
    try:
        with patch("app.seed.hindsight_service.aretain_incident") as mock_retain:
            mock_retain.return_value = {"success": True, "incident_id": "INC-101"}
            seed_incidents(db)
            inc_101 = db.query(Incident).filter(Incident.id == "INC-101").first()
            assert inc_101 is not None
            assert inc_101.outcome == "Resolved"
            assert inc_101.post_mortem is not None
    finally:
        db.close()

def test_12_retention_retry_deterministic_and_idempotent():
    """Requirement 12: Retention retry does not create duplicate memory state and uses deterministic ID."""
    inc_id = f"INC-RETRY-{uuid.uuid4().hex[:6].upper()}"
    client.post("/api/v1/incidents", json={
        "id": inc_id,
        "service": "Cache Service",
        "error": "Memory leak",
        "symptoms": "Redis eviction rate high",
        "severity": "medium",
        "outcome": "Open"
    })

    # Resolve incident but simulate retain failure
    with patch("app.routers.incidents.hindsight_service.aretain_incident") as mock_retain:
        mock_retain.return_value = {"success": False, "error": "Network timeout"}
        resp = client.post(f"/api/v1/incidents/{inc_id}/resolve", json={
            "root_cause": "Memory leak in LRU cache",
            "resolution": "Upgraded Redis cluster engine version",
            "post_mortem": "Added memory fragmentation alert",
            "outcome": "Resolved"
        })
        assert resp.status_code == 200
        assert resp.json()["memory_retained"] is False

    # Retry retention via POST /api/v1/incidents/{id}/retain
    with patch("app.routers.incidents.hindsight_service.aretain_incident") as mock_retain_retry:
        mock_retain_retry.return_value = {"success": True, "incident_id": inc_id}
        retry_resp = client.post(f"/api/v1/incidents/{inc_id}/retain")
        assert retry_resp.status_code == 200
        retry_data = retry_resp.json()
        assert retry_data["success"] is True
        assert retry_data["incident"]["memory_retained"] is True

        # Verify deterministic document_id = inc_id was passed
        mock_retain_retry.assert_called_once()
        assert mock_retain_retry.call_args.kwargs["incident_id"] == inc_id
