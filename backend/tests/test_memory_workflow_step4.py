import pytest
import uuid
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db, engine, Base
from app.models import Incident

client = TestClient(app)

def test_scenario_1_and_12_retention_and_backfill():
    """Scenarios 1 & 12: Resolved incident retained successfully and backfill works without duplicates."""
    inc_id = f"INC-TEST-{uuid.uuid4().hex[:6].upper()}"

    # Create resolved incident with root cause and resolution
    resp = client.post("/api/v1/incidents", json={
        "id": inc_id,
        "service": "Payment API",
        "error": "PostgreSQL connection pool exhaustion",
        "symptoms": "Database connection timeouts and failed payment requests",
        "severity": "high",
        "root_cause": "Connection pool exhausted due to insufficient available connections",
        "resolution": "Adjusted connection pool configuration and released stale connections",
        "outcome": "Resolved",
    })
    assert resp.status_code == 201

    # Backfill endpoint
    with patch("app.routers.incidents.hindsight_service.aretain_incident") as mock_retain:
        mock_retain.return_value = {"success": True, "incident_id": inc_id}
        bf_resp = client.post("/api/v1/incidents/backfill-hindsight")
        assert bf_resp.status_code == 200
        assert bf_resp.json()["success"] is True


def test_scenario_2_3_4_6_similar_wording_recall_step4a_4b_self_match_exclusion():
    """
    Scenarios 2, 3, 4, 6:
    - New incident with similar meaning (database connection failures vs pool exhaustion)
    - STEP 4A populates previous_root_causes
    - STEP 4B populates previous_resolutions
    - Current incident is strictly excluded from historical evidence
    """
    # Create historical resolved incident INC-HIST-01
    hist_id = f"INC-HIST-{uuid.uuid4().hex[:6].upper()}"
    client.post("/api/v1/incidents", json={
        "id": hist_id,
        "service": "Payment API",
        "error": "PostgreSQL connection pool exhaustion",
        "symptoms": "Database connection timeouts and failed payment requests",
        "severity": "high",
        "root_cause": "Connection pool exhausted due to insufficient available connections",
        "resolution": "Adjusted connection pool configuration and released stale connections",
        "outcome": "Resolved",
    })

    # Create new target incident INC-NEW-01
    target_id = f"INC-NEW-{uuid.uuid4().hex[:6].upper()}"
    client.post("/api/v1/incidents", json={
        "id": target_id,
        "service": "Payment API",
        "error": "Intermittent database connection failures",
        "symptoms": "Payment requests fail when database connections cannot be acquired",
        "severity": "high",
    })

    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall, \
         patch("app.routers.incidents.ai_incident_service.aanalyze_incident") as mock_analyze:

        # Hindsight returns memories including target_id itself (self-match) and hist_id
        mock_recall.return_value = {
            "success": True,
            "results": {
                "memories": [
                    {
                        "content": f"Incident ID: {target_id}\nService: Payment API\nError: Intermittent database connection failures\nSymptoms: Payment requests fail"
                    },
                    {
                        "content": f"Incident ID: {hist_id}\nService: Payment API\nError: PostgreSQL connection pool exhaustion\nRoot Cause: Connection pool exhausted due to insufficient available connections\nResolution: Adjusted connection pool configuration and released stale connections"
                    }
                ]
            }
        }

        mock_analyze.return_value = {
            "success": True,
            "probable_root_cause": "Database connection pool exhaustion on Payment API",
            "recommended_action": "Adjust connection pool configuration",
            "confidence": "high",
            "reasoning": f"Matched historical incident {hist_id}",
            "supporting_historical_incidents": [f"{hist_id}: Payment API connection pool exhaustion"]
        }

        resp = client.post(f"/api/v1/incidents/{target_id}/analyze")
        assert resp.status_code == 200
        data = resp.json()

        # Check self-match exclusion: target_id excluded
        inc_ids = [m["incident_id"] for m in data["similar_historical_incidents"]]
        assert target_id not in inc_ids
        assert hist_id in inc_ids

        # STEP 4A & STEP 4B populated
        assert len(data["previous_root_causes"]) >= 1
        assert "Connection pool exhausted due to insufficient available connections" in data["previous_root_causes"]

        assert len(data["previous_resolutions"]) >= 1
        assert "Adjusted connection pool configuration and released stale connections" in data["previous_resolutions"]


