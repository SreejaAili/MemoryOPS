import sys
import uuid
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from unittest.mock import MagicMock, AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_investigate_similar_known_incident():
    """Test 1: Similar known incident returns historical memories, previous root causes, resolutions, and AI recommendation."""
    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall, \
         patch("app.routers.incidents.ai_incident_service.aanalyze_incident") as mock_analyze:

        mock_recall.return_value = {
            "success": True,
            "results": {
                "memories": [
                    {
                        "content": "Incident ID: INC-101\nService: Payment API\nError: Database connection timeout\nRoot Cause: Connection pool exhaustion\nResolution: Increased connection pool size from 20 to 100"
                    }
                ]
            }
        }

        mock_analyze.return_value = {
            "success": True,
            "probable_root_cause": "Connection pool exhaustion under load",
            "recommended_action": "Increase database connection pool size to 100",
            "confidence": "high",
            "reasoning": "Historical evidence INC-101 matches payment service timeout symptoms.",
            "supporting_historical_incidents": ["INC-101: Payment API database connection timeout"]
        }

        response = client.post("/api/incidents/INC-101/analyze")
        assert response.status_code == 200
        data = response.json()

        assert data["current_incident"]["id"] == "INC-101"
        assert len(data["similar_historical_incidents"]) == 1
        assert "Connection pool exhaustion" in data["previous_root_causes"]
        assert "Increased connection pool size from 20 to 100" in data["previous_resolutions"]
        assert data["recommended_action"] == "Increase database connection pool size to 100"
        assert "INC-101" in data["explanation"] or "Historical evidence" in data["explanation"]
        assert data["recall_status"] == "success"
        assert data["recall_source"] == "hindsight"

def test_investigate_new_unrelated_incident():
    """Test 2: New unrelated incident handles empty historical memories gracefully."""
    inc_id = f"INC-NEW-{uuid.uuid4().hex[:6].upper()}"
    create_resp = client.post("/api/v1/incidents", json={
        "id": inc_id,
        "service": "Quantum Compute Engine",
        "error": "Qubit decoherence anomaly",
        "symptoms": "Superposition state collapse during execution"
    })
    assert create_resp.status_code == 201

    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall, \
         patch("app.routers.incidents.ai_incident_service.aanalyze_incident") as mock_analyze:

        mock_recall.return_value = {"success": True, "results": {"memories": []}}
        mock_analyze.return_value = {
            "success": True,
            "probable_root_cause": "Thermal fluctuations in cryostat",
            "recommended_action": "Check dilution refrigerator temperature logs",
            "confidence": "low",
            "reasoning": "No matching historical incidents found in Hindsight.",
            "supporting_historical_incidents": []
        }

        response = client.post(f"/api/incidents/{inc_id}/analyze")
        assert response.status_code == 200
        data = response.json()

        assert data["current_incident"]["id"] == inc_id
        assert data["recommended_action"] == "Check dilution refrigerator temperature logs"
        assert data["recall_status"] == "empty"
        assert data["recall_source"] == "hindsight"
        assert len(data["similar_historical_incidents"]) == 0
        assert len(data["previous_root_causes"]) == 0
        assert len(data["previous_resolutions"]) == 0

def test_investigate_hindsight_failure_fallback():
    """Test 4: Investigation handles Hindsight recall service failure gracefully with recall_status='failed'."""
    inc_id = "INC-101"
    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall, \
         patch("app.routers.incidents.ai_incident_service.aanalyze_incident") as mock_analyze:

        # Simulate Hindsight service error (e.g. HTTP 402, 401, or offline)
        mock_recall.return_value = {"success": False, "error": "Insufficient credits"}
        mock_analyze.return_value = {
            "success": False,
            "probable_root_cause": "Potential issue in service Payment API",
            "recommended_action": "Check logs and metrics for Payment API",
            "confidence": "low",
            "reasoning": "Fallback rule-based heuristic applied because AI analysis was unavailable.",
            "supporting_historical_incidents": []
        }

        response = client.post(f"/api/incidents/{inc_id}/analyze")
        assert response.status_code == 200
        data = response.json()

        assert data["current_incident"]["id"] == inc_id
        assert data["recall_status"] == "failed"
        assert data["recall_source"] == "hindsight_error"
        assert len(data["similar_historical_incidents"]) == 0
        assert len(data["previous_root_causes"]) == 0
        assert len(data["previous_resolutions"]) == 0

def test_resolved_incident_retention_workflow():
    """Test 3: Resolving an incident triggers Hindsight RETAIN so experience can be recalled in future."""
    create_resp = client.post("/api/v1/incidents", json={
        "service": "Log Ingestion Service",
        "error": "Disk buffer full",
        "symptoms": "Log tailing dropped messages"
    })
    inc_id = create_resp.json()["id"]

    with patch("app.routers.incidents.hindsight_service.aretain_incident") as mock_retain:
        mock_retain.return_value = {"success": True, "incident_id": inc_id}

        resolve_resp = client.post(f"/api/incidents/{inc_id}/resolve", json={
            "root_cause": "Disk partition quota exceeded by uncompressed log files",
            "resolution": "Enabled logrotate gzip compression and expanded partition",
            "outcome": "Resolved"
        })

        assert resolve_resp.status_code == 200
        resolved_data = resolve_resp.json()
        assert resolved_data["outcome"] == "Resolved"
        assert resolved_data["root_cause"] == "Disk partition quota exceeded by uncompressed log files"

        # Verify Hindsight RETAIN was invoked with the resolution experience
        mock_retain.assert_called_once()
        kwargs = mock_retain.call_args.kwargs
        assert kwargs["incident_id"] == inc_id
        assert kwargs["service"] == "Log Ingestion Service"
        assert kwargs["root_cause"] == "Disk partition quota exceeded by uncompressed log files"
        assert kwargs["resolution"] == "Enabled logrotate gzip compression and expanded partition"
        assert kwargs["outcome"] == "Resolved"
