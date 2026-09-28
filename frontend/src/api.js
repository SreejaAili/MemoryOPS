function getApiBase() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // If running in production on Render (or any onrender.com sub-domain)
    if (hostname.endsWith('.onrender.com')) {
      if (hostname.includes('-frontend')) {
        return `https://${hostname.replace('-frontend', '-backend')}`;
      }
      return 'https://memoryops-backend.onrender.com';
    }
  }
  return 'http://localhost:8000';
}

const API_BASE = getApiBase();

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/api/v1/health`);
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.json();
}

export async function fetchIncidents(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}/api/v1/incidents${query ? `?${query}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch incidents (${res.status})`);
  return res.json();
}

export async function fetchIncidentById(id) {
  const res = await fetch(`${API_BASE}/api/v1/incidents/${id}`);
  if (!res.ok) throw new Error(`Incident '${id}' not found (${res.status})`);
  return res.json();
}

export async function createIncident(data) {
  const res = await fetch(`${API_BASE}/api/v1/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to create incident (${res.status})`);
  }
  return res.json();
}

export async function resolveIncident(id, resolveData) {
  const res = await fetch(`${API_BASE}/api/incidents/${id}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resolveData),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to resolve incident (${res.status})`);
  }
  return res.json();
}

export async function analyzeIncident(id) {
  const res = await fetch(`${API_BASE}/api/incidents/${id}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to analyze incident (${res.status})`);
  }
  return res.json();
}

export async function recallMemories(queryData) {
  const res = await fetch(`${API_BASE}/api/v1/incidents/recall`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryData),
  });
  if (!res.ok) throw new Error(`Failed to recall memories (${res.status})`);
  return res.json();
}

export async function reflectMemories(queryData) {
  const res = await fetch(`${API_BASE}/api/v1/incidents/reflect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryData),
  });
  if (!res.ok) throw new Error(`Failed to reflect memories (${res.status})`);
  return res.json();
}
