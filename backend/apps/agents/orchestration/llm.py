import logging
import os
import re
from datetime import UTC, datetime, timedelta
from typing import Any

from agents.orchestration.schemas import (
    EventPlanProposal,
    MilestoneBlueprint,
    RiskRemediationProposal,
    TaskAdjustment,
    TaskBlueprint,
)
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableLambda

logger = logging.getLogger(__name__)

class MockRiskImpactLLM:
    """Determines offline mock LLM for local development, CI pipelines,
    and environments without active API keys.
    """

    def __init__(self, canned_proposal: RiskRemediationProposal | None = None):
        self.canned_proposal =canned_proposal

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
                        new_due_str = (datetime.now(UTC) + timedelta(days=2)).isoformat()

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

def get_llm(
    provider: str | None = None,
    temperature: float = 0.1,
    agent_type: str = "risk_impact",
) -> Any:
    """Factory function returning a configured LLM Client.
    Prefers configured provider (DEFAULT_LLM_PROVIDER -> Groq -> Gemini)
    and falls back to Mock LLMs if no credentials are configured or MOCK_LLM=True.
    """
    use_mock = os.getenv("MOCK_LLM", "False").lower() in ("true", "1", "yes")
    if use_mock:
        if agent_type == "event_planning":
            logger.info("Using MockEventPlanningLLM (MOCK_LLM is enabled).")
            return MockEventPlanningLLM()
        logger.info("Using MockRiskImpactLLM (MOCK_LLM is enabled).")
        return MockRiskImpactLLM()

    provider = provider or os.getenv("DEFAULT_LLM_PROVIDER")

    # 1. Try Gemini if explicitly selected or default
    gemini_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if provider == "gemini" and gemini_api_key:
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

    # 2. Try Groq
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
    if agent_type == "event_planning":
        logger.warning("No GROQ_API_KEY or GOOGLE_API_KEY found. Defaulting to MockEventPlanningLLM.")
        return MockEventPlanningLLM()
    
    logger.warning(
        "No GROQ_API_Key or GOOGLE_API_KEY found in environment."
        "Defaulting to deterministic MockRiskImpactLLM for zero-cost operation."
    )
    return MockRiskImpactLLM()
    
