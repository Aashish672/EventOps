/**
 * Shared TypeScript types for the EventOps frontend.
 * These interfaces mirror the Django REST Framework serializer fields EXACTLY.
 *
 * Source of truth:
 *   - backend/apps/events/serializers.py
 *   - backend/apps/vendors/serializers.py
 */

// ─── Events ──────────────────────────────────────────────────────────────────

export interface Event {
  id: string;
  organization: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: "draft" | "planning" | "active" | "completed" | "cancelled";
  assigned_planner: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  event: string;
  title: string;
  description: string;
  due_date: string | null;
  status: "todo" | "in_progress" | "done";
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Budget ──────────────────────────────────────────────────────────────────

export interface BudgetLineItem {
  id: string;
  category: string;
  event: string;
  description: string;
  estimated_cost: string;
  actual_cost: string;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: string;
  event: string;
  name: string;
  allocated_amount: string;
  line_items: BudgetLineItem[];
  created_at: string;
  updated_at: string;
}

// ─── Vendors ─────────────────────────────────────────────────────────────────

export interface Vendor {
  id: string;
  organization: string;
  name: string;
  category: "venue" | "catering" | "florist" | "photography" | "entertainment" | "other";
  email: string;
  phone: string;
  website: string;
  point_of_contact: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface VendorBooking {
  id: string;
  event: string;
  vendor: string;
  status: "inquiry" | "contract_sent" | "booked" | "rejected";
  agreed_price: string | null;
  contract_notes: string;
  created_at: string;
  updated_at: string;
}

// ─── Guests ──────────────────────────────────────────────────────────────────

export interface GuestHousehold {
  id: string;
  event: string;
  name: string;
  address: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  household: string;
  event: string;
  first_name: string;
  last_name: string;
  rsvp_status: "pending" | "attending" | "declined";
  dietary_restrictions: string;
  created_at: string;
  updated_at: string;
}

// ─── Documents ───────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  event: string;
  title: string;
  file_url: string;
  uploaded_by: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Agent Governance & Audit Log ───────────────────────────────────────────

export interface MutationItem {
  action: "update" | "create" | "delete";
  entity_type: "Task" | "BudgetCategory" | "BudgetLineItem" | "VendorBooking";
  entity_id?: string;
  fields: Record<string, unknown>;
}

export interface ProposalDiff {
  mutations: MutationItem[];
  [key: string]: unknown;
}

export interface AgentRun {
  id: string;
  organization: string;
  event: string;
  agent_type:
    | "document_intelligence"
    | "event_planning"
    | "budget_intelligence"
    | "vendor_evaluation"
    | "risk_change_impact";
  trigger: string;
  input_snapshot: Record<string, unknown>;
  reasoning: string;
  proposed_diff: ProposalDiff;
  final_diff: ProposalDiff | null;
  state: "pending" | "approved" | "rejected" | "edited_approved";
  reviewed_by: number | null;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChangeLogEntry {
  id: string;
  organization: string;
  event: string;
  actor_type: "user" | "agent";
  actor_id: string;
  entity_type: string;
  entity_id: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  agent_run: string | null;
  created_at: string;
}

