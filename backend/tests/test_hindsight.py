from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
import pytest
from hindsight_client_api.exceptions import ApiException
from app.main import app
from app.hindsight_service import HindsightService

client = TestClient(app)

@pytest.mark.anyio
async def test_hindsight_service_aretain():
    mock_client = AsyncMock()
    mock_client.aretain.return_value = {"status": "ok", "id": "mem-123"}

    service = HindsightService(base_url="http://localhost:8888", bank_id="testbank")
    service._client = mock_client

    res = await service.aretain_incident(
        incident_id="INC-101",
        service="Payment API",
        error="Database connection timeout",
        symptoms="High Gateway Timeout rate",
        severity="high",
        root_cause="Connection pool exhaustion",
        resolution="Increased connection pool size",
        outcome="Resolved"
    )

    assert res["success"] is True
    assert res["incident_id"] == "INC-101"
    mock_client.aretain.assert_called_once()
    kwargs = mock_client.aretain.call_args.kwargs
    assert kwargs["bank_id"] == "testbank"
    assert "INC-101" in kwargs["content"]

@pytest.mark.anyio
async def test_hindsight_service_arecall():
    mock_client = AsyncMock()
    mock_client.arecall.return_value = {"memories": [{"content": "INC-101 details"}]}

    service = HindsightService(base_url="http://localhost:8888", bank_id="testbank")
    service._client = mock_client

    res = await service.arecall_memories(query="Database timeout")
    assert res["success"] is True
    assert res["results"] == {"memories": [{"content": "INC-101 details"}]}
    mock_client.arecall.assert_called_once_with(
        bank_id="testbank",
        query="Database timeout",
        budget="mid",
        max_tokens=4096,
        tags=None
    )

@pytest.mark.anyio
async def test_hindsight_service_areflect():
    mock_client = AsyncMock()
    mock_client.areflect.return_value = {"reflection": "Common pattern is connection pool exhaustion."}

    service = HindsightService(base_url="http://localhost:8888", bank_id="testbank")
    service._client = mock_client

    res = await service.areflect_patterns(query="What causes database timeouts?")
    assert res["success"] is True
    assert res["results"] == {"reflection": "Common pattern is connection pool exhaustion."}

@pytest.mark.anyio
async def test_hindsight_service_http_402_insufficient_credits():
    mock_client = AsyncMock()
    mock_exception = ApiException(status=402, reason="Payment Required", body='{"detail": "Insufficient credits"}')
    mock_client.arecall.side_effect = mock_exception

    service = HindsightService(base_url="http://localhost:8888", bank_id="testbank")
    service._client = mock_client

    res = await service.arecall_memories(query="Database timeout")
    assert res["success"] is False
    assert res["status_code"] == 402
    assert "insufficient credits" in res["error"].lower()

def test_no_hindsight_call_during_dashboard_loading():
    """Verify loading dashboard incidents (GET /api/v1/incidents) executes NO Hindsight RETAIN/RECALL calls."""
    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall, \
         patch("app.routers.incidents.hindsight_service.aretain_incident") as mock_retain:

        response = client.get("/api/v1/incidents")
        assert response.status_code == 200
        mock_recall.assert_not_called()
        mock_retain.assert_not_called()

def test_retain_only_after_resolution_and_duplicate_prevention():
    """Verify incident creation in 'Investigating' state does NOT trigger RETAIN, and duplicate resolve skips RETAIN."""
    with patch("app.routers.incidents.hindsight_service.aretain_incident") as mock_retain:
        mock_retain.return_value = {"success": True, "incident_id": "INC-TEST-OPT"}

        # 1. Create incident -> NO RETAIN
        create_resp = client.post("/api/v1/incidents", json={
            "service": "Optimization Test Service",
            "error": "Memory exhaustion",
            "symptoms": "High memory footprint",
            "outcome": "Investigating"
        })
        assert create_resp.status_code == 201
        inc_data = create_resp.json()
        assert inc_data["memory_retained"] is False
        mock_retain.assert_not_called()

        # 2. First Resolve -> RETAIN called
        resolve_resp = client.post(f"/api/v1/incidents/{inc_data['id']}/resolve", json={
            "root_cause": "Unbounded cache size",
            "resolution": "Configured max cache size and eviction",
            "outcome": "Resolved"
        })
        assert resolve_resp.status_code == 200
        assert resolve_resp.json()["memory_retained"] is True
        assert mock_retain.call_count == 1

        # 3. Duplicate Resolve -> RETAIN skipped
        mock_retain.reset_mock()
        resolve_again = client.post(f"/api/v1/incidents/{inc_data['id']}/resolve", json={
            "root_cause": "Unbounded cache size",
            "resolution": "Configured max cache size and eviction",
            "outcome": "Resolved"
        })
        assert resolve_again.status_code == 200
        mock_retain.assert_not_called()

def test_recall_result_limiting():
    """Verify RECALL limits returned memories to top 5."""
    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall:
        mock_memories = [{"text": f"Incident ID: INC-{i}\nService: Test\nError: err"} for i in range(10)]
        mock_recall.return_value = {
            "success": True,
            "results": {"results": mock_memories}
        }

        response = client.post("/api/v1/incidents/recall", json={
            "query": "Test query"
        })
        assert response.status_code == 200
        data = response.json()
        assert len(data["memories"]) == 5

def test_recall_api_endpoint():
    with patch("app.routers.incidents.hindsight_service.arecall_memories") as mock_recall:
        mock_recall.return_value = {
            "success": True,
            "query": "Database connection timeout",
            "results": {"memories": [{"id": "INC-101"}]}
        }

        response = client.post("/api/v1/incidents/recall", json={
            "query": "Database connection timeout",
            "service": "Payment API"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["results"]["memories"][0]["id"] == "INC-101"

def test_reflect_api_endpoint():
    with patch("app.routers.incidents.hindsight_service.areflect_patterns") as mock_reflect:
        mock_reflect.return_value = {
            "success": True,
            "query": "Database connection patterns",
            "results": {"pattern": "Pool exhaustion under load"}
        }

        response = client.post("/api/v1/incidents/reflect", json={
            "query": "Database connection patterns"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["results"]["pattern"] == "Pool exhaustion under load"
