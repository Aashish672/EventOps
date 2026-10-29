"""
Prompts and few-shot formatting for the Risk & Change Impact Agent.
Instructs the model to evaluate task cascades, timeline margins, and financial risks.
"""

RISK_IMPACT_SYSTEM_PROMPT = """You are the Senior Event Operations & Risk Intelligence Director for EventOps.
Your role is to evaluate unexpected changes (such as event schedule postponements or vendor contract cancellations) and propose concrete, safe, operational mitigations.

You must follow these rules:
1. Operational Buffer: Setup, delivery, and rehearsal tasks should finish at least 24 hours before the event starts.
2. Strict Task IDs: You must only reference task IDs that exist in the provided tasks snapshot. Never invent or hallucinate task IDs.
3. Proportional Shifting: When an event shifts forward or backward, dependent active tasks should be shifted by the same delta unless an insurmountable bottleneck prevents it.
4. Completed Tasks: Tasks that are already marked 'done' must never be shifted.
5. Vendor Cancellations: When a vendor contract is cancelled, identify all tasks dependent on that vendor's service and flag them as bottlenecks requiring immediate re-procurement.
6. Tone: Provide concise, professional, executive summaries and actionable rationale for every proposed change.
"""

def format_risk_analysis_prompt(
    event_summary: dict,
    trigger: str,
    tasks: list[dict],
    budget: dict,
    vendors: list[dict],
    engine_report_summary: str = "",
) -> str:
    """Formats the comprehensive context snapshot into a structured prompt."""
    tasks_text = "\n".join(
        f"- ID: {t.get('id')} | Title: '{t.get('title')}' | Status: {t.get('status')} | Due: {t.get('due_date')}"
        for t in tasks
    ) or "No active tasks recorded."

    vendors_text = "\n".join(
        f"- Booking ID: {v.get('booking_id')} | Vendor: '{v.get('vendor_name')}' ({v.get('vendor_category')}) | Status: {v.get('status')}"
        for v in vendors
    ) or "No vendor bookings recorded."

    budget_cats = budget.get("categories", [])
    budget_text = "\n".join(
        f"- Category ID: {c.get('id')} | Name: '{c.get('name')}' | Allocated: ${c.get('allocated_amount', 0)}"
        for c in budget_cats
    ) or "No budget categories recorded."

    return f"""### EVENT PROFILE
- Event Name: {event_summary.get('name')}
- Scheduled Dates: {event_summary.get('start_date')} to {event_summary.get('end_date')}
- Status: {event_summary.get('status')}

### TRIGGER CONDITION
{trigger}

### DETERMINISTIC ENGINE PRE-ASSESSMENT
{engine_report_summary or "No pre-calculated engine report available."}

### CURRENT EVENT TASKS
{tasks_text}

### CURRENT VENDOR CONTRACTS
{vendors_text}

### CURRENT BUDGET CATEGORIES
{budget_text}

Analyze the operational impacts of this trigger.
Formulate a structured RiskRemediationProposal containing:
1. Overall risk severity rating (low, medium, high, critical)
2. Executive impact summary
3. Chain-of-thought reasoning explaining your calculations
4. Specific task due date adjustments and actions
5. Any recommended contingency budget buffers
"""
EVENT_PLANNING_SYSTEM_PROMPT = """You are the Lead Event Operations Producer for EventOps.
Your role is to solve the cold-start problem for newly created events by synthesizing a comprehensive, chronological operational roadmap.

You must follow these rules:
1. Reverse Scheduling: All operational tasks and milestone deadlines must be calculated working backward from the event's start date (e.g., T-60 days for permits, T-14 days for vendor finalization, T-24h for load-in).
2. Granular Task Decomposition: Synthesize between 12 and 18 actionable, concrete tasks. Avoid vague placeholders; specify real operational steps (permits, power drops, security brief, A/V tech check, run-of-show review).
3. Logical Milestone Grouping: Group tasks into 3 to 5 milestone phases (e.g. 'Concept & Feasibility', 'Vendor & Venue Contracting', 'Technical & Operations Prep', 'Execution & Day-of Delivery').
4. Realistic Role Assignment: Recommend appropriate roles ('planner', 'coordinator', 'freelancer', 'volunteer') taking into account the available team roles in the organization.
5. Strict Schema Compliance: Formulate your plan strictly according to the EventPlanProposal schema with ISO 8601 timestamps for due dates.
"""


def format_event_planning_prompt(
    event_summary: dict,
    team: list[dict],
    existing_tasks: list[dict],
    planning_options: dict | None = None,
) -> str:
    """Formats event profile and team snapshot into an instruction prompt for the planning LLM."""
    opts = planning_options or {}
    category = opts.get("category", "General Event")
    target_scale = opts.get("scale", "standard")
    custom_notes = opts.get("notes", "None provided.")

    team_text = (
        "\n".join(
            f"- {m.get('username', 'User')} ({m.get('email')}) — Role: {m.get('role')}"
            for m in team
        )
        if team
        else "No team members currently registered."
    )

    tasks_count = len(existing_tasks)

    return f"""### EVENT TARGET PROFILE
- Event Name: {event_summary.get('name', 'Untitled Event')}
- Description: {event_summary.get('description') or 'No description provided.'}
- Start Date: {event_summary.get('start_date')}
- End Date: {event_summary.get('end_date')}
- Status: {event_summary.get('status', 'draft')}

### PLANNING PARAMETERS
- Event Category: {category}
- Scale / Scope: {target_scale}
- Custom Organizer Instructions: {custom_notes}
- Existing Tasks Already Present: {tasks_count}

### AVAILABLE ORGANIZATION TEAM
{team_text}

Generate a comprehensive EventPlanProposal:
1. Executive operational summary of the event roadmap
2. 3 to 5 operational milestone phases with deadlines scheduled before the event
3. 12 to 18 actionable tasks with relative lead-time due dates, priorities, and suggested roles
4. Clear reasoning explaining the milestone timeline breakdown
"""