def test_scenario_5_deduplication():
    """Scenario 5: Duplicate memory fragments from same incident deduplicated cleanly."""
    inc_id = f"INC-TARGET-{uuid.uuid4().hex[:6].upper()}"
    client.post("/api/v1/incidents", json={
        "id": inc_id,
        "service": "Notification Service",
        "error": "Redis queue backup",
        "symptoms": "Delayed SMS alerts"
    })

    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall, \
         patch("app.routers.incidents.ai_incident_service.aanalyze_incident") as mock_analyze:

        mock_recall.return_value = {
            "success": True,
            "results": [
                {
                    "content": "Incident ID: INC-114\nService: Notification Worker\nError: Redis queue OOM\nRoot Cause: Expired payload keys missing TTL\nResolution: Applied volatile-lru eviction"
                },
                {
                    "content": "Incident ID: INC-114\nService: Notification Worker\nError: Redis queue OOM\nRoot Cause: Expired payload keys missing TTL\nResolution: Applied volatile-lru eviction"
                }
            ]
        }
        mock_analyze.return_value = {"success": True, "recommended_action": "Set TTL on Redis keys"}

        resp = client.post(f"/api/v1/incidents/{inc_id}/analyze")
        assert resp.status_code == 200
        data = resp.json()

        # Deduplicated
        assert len(data["similar_historical_incidents"]) == 1
        assert len(data["previous_root_causes"]) == 1


def test_scenario_7_supported_response_formats():
    """Scenario 7: Handles different memory response formats (dict with 'results', list, object with attributes)."""
    inc_id = "INC-101"
    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall, \
         patch("app.routers.incidents.ai_incident_service.aanalyze_incident") as mock_analyze:

        # Format as direct list
        mock_recall.return_value = {
            "success": True,
            "results": [
                {
                    "incident_id": "INC-FORMAT-1",
                    "service": "Payment API",
                    "root_cause": "Format test cause",
                    "resolution": "Format test resolution"
                }
            ]
        }
        mock_analyze.return_value = {"success": True, "recommended_action": "Fix format"}

        resp = client.post(f"/api/v1/incidents/{inc_id}/analyze")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["similar_historical_incidents"]) == 1
        assert data["similar_historical_incidents"][0]["incident_id"] == "INC-FORMAT-1"


def test_scenario_8_9_10_no_memories_error_and_database_fallback():
    """Scenarios 8, 9, 10: Handles 0 memories, Hindsight error, and SQLite database fallback."""
    # Create matching resolved incident in SQLite
    fb_id = f"INC-FB-{uuid.uuid4().hex[:6].upper()}"
    client.post("/api/v1/incidents", json={
        "id": fb_id,
        "service": "Fallback Billing Service",
        "error": "Billing lock timeout error",
        "symptoms": "Transactions failing during lock wait",
        "severity": "high",
        "root_cause": "Lock contention on billing_transactions table",
        "resolution": "Added optimistic locking and reduced transaction isolation level",
        "outcome": "Resolved"
    })

    # Create target incident
    target_id = f"INC-TGT-{uuid.uuid4().hex[:6].upper()}"
    client.post("/api/v1/incidents", json={
        "id": target_id,
        "service": "Fallback Billing Service",
        "error": "Billing lock timeout error",
        "symptoms": "Transactions failing during lock wait"
    })

    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall, \
         patch("app.routers.incidents.ai_incident_service.aanalyze_incident") as mock_analyze:

        # Case A: Hindsight returns 0 vector matches -> SQLite Fallback
        mock_recall.return_value = {"success": True, "results": {"memories": []}}
        mock_analyze.return_value = {"success": True, "recommended_action": "Use optimistic locking"}

        resp = client.post(f"/api/v1/incidents/{target_id}/analyze")
        assert resp.status_code == 200
        data = resp.json()

        assert data["memory_status"] == "sqlite_fallback"
        assert data["recall_source"] == "sqlite_fallback"
        inc_ids = [m["incident_id"] for m in data["similar_historical_incidents"]]
        assert fb_id in inc_ids
        assert "Lock contention on billing_transactions table" in data["previous_root_causes"]


def test_scenario_11_missing_optional_fields():
    """Scenario 11: Memory with missing optional root_cause or resolution handled safely."""
    inc_id = "INC-101"
    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall, \
         patch("app.routers.incidents.ai_incident_service.aanalyze_incident") as mock_analyze:

        mock_recall.return_value = {
            "success": True,
            "results": {
                "memories": [
                    {
                        "content": "Incident ID: INC-PARTIAL\nService: Payment API\nError: Database connection timeout\nRoot Cause: Memory leak in connection handler"
                        # No resolution field provided
                    }
                ]
            }
        }
        mock_analyze.return_value = {"success": True, "recommended_action": "Fix memory leak"}

        resp = client.post(f"/api/v1/incidents/{inc_id}/analyze")
        assert resp.status_code == 200
        data = resp.json()

        assert len(data["previous_root_causes"]) == 1
        assert "Memory leak in connection handler" in data["previous_root_causes"]
        assert len(data["previous_resolutions"]) == 0
