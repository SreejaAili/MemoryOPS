import logging
from typing import Any, Dict, List, Optional
from hindsight_client import Hindsight
from hindsight_client_api.exceptions import ApiException
from app.config import settings

logger = logging.getLogger("incidentiq.hindsight")

def sanitize_error_message(err_msg: str) -> str:
    """Sanitize error messages to prevent exposing API keys or credentials."""
    if not err_msg:
        return "Unknown Hindsight error"
    sanitized = str(err_msg)
    if settings.HINDSIGHT_API_KEY and len(settings.HINDSIGHT_API_KEY) > 4:
        sanitized = sanitized.replace(settings.HINDSIGHT_API_KEY, "[REDACTED_API_KEY]")
    if settings.GROQ_API_KEY and len(settings.GROQ_API_KEY) > 4:
        sanitized = sanitized.replace(settings.GROQ_API_KEY, "[REDACTED_API_KEY]")
    return sanitized

def classify_hindsight_error(e: Exception) -> Dict[str, Any]:
    """
    Classify Hindsight exception into a structured error dictionary with user-friendly messages
    and status codes without leaking sensitive keys.
    """
    err_str = str(e)
    status_code = getattr(e, "status", None)
    if isinstance(e, ApiException):
        status_code = e.status

    err_lower = err_str.lower()

    if status_code == 402 or "402" in err_lower or "insufficient credits" in err_lower or "payment required" in err_lower:
        return {
            "error_type": "insufficient_credits",
            "status_code": 402,
            "user_message": "Hindsight Cloud Insufficient Credits (402).",
            "detail": "Hindsight Cloud account has run out of credits. Upgrade account or top up credits to enable vector memory."
        }

    # Check if API key is missing or default placeholder
    if not settings.HINDSIGHT_API_KEY or settings.HINDSIGHT_API_KEY in ["", "your_hindsight_cloud_api_key_here", "your_hindsight_api_key_here"]:
        return {
            "error_type": "unconfigured",
            "status_code": 401,
            "user_message": "Hindsight API Key is not configured in .env (HINDSIGHT_API_KEY).",
            "detail": "Set a valid HINDSIGHT_API_KEY in your .env file or environment variables to enable vector memory RECALL and RETAIN."
        }

    if status_code == 401 or "401" in err_lower or "unauthorized" in err_lower or "api key required" in err_lower:
        return {
            "error_type": "unauthorized",
            "status_code": 401,
            "user_message": "Hindsight API Authentication Failed (401 Unauthorized).",
            "detail": "The provided HINDSIGHT_API_KEY is invalid or expired. Check HINDSIGHT_API_KEY in your .env file."
        }

    if "connect" in err_lower or "timeout" in err_lower or "resolution" in err_lower or "unreachable" in err_lower:
        return {
            "error_type": "network_error",
            "status_code": 503,
            "user_message": "Hindsight Service Unreachable.",
            "detail": f"Failed to connect to Hindsight service at {settings.HINDSIGHT_API_URL}. Check network connection or endpoint configuration."
        }

    return {
        "error_type": "generic_error",
        "status_code": status_code or 500,
        "user_message": "Hindsight Service Error.",
        "detail": sanitize_error_message(err_str)
    }

