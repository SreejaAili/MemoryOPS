from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class IncidentBase(BaseModel):
    service: str = Field(..., min_length=1, description="Service name affected by the incident")
    error: str = Field(..., min_length=1, description="Primary error message or exception")
    symptoms: str = Field(..., min_length=1, description="Observable symptoms or impact")
    severity: str = Field(default="medium", description="Severity level (e.g., low, medium, high, critical)")
    root_cause: Optional[str] = Field(default=None, description="Root cause of the incident")
    resolution: Optional[str] = Field(default=None, description="Steps taken to resolve the incident")
    outcome: str = Field(default="Open", description="Current status/outcome (e.g., Open, Investigating, Resolved)")

class IncidentCreate(IncidentBase):
    id: Optional[str] = Field(default=None, description="Optional custom ID, e.g. INC-101. Auto-generated if omitted.")

class IncidentUpdate(BaseModel):
    service: Optional[str] = Field(default=None, min_length=1)
    error: Optional[str] = Field(default=None, min_length=1)
    symptoms: Optional[str] = Field(default=None, min_length=1)
    severity: Optional[str] = None
    root_cause: Optional[str] = None
    resolution: Optional[str] = None
    outcome: Optional[str] = None

class IncidentResolve(BaseModel):
    root_cause: Optional[str] = Field(default=None, description="Root cause identified during resolution")
    resolution: str = Field(..., min_length=1, description="Resolution steps taken")
    outcome: str = Field(default="Resolved", description="Outcome status upon resolution")

class IncidentResponse(IncidentBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    memory_retained: bool = False
    ai_recommendation: Optional[str] = None

class MemoryRecallQuery(BaseModel):
    query: Optional[str] = Field(default=None, description="Search query for historical incidents")
    service: Optional[str] = Field(default=None, description="Optional service name filter/context")
    error: Optional[str] = Field(default=None, description="Optional error description")
    symptoms: Optional[str] = Field(default=None, description="Optional symptoms description")
    tags: Optional[List[str]] = Field(default=None, description="Optional tags filter")

class MemoryReflectQuery(BaseModel):
    query: str = Field(..., min_length=1, description="Query to reflect upon across historical incidents")
    context: Optional[str] = Field(default=None, description="Optional context for reflection")

class IncidentAnalysisRequest(BaseModel):
    service: str = Field(..., min_length=1, description="Affected service name")
    error: str = Field(..., min_length=1, description="Primary error message")
    symptoms: str = Field(..., min_length=1, description="Observable symptoms")
    severity: str = Field(default="medium", description="Severity level")
    custom_query: Optional[str] = Field(default=None, description="Custom recall search query")

class IncidentAnalysisResponse(BaseModel):
    success: bool
    service: str
    error: str
    probable_root_cause: str
    recommended_action: str
    confidence: str
    reasoning: str
    supporting_historical_incidents: List[str]
    recalled_memories_used: Optional[Any] = None
    error_detail: Optional[str] = None

class IncidentInvestigationResponse(BaseModel):
    current_incident: IncidentResponse
    similar_historical_incidents: List[Dict[str, Any]]
    previous_root_causes: List[str]
    previous_resolutions: List[str]
    ai_analysis: Dict[str, Any]
    recommended_action: str
    explanation: str
    recall_status: str = Field(default="failed", description="Status of recall: success, empty, failed")
    recall_source: str = Field(default="sqlite_fallback", description="Source of recall data")
