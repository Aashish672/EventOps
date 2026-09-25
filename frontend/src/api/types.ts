export interface Event {
  id: string;
  organization: string; // UUID
  name: string;
  event_type: string;
  status: "planning" | "confirmed" | "in_progress" | "completed" | "cancelled";
  venue_name: string;
  event_date: string;
  expected_guest_count: number;
  total_budget: string; // Decimal string
  primary_planner: number | null;
  client_share_token: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  event: string; // UUID
  title: string;
  description: string;
  status: "todo" | "in_progress" | "blocked" | "done";
  assignee: number | null;
  due_date: string | null;
  depends_on: string[]; // UUIDs
  created_by_agent: boolean;
  created_at: string;
}

export interface BudgetCategory {
  id: string;
  event: string;
  name: string;
  planned_amount: string; // Decimal string
}

export interface BudgetLineItem {
  id: string;
  category: string;
  vendor: string | null;
  description: string;
  planned_amount: string;
  actual_amount: string;
  paid: boolean;
  created_at: string;
}

export interface Vendor {
  id: string;
  organization: string;
  name: string;
  category: "venue" | "catering" | "decor" | "photography" | "entertainment" | "transport" | "other";
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  avg_rating: string;
  notes: string;
  created_at: string;
}

export interface VendorBooking {
  id: string;
  event: string;
  vendor: string;
  status: "inquired" | "quoted" | "contracted" | "confirmed" | "cancelled";
  quoted_amount: string | null;
  contract_terms: Record<string, unknown>;
  created_at: string;
}

export interface GuestHousehold {
  id: string;
  event: string;
  name: string;
  max_size: number;
}

export interface Guest {
  id: string;
  household: string;
  full_name: string;
  rsvp_status: "pending" | "yes" | "no" | "maybe";
  dietary_notes: string;
  accessibility_notes: string;
}

export interface Document {
  id: string;
  event: string;
  vendor_booking: string | null;
  doc_type: "contract" | "quote" | "floor_plan" | "other";
  file_path: string;
  version: number;
  uploaded_by: number | null;
  uploaded_at: string;
}
