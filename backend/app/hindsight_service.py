import logging
from typing import Any, Dict, List, Optional
from hindsight_client import Hindsight
from hindsight_client_api.exceptions import ApiException
from app.config import settings

logger = logging.getLogger("incidentiq.hindsight")

def is_insufficient_credits_error(e: Exception) -> bool:
    """Check if exception represents HTTP 402 Insufficient Credits."""
    if isinstance(e, ApiException):
        if getattr(e, "status", None) == 402:
            return True
        err_str = str(e).lower()
        if "402" in err_str or "insufficient credits" in err_str:
            return True
    err_str = str(e).lower()
    return "402" in err_str or "insufficient credits" in err_str

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

    async def aretain_incident(
        self,
        incident_id: str,
        service: str,
        error: str,
        symptoms: str,
        severity: str,
        root_cause: Optional[str] = None,
        resolution: Optional[str] = None,
        outcome: str = "Resolved",
    ) -> Dict[str, Any]:
        """
        RETAIN (Async): Store a resolved incident and its investigation experience into Hindsight memory.
        """
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
            logger.warning(f"Failed to retain incident {incident_id} in Hindsight: {e}")
            if is_insufficient_credits_error(e):
                return {
                    "success": False,
                    "incident_id": incident_id,
                    "bank_id": self.bank_id,
                    "error": "Hindsight Cloud has insufficient credits. Historical memory is temporarily unavailable.",
                    "status_code": 402,
                }
            return {
                "success": False,
                "incident_id": incident_id,
                "bank_id": self.bank_id,
                "error": str(e),
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
            logger.warning(f"Failed to recall memories from Hindsight: {e}")
            if is_insufficient_credits_error(e):
                return {
                    "success": False,
                    "query": query,
                    "bank_id": self.bank_id,
                    "error": "Hindsight Cloud has insufficient credits. Historical memory is temporarily unavailable.",
                    "status_code": 402,
                    "results": None,
                }
            return {
                "success": False,
                "query": query,
                "bank_id": self.bank_id,
                "error": str(e),
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
            logger.warning(f"Failed to reflect patterns from Hindsight: {e}")
            if is_insufficient_credits_error(e):
                return {
                    "success": False,
                    "query": query,
                    "bank_id": self.bank_id,
                    "error": "Hindsight Cloud has insufficient credits. Historical memory is temporarily unavailable.",
                    "status_code": 402,
                    "results": None,
                }
            return {
                "success": False,
                "query": query,
                "bank_id": self.bank_id,
                "error": str(e),
                "results": None,
            }
        finally:
            if self._client is None:
                await client.aclose()

    # Backward-compatibility sync aliases for non-async contexts
    def retain_incident(self, *args, **kwargs) -> Dict[str, Any]:
        try:
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
        except Exception as e:
            logger.warning(f"Sync retain fallback exception: {e}")
            return {"success": False, "error": str(e)}

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