class HindsightService:
    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        bank_id: Optional[str] = None,
    ):
        self.base_url = base_url or settings.HINDSIGHT_API_URL
        self.api_key = api_key or settings.HINDSIGHT_API_KEY
        self.bank_id = bank_id or settings.HINDSIGHT_BANK_ID
        self._client: Optional[Hindsight] = None

    def get_client(self) -> Hindsight:
        if self._client is not None:
            return self._client
        return Hindsight(base_url=self.base_url, api_key=self.api_key)

    @property
    def client(self) -> Hindsight:
        return self.get_client()

    def is_configured(self) -> bool:
        """Check if Hindsight API Key is configured with a non-placeholder value or client is injected."""
        if self._client is not None:
            return True
        api_key = self.api_key or settings.HINDSIGHT_API_KEY
        if not api_key:
            return False
        return api_key not in ["", "your_hindsight_cloud_api_key_here", "your_hindsight_api_key_here"]

    async def aretain_incident(
        self,
        incident_id: str,
        service: str,
        error: str,
        symptoms: str,
        severity: str,
        root_cause: Optional[str] = None,
        resolution: Optional[str] = None,
        post_mortem: Optional[str] = None,
        outcome: str = "Resolved",
    ) -> Dict[str, Any]:
        """
        RETAIN (Async): Store a resolved incident and its investigation experience into Hindsight memory.
        Uses deterministic document_id = incident_id for idempotent retention.
        """
        if not self.is_configured():
            err_info = classify_hindsight_error(ValueError("Unconfigured HINDSIGHT_API_KEY"))
            return {
                "success": False,
                "incident_id": incident_id,
                "bank_id": self.bank_id,
                "error": err_info["user_message"],
                "detail": err_info["detail"],
                "error_type": err_info["error_type"],
                "status_code": err_info["status_code"],
            }

        content_lines = [
            f"Incident ID: {incident_id}",
            f"Service: {service}",
            f"Error: {error}",
            f"Symptoms: {symptoms}",
            f"Severity: {severity}",
            f"Outcome: {outcome}",
        ]
        if root_cause:
            content_lines.append(f"Root Cause: {root_cause}")
        if resolution:
            content_lines.append(f"Resolution: {resolution}")
        if post_mortem:
            content_lines.append(f"Post-mortem: {post_mortem}")

        content_text = "\n".join(content_lines)

        metadata = {
            "incident_id": incident_id,
            "service": service,
            "severity": severity,
            "outcome": outcome,
        }

        client = self.get_client()
        try:
            response = await client.aretain(
                bank_id=self.bank_id,
                content=content_text,
                metadata=metadata,
                document_id=incident_id,
                tags=[service, severity, outcome],
            )
            logger.info(f"Retained incident {incident_id} in Hindsight bank '{self.bank_id}'")
            return {
                "success": True,
                "incident_id": incident_id,
                "bank_id": self.bank_id,
                "response": str(response),
            }
        except Exception as e:
            logger.warning(f"Failed to retain incident {incident_id} in Hindsight: {sanitize_error_message(str(e))}")
            err_info = classify_hindsight_error(e)
            return {
                "success": False,
                "incident_id": incident_id,
                "bank_id": self.bank_id,
                "error": err_info["user_message"],
                "detail": err_info["detail"],
                "error_type": err_info["error_type"],
                "status_code": err_info["status_code"],
            }
        finally:
            if self._client is None:
                await client.aclose()

    async def arecall_memories(
        self,
        query: str,
        budget: str = "mid",
        max_tokens: int = 4096,
        tags: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        RECALL (Async): Retrieve similar historical incidents/memories from Hindsight based on an incident query.
        """
        if not self.is_configured():
            err_info = classify_hindsight_error(ValueError("Unconfigured HINDSIGHT_API_KEY"))
            return {
                "success": False,
                "query": query,
                "bank_id": self.bank_id,
                "error": err_info["user_message"],
                "detail": err_info["detail"],
                "error_type": err_info["error_type"],
                "status_code": err_info["status_code"],
                "results": None,
            }

        client = self.get_client()
        try:
            response = await client.arecall(
                bank_id=self.bank_id,
                query=query,
                budget=budget,
                max_tokens=max_tokens,
                tags=tags,
            )
            return {
                "success": True,
                "query": query,
                "bank_id": self.bank_id,
                "results": response,
            }
        except Exception as e:
            logger.warning(f"Failed to recall memories from Hindsight: {sanitize_error_message(str(e))}")
            err_info = classify_hindsight_error(e)
            return {
                "success": False,
                "query": query,
                "bank_id": self.bank_id,
                "error": err_info["user_message"],
                "detail": err_info["detail"],
                "error_type": err_info["error_type"],
                "status_code": err_info["status_code"],
                "results": None,
            }
        finally:
            if self._client is None:
                await client.aclose()

    async def areflect_patterns(
        self,
        query: str,
        budget: str = "low",
        context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        REFLECT (Async): Synthesize overall patterns, recurring issues, or cross-incident takeaways from Hindsight.
        """
        if not self.is_configured():
            err_info = classify_hindsight_error(ValueError("Unconfigured HINDSIGHT_API_KEY"))
            return {
                "success": False,
                "query": query,
                "bank_id": self.bank_id,
                "error": err_info["user_message"],
                "detail": err_info["detail"],
                "error_type": err_info["error_type"],
                "status_code": err_info["status_code"],
                "results": None,
            }

        client = self.get_client()
        try:
            response = await client.areflect(
                bank_id=self.bank_id,
                query=query,
                budget=budget,
                context=context,
            )
            return {
                "success": True,
                "query": query,
                "bank_id": self.bank_id,
                "results": response,
            }
        except Exception as e:
            logger.warning(f"Failed to reflect patterns from Hindsight: {sanitize_error_message(str(e))}")
            err_info = classify_hindsight_error(e)
            return {
                "success": False,
                "query": query,
                "bank_id": self.bank_id,
                "error": err_info["user_message"],
                "detail": err_info["detail"],
                "error_type": err_info["error_type"],
                "status_code": err_info["status_code"],
                "results": None,
            }
        finally:
            if self._client is None:
                await client.aclose()

    # Sync fallbacks
    def retain_incident(self, *args, **kwargs) -> Dict[str, Any]:
        import asyncio
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            loop.create_task(self.aretain_incident(*args, **kwargs))
            return {"success": True, "status": "scheduled"}
        else:
            return asyncio.run(self.aretain_incident(*args, **kwargs))

    def recall_memories(self, *args, **kwargs) -> Dict[str, Any]:
        import asyncio
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            logger.warning("recall_memories called synchronously inside running event loop. Use arecall_memories instead.")
            return {"success": False, "error": "Synchronous recall inside running loop. Use arecall_memories."}
        else:
            return asyncio.run(self.arecall_memories(*args, **kwargs))

    def reflect_patterns(self, *args, **kwargs) -> Dict[str, Any]:
        import asyncio
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            logger.warning("reflect_patterns called synchronously inside running event loop. Use areflect_patterns instead.")
            return {"success": False, "error": "Synchronous reflect inside running loop. Use areflect_patterns."}
        else:
            return asyncio.run(self.areflect_patterns(*args, **kwargs))

hindsight_service = HindsightService()
