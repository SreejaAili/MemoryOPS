import json
import logging
from typing import Any, Dict, List, Optional
from groq import Groq
from app.config import settings
from app.hindsight_service import hindsight_service

logger = logging.getLogger("incidentiq.ai_service")

SYSTEM_PROMPT = """You are MemoryOps AI, an expert SRE/DevOps incident response assistant.
Your task is to analyze an incoming IT/DevOps incident using recalled historical incident memories from Hindsight.

CRITICAL INSTRUCTIONS:
1. Distinguish clearly between historical evidence (retrieved from Hindsight memories) and your own AI analysis/reasoning.
2. NEVER invent or fabricate historical incidents or incident IDs. Only reference historical incidents that are explicitly present in the provided RECALLED HISTORICAL MEMORIES.
3. If no relevant historical incidents exist or match, explicitly state that no historical incidents were found in Hindsight and base your analysis solely on general DevOps best practices.
4. Return your output STRICTLY as a valid JSON object matching this exact schema:
{
  "probable_root_cause": "Detailed explanation of the probable root cause",
  "recommended_action": "Specific step-by-step remediation or investigation steps",
  "confidence": "high" | "medium" | "low",
  "reasoning": "Clear explanation distinguishing historical evidence from general model reasoning",
  "supporting_historical_incidents": [
    "INC-XXX: Summary of relevant historical incident"
  ]
}
"""

class AIIncidentService:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = model or settings.GROQ_MODEL
        self._client: Optional[Groq] = None

    @property
    def client(self) -> Groq:
        if not self.api_key:
            raise ValueError("GROQ_API_KEY environment variable is not configured.")
        if self._client is None:
            self._client = Groq(api_key=self.api_key)
        return self._client

    async def aanalyze_incident(
        self,
        service: str,
        error: str,
        symptoms: str,
        severity: str = "medium",
        custom_query: Optional[str] = None,
        recalled_memories: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Async version of incident analysis.
        1. Recalls similar historical incidents from Hindsight asynchronously (if not passed).
        2. Sends current incident details and recalled memories to Groq LLM.
        3. Returns structured analysis.
        """
        if recalled_memories is None:
            recall_query = custom_query or f"Service: {service} | Error: {error} | Symptoms: {symptoms}"
            recalled_memories = await hindsight_service.arecall_memories(query=recall_query)

        memories_text = "No historical memories retrieved."
        if recalled_memories.get("success") and recalled_memories.get("results"):
            results = recalled_memories["results"]
            memories_text = str(results)

        user_prompt = f"""--- CURRENT INCIDENT DETAILS ---
Service: {service}
Error: {error}
Symptoms: {symptoms}
Severity: {severity}

--- RECALLED HISTORICAL MEMORIES (FROM HINDSIGHT) ---
{memories_text}

Analyze the current incident now and respond strictly with the JSON schema requested.
"""

        try:
            client = self.client
            completion = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )

            response_text = completion.choices[0].message.content
            parsed = json.loads(response_text)

            return {
                "success": True,
                "service": service,
                "error": error,
                "probable_root_cause": parsed.get("probable_root_cause", "Unknown root cause"),
                "recommended_action": parsed.get("recommended_action", "Investigate service logs"),
                "confidence": parsed.get("confidence", "medium"),
                "reasoning": parsed.get("reasoning", "Analysis generated from incident details"),
                "supporting_historical_incidents": parsed.get("supporting_historical_incidents", []),
                "recalled_memories_used": recalled_memories,
            }

        except json.JSONDecodeError as jde:
            logger.error(f"Failed to parse Groq AI JSON response: {jde}")
            return self._fallback_analysis(
                service, error, symptoms, severity, recalled_memories,
                error_msg=f"Failed to parse AI response JSON: {jde}"
            )
        except ValueError as ve:
            logger.error(f"Groq API configuration error: {ve}")
            return self._fallback_analysis(
                service, error, symptoms, severity, recalled_memories,
                error_msg=f"Groq API Key not configured: {ve}"
            )
        except Exception as e:
            logger.error(f"Groq API call failed: {e}")
            return self._fallback_analysis(
                service, error, symptoms, severity, recalled_memories,
                error_msg=f"Groq AI service error: {e}"
            )

    def analyze_incident(
        self,
        service: str,
        error: str,
        symptoms: str,
        severity: str = "medium",
        custom_query: Optional[str] = None,
        recalled_memories: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Sync wrapper for analyze_incident.
        """
        import asyncio
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            # If in running loop and recalled_memories is provided, run prompt directly without loop call
            if recalled_memories is not None:
                memories_text = "No historical memories retrieved."
                if recalled_memories.get("success") and recalled_memories.get("results"):
                    memories_text = str(recalled_memories["results"])

                user_prompt = f"""--- CURRENT INCIDENT DETAILS ---
Service: {service}
Error: {error}
Symptoms: {symptoms}
Severity: {severity}

--- RECALLED HISTORICAL MEMORIES (FROM HINDSIGHT) ---
{memories_text}

Analyze the current incident now and respond strictly with the JSON schema requested.
"""
                try:
                    client = self.client
                    completion = client.chat.completions.create(
                        model=self.model,
                        messages=[
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt},
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.2,
                    )
                    parsed = json.loads(completion.choices[0].message.content)
                    return {
                        "success": True,
                        "service": service,
                        "error": error,
                        "probable_root_cause": parsed.get("probable_root_cause", "Unknown root cause"),
                        "recommended_action": parsed.get("recommended_action", "Investigate service logs"),
                        "confidence": parsed.get("confidence", "medium"),
                        "reasoning": parsed.get("reasoning", "Analysis generated from incident details"),
                        "supporting_historical_incidents": parsed.get("supporting_historical_incidents", []),
                        "recalled_memories_used": recalled_memories,
                    }
                except Exception as e:
                    return self._fallback_analysis(service, error, symptoms, severity, recalled_memories, str(e))
            else:
                return self._fallback_analysis(service, error, symptoms, severity, {}, "Sync analyze called inside running loop without recalled memories")
        else:
            return asyncio.run(self.aanalyze_incident(service, error, symptoms, severity, custom_query, recalled_memories))

    def _fallback_analysis(
        self,
        service: str,
        error: str,
        symptoms: str,
        severity: str,
        recalled_memories: Dict[str, Any],
        error_msg: str,
    ) -> Dict[str, Any]:
        """Graceful fallback when Groq API is unavailable or unconfigured."""
        supporting = []
        if recalled_memories.get("success") and recalled_memories.get("results"):
            supporting.append("Historical memories retrieved from Hindsight (Groq AI unavailable)")

        return {
            "success": False,
            "error_detail": error_msg,
            "service": service,
            "error": error,
            "probable_root_cause": f"Potential issue in service '{service}' related to error: {error}",
            "recommended_action": f"Check logs and metrics for '{service}'. Verify database/network connection and service health.",
            "confidence": "low",
            "reasoning": f"Fallback rule-based heuristic applied because AI analysis was unavailable ({error_msg}).",
            "supporting_historical_incidents": supporting,
            "recalled_memories_used": recalled_memories,
        }

ai_incident_service = AIIncidentService()