class MockEventPlanningLLM:
    """Offline mock LLM for the Event Planning Agent.
    Generates a realistic 5-milestone, 14-task operational breakdown reverse-scheduled
    from the target event's start date.
    """

    def __init__(self, canned_proposal: EventPlanProposal | None = None):
        self.canned_proposal = canned_proposal

    def with_structured_output(self, schema: Any, **kwargs: Any) -> RunnableLambda:
        """Simulates LangChain's structured output mechanism for EventPlanProposal."""
        def _mock_invoke(inputs: Any) -> EventPlanProposal:
            if self.canned_proposal:
                return self.canned_proposal
            
            # Extract prompt text from messages or string
            prompt_text = ""
            if isinstance(inputs, list):
                for msg in inputs:
                    if hasattr(msg, "content"):
                        prompt_text += f" {msg.content}"
                    elif isinstance(msg, dict):
                        prompt_text += f" {msg.get('content', '')}"
            
            elif isinstance(inputs, str):
                prompt_text = inputs

            # Extract event start date from prompt (or default to 30 days from now)
            start_date_match = re.search(r"Start Date:\s*([^\n\r]+)", prompt_text)
            event_start = datetime.now(UTC) + timedelta(days=30)
            if start_date_match:
                raw_date = start_date_match.group(1).strip()
                try:
                    clean_date = raw_date.replace("Z", "+00:00")
                    parsed = datetime.fromisoformat(clean_date)
                    event_start = parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
                except (ValueError, TypeError):
                    pass

            # Reverse-scheduled Milestone blueprints
            milestones = [
                MilestoneBlueprint(
                    name="Concept, Feasibility & Permitting",
                    target_date=(event_start - timedelta(days=21)).isoformat(),
                    description="Finalize event scope, budget sign-off, and municipal approvals.",
                ),
                MilestoneBlueprint(
                    name="Venue Contracting & Vendor Procurement",
                    target_date=(event_start - timedelta(days=14)).isoformat(),
                    description="Lock in venue contracts, primary catering, and A/V production.",
                ),
                MilestoneBlueprint(
                    name="Technical Production & Run-of-Show",
                    target_date=(event_start - timedelta(days=7)).isoformat(),
                    description="Finalize stage schedule, tech requirements, and registration lists.",
                ),
                MilestoneBlueprint(
                    name="On-site Logistics & Load-in",
                    target_date=(event_start - timedelta(days=1)).isoformat(),
                    description="Equipment delivery, stage setup, and volunteer briefing.",
                ),
                MilestoneBlueprint(
                    name="Execution & Teardown",
                    target_date=(event_start + timedelta(hours=6)).isoformat(),
                    description="Live run-of-show execution and post-event facility strike.",
                ),
            ]
            # 14 Actionable tasks distributed across milestones and roles
            tasks = [
                # Phase 1
                TaskBlueprint(
                    title="Define event scope, budget caps, and stakeholder sign-off",
                    description="Draft executive event brief and lock category spending ceilings.",
                    due_date=(event_start - timedelta(days=25)).isoformat(),
                    suggested_role="planner",
                    priority="high",
                    milestone_name="Concept, Feasibility & Permitting",
                ),
                TaskBlueprint(
                    title="Submit municipal event permits and noise variance applications",
                    description="File paperwork with local city council for public gathering and amplification.",
                    due_date=(event_start - timedelta(days=21)).isoformat(),
                    suggested_role="planner",
                    priority="high",
                    milestone_name="Concept, Feasibility & Permitting",
                ),
                TaskBlueprint(
                    title="Procure event liability insurance certificate",
                    description="Secure $1M general liability policy naming venue as additional insured.",
                    due_date=(event_start - timedelta(days=18)).isoformat(),
                    suggested_role="planner",
                    priority="medium",
                    milestone_name="Concept, Feasibility & Permitting",
                ),
                # Phase 2
                TaskBlueprint(
                    title="Conduct venue walk-through and verify power drop capacities",
                    description="Inspect staging area, loading dock clearance, and circuit breaker ratings.",
                    due_date=(event_start - timedelta(days=16)).isoformat(),
                    suggested_role="coordinator",
                    priority="high",
                    milestone_name="Venue Contracting & Vendor Procurement",
                ),
                TaskBlueprint(
                    title="Select and contract primary catering and beverage service",
                    description="Finalize menu tasting, dietary options, and minimum headcount guarantee.",
                    due_date=(event_start - timedelta(days=14)).isoformat(),
                    suggested_role="coordinator",
                    priority="medium",
                    milestone_name="Venue Contracting & Vendor Procurement",
                ),
                TaskBlueprint(
                    title="Book primary A/V and stage production vendor",
                    description="Confirm sound system, wireless mics, projector screens, and technicians.",
                    due_date=(event_start - timedelta(days=12)).isoformat(),
                    suggested_role="coordinator",
                    priority="high",
                    milestone_name="Venue Contracting & Vendor Procurement",
                ),
                TaskBlueprint(
                    title="Confirm security guards and medical first-responder standby",
                    description="Execute agreement with licensed security agency for crowd control.",
                    due_date=(event_start - timedelta(days=10)).isoformat(),
                    suggested_role="planner",
                    priority="medium",
                    milestone_name="Venue Contracting & Vendor Procurement",
                ),
                # Phase 3
                TaskBlueprint(
                    title="Finalize master run-of-show and speaker/performer cue sheet",
                    description="Sequence minute-by-minute transitions, walk-on cues, and lighting presets.",
                    due_date=(event_start - timedelta(days=7)).isoformat(),
                    suggested_role="planner",
                    priority="high",
                    milestone_name="Technical Production & Run-of-Show",
                ),
                TaskBlueprint(
                    title="Audit attendee registration list and print credentials",
                    description="Export confirmed guest list, print VIP badges, and prep lanyard kits.",
                    due_date=(event_start - timedelta(days=5)).isoformat(),
                    suggested_role="coordinator",
                    priority="low",
                    milestone_name="Technical Production & Run-of-Show",
                ),
                TaskBlueprint(
                    title="Draft emergency evacuation and severe weather protocol",
                    description="Distribute emergency egress maps and designated assembly points.",
                    due_date=(event_start - timedelta(days=4)).isoformat(),
                    suggested_role="planner",
                    priority="high",
                    milestone_name="Technical Production & Run-of-Show",
                ),
                TaskBlueprint(
                    title="Verify dietary restrictions and submit final catering headcount",
                    description="Send final guarantee counts for vegan, gluten-free, and halal meals.",
                    due_date=(event_start - timedelta(days=3)).isoformat(),
                    suggested_role="coordinator",
                    priority="medium",
                    milestone_name="Technical Production & Run-of-Show",
                ),
                # Phase 4
                TaskBlueprint(
                    title="Supervise staging, lighting, and exhibitor booth load-in",
                    description="Oversee freight elevator access, pipe-and-drape rigging, and vendor setup.",
                    due_date=(event_start - timedelta(hours=18)).isoformat(),
                    suggested_role="freelancer",
                    priority="high",
                    milestone_name="On-site Logistics & Load-in",
                ),
                TaskBlueprint(
                    title="Brief on-site volunteers on registration and ushering duties",
                    description="Hold 30-minute orientation on guest check-in scanners and queue management.",
                    due_date=(event_start - timedelta(hours=4)).isoformat(),
                    suggested_role="volunteer",
                    priority="medium",
                    milestone_name="On-site Logistics & Load-in",
                ),
                # Phase 5
                TaskBlueprint(
                    title="Coordinate post-event venue teardown and rental equipment return",
                    description="Manage strike crew, inventory rental assets, and conduct venue walkthrough.",
                    due_date=(event_start + timedelta(hours=6)).isoformat(),
                    suggested_role="volunteer",
                    priority="low",
                    milestone_name="Execution & Teardown",
                ),
            ]
            return EventPlanProposal(
                plan_summary=(
                    f"Operational roadmap generated for event starting {event_start.strftime('%Y-%m-%d')}. "
                    f"Decomposed into {len(milestones)} milestone phases and {len(tasks)} reverse-scheduled tasks."
                ),
                event_category="General Event",
                milestones=milestones,
                tasks=tasks,
                reasoning=(
                    "Reverse-scheduled timeline constructed working backwards from the event start date. "
                    "Long-lead permit and contracting requirements are frontloaded 2-3 weeks out, "
                    "followed by technical sequencing and final 24h load-in."
                ),
            )
        return RunnableLambda(_mock_invoke)
    def invoke(self, inputs: Any, **kwargs: Any) -> AIMessage:
        return AIMessage(content="Event planning roadmap generated successfully.")