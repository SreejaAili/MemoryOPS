import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_all_incidents_includes_seed():
    response = client.get("/api/v1/incidents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    # Verify seed incident INC-101
    inc_101 = next((inc for inc in data if inc["id"] == "INC-101"), None)
    assert inc_101 is not None
    assert inc_101["service"] == "Payment API"
    assert inc_101["error"] == "Database connection timeout"
    assert inc_101["symptoms"] == "High HTTP 504 Gateway Timeouts on /v1/charge endpoint, elevated API latency"
    assert inc_101["root_cause"] == "Connection pool exhaustion due to leaked unclosed DB sessions during traffic surge"
    assert inc_101["resolution"] == "Increased connection pool size from 20 to 100 and deployed hotfix for session leak"
    assert inc_101["outcome"] == "Resolved"

def test_get_single_incident():
    response = client.get("/api/v1/incidents/INC-101")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "INC-101"
    assert data["service"] == "Payment API"

def test_get_nonexistent_incident():
    response = client.get("/api/v1/incidents/INC-99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_create_incident():
    new_inc = {
        "service": "Cart Service",
        "error": "Redis key missing",
        "symptoms": "Items dropped from shopping carts",
        "severity": "medium",
        "outcome": "Investigating"
    }
    response = client.post("/api/v1/incidents", json=new_inc)
    assert response.status_code == 201
    data = response.json()
    assert data["id"].startswith("INC-")
    assert data["service"] == "Cart Service"
    assert data["error"] == "Redis key missing"
    assert data["outcome"] == "Investigating"
    assert data["resolved_at"] is None

def test_create_incident_conflict():
    duplicate_inc = {
        "id": "INC-101",
        "service": "Payment API",
        "error": "Database connection timeout",
        "symptoms": "Gateway timeout"
    }
    response = client.post("/api/v1/incidents", json=duplicate_inc)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"].lower()

def test_update_incident():
    # First create an incident to update
    create_resp = client.post("/api/v1/incidents", json={
        "service": "Billing Gateway",
        "error": "3DS verification timeout",
        "symptoms": "Customers failing 3D secure verification",
        "severity": "high"
    })
    inc_id = create_resp.json()["id"]

    update_payload = {
        "symptoms": "Customers failing 3D secure verification on Visa cards",
        "severity": "critical"
    }
    response = client.patch(f"/api/v1/incidents/{inc_id}", json=update_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == inc_id
    assert data["symptoms"] == "Customers failing 3D secure verification on Visa cards"
    assert data["severity"] == "critical"

def test_resolve_incident():
    create_resp = client.post("/api/v1/incidents", json={
        "service": "Metrics Collector",
        "error": "Prometheus scrape target down",
        "symptoms": "Missing telemetry metrics on Grafana dashboard",
        "severity": "medium"
    })
    inc_id = create_resp.json()["id"]

    resolve_payload = {
        "root_cause": "Node exporter service stopped after OS upgrade",
        "resolution": "Restarted node exporter service and enabled systemd auto-restart",
        "outcome": "Resolved"
    }
    response = client.post(f"/api/v1/incidents/{inc_id}/resolve", json=resolve_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == inc_id
    assert data["root_cause"] == "Node exporter service stopped after OS upgrade"
    assert data["resolution"] == "Restarted node exporter service and enabled systemd auto-restart"
    assert data["outcome"] == "Resolved"
    assert data["resolved_at"] is not None

def test_validation_error():
    invalid_inc = {
        "service": "", # Invalid empty string
        "error": "Some error",
        "symptoms": "Some symptoms"
    }
    response = client.post("/api/v1/incidents", json=invalid_inc)
    assert response.status_code == 422

def test_incident_persistence_retrieval_after_creation():
    """Verify that a created incident is stored permanently and retrievable across subsequent requests."""
    payload = {
        "service": "Inventory Service",
        "error": "Stock decrement lock failure",
        "symptoms": "Overbooking items during flash sale",
        "severity": "high",
        "outcome": "Investigating"
    }
    create_resp = client.post("/api/v1/incidents", json=payload)
    assert create_resp.status_code == 201
    created_id = create_resp.json()["id"]

    # Retrieve created incident from database via list GET
    list_resp = client.get("/api/v1/incidents")
    assert list_resp.status_code == 200
    all_incidents = list_resp.json()
    matched = next((inc for inc in all_incidents if inc["id"] == created_id), None)
    assert matched is not None
    assert matched["service"] == "Inventory Service"
    assert matched["error"] == "Stock decrement lock failure"

    # Retrieve created incident directly via ID GET
    get_resp = client.get(f"/api/v1/incidents/{created_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == created_id
