import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from agents.orchestration.schemas import RiskRemediationProposal, TaskAdjustment
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableLambda

logger = logging.getLogger(__name__)

class MockRiskImpactLLM:
    """Determines offline mock LLM for local development, CI pipelines,
    and environments without active API keys.
    """

    def __init__(self, canned_proposal: RiskRemediationProposal | None = None):
        self.canned_proposal = canned_proposal

    def with_structured_output(self, schema: Any, **kwargs: Any) -> RunnableLambda:
        """Simulates LangChain's structured output mechanism."""
        def _mock_invoke(inputs: Any) -> RiskRemediationProposal:
            if self.canned_proposal:
                return self.canned_proposal

            # Extract prompt text from messages
            prompt_text = ""
            if isinstance(inputs, list):
                for msg in inputs:
                    if hasattr(msg, "content"):
                        prompt_text += f" {msg.content}"
                    elif isinstance(msg, dict):
                        prompt_text += f" {msg.get('content', '')}"
            elif isinstance(inputs, str):
                prompt_text = inputs

            # Dynamically extract active tasks from the prompt snapshot
            task_adjustments: list[TaskAdjustment] = []
            task_pattern = re.findall(
                r"- ID: ([0-9a-fA-F-]+) \| Title: '([^']+)' \| Status: ([a-zA-Z_]+) \| Due: ([^\n]+)",
                prompt_text,
            )
            for task_id, title, status, due_str in task_pattern:
                if status.lower() not in ("done", "completed"):
                    try:
                        due_clean = due_str.strip().replace("Z", "+00:00")
                        parsed_dt = datetime.fromisoformat(due_clean)
                        shifted_dt = parsed_dt + timedelta(hours=3)
                        new_due_str = shifted_dt.isoformat()
                    except (ValueError, TypeError):
                        new_due_str = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()

                    task_adjustments.append(
                        TaskAdjustment(
                            task_id=task_id,
                            title=title,
                            suggested_action="shift_due_date",
                            proposed_due_date=new_due_str,
                            reason=f"Shifting '{title}' by 3 hours to absorb upstream delays and restore margin.",
                        )
                    )

            severity = "high" if len(task_adjustments) > 1 else "medium"
            summary = (
                f"Schedule shift detected affecting {len(task_adjustments)} downstream task(s). "
                "Remediation proposed to protect event milestones and avoid team overruns."
                if task_adjustments
                else "Event schedule adjusted. Identified active tasks requiring timeline alignment."
            )

            return RiskRemediationProposal(
                risk_severity=severity,
                impact_summary=summary,
                reasoning=(
                    "Chain of thought analysis: Evaluated task deadlines against the revised timeline. "
                    "Identified downstream active tasks with critical path dependencies. "
                    "Proposing proportional timeline adjustments to maintain operational buffers."
                ),
                task_adjustments=task_adjustments,
                budget_adjustments=[],
            )
        return RunnableLambda(_mock_invoke)

    def invoke(self, inputs: Any, **kwargs: Any) -> AIMessage:
        return AIMessage(content="Risk & Change Impact analysis completed successfully.")

def get_llm(provider: str | None = None, temperature: float = 0.1) -> Any:
    """ 
    Factory function returning a configured LLM Client.
    Prefers free providers (Groq -> Gemini) and falls back to MockRiskImpactLLM 
    if no credentials are configured or MOCK_LLM=True
    """
    use_mock = os.getenv("MOCK_LLM", "False").lower() in ("true", "1", "yes")
    if use_mock:
        logger.info("Using MockRiskImpactLLM (MOCK_LLM is enabled).")
        return MockRiskImpactLLM()


    #1. Try Groq
    groq_api_key = os.getenv("GROQ_API_KEY")
    if (provider == "groq" or not provider) and groq_api_key:
        try:
            from langchain_groq import ChatGroq

            model_name = os.getenv("GROQ_MODEL","llama-3.3-70b-versatile")
            logger.info("Initialising ChatGroq with model: %s", model_name)
            return ChatGroq(
                model=model_name,
                temperature=temperature,
                api_key=groq_api_key,
            )
        except Exception:
            logger.exception("Failed to Initialise ChatGroq, attempting fallback.")
        
    # Try Google Gemini
    gemini_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if (provider == "gemini" or not provider) and gemini_api_key:
        try: 
            from langchain_google_genai import ChatGoogleGenerativeAI

            model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
            logger.info("Initialising ChatGoogleGenerativeAI with model: %s", model_name)
            return ChatGoogleGenerativeAI(
                model=model_name,
                temperature=temperature,
                google_api_key=gemini_api_key,
            )
        except Exception:
            logger.exception("Failed to initialise ChatGoogleGenerativeAI, attempting fallback.")
    
    # 3. Fallback: Offline Mock LLM
    logger.warning(
        "No GROQ_API_Key or GOOGLE_API_KEY found in environment."
        "Defaulting to deterministic MockRiskImpactLLM for zero-cost operation."
    )
    return MockRiskImpactLLM()
    