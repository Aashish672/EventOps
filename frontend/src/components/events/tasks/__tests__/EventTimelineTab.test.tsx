import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EventTimelineTab } from "../../tabs/EventTimelineTab";
import { EventContext, EventContextType } from "../../../../context/EventContext";
import { OrganizationContext, OrganizationContextType } from "../../../../context/OrganizationContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Event, Task } from "../../../../api/types";
import { Membership } from "../../../../api/organizations";

// Mock task API hooks
const mockCreateTask = vi.fn();
const mockUpdateTask = vi.fn();
const mockDeleteTask = vi.fn();

vi.mock("../../../../hooks/useTasks", () => ({
  useTasks: vi.fn(),
  useCreateTask: () => ({
    mutateAsync: mockCreateTask,
    isPending: false,
  }),
  useUpdateTask: () => ({
    mutateAsync: mockUpdateTask,
    isPending: false,
  }),
  useDeleteTask: () => ({
    mutateAsync: mockDeleteTask,
    isPending: false,
  }),
}));

import { useTasks } from "../../../../hooks/useTasks";

const mockEvent: Event = {
  id: "evt-123",
  organization: "org-1",
  name: "Tech Summit 2026",
  description: "Annual conference",
  start_date: "2026-11-10T09:00:00Z",
  end_date: "2026-11-10T18:00:00Z",
  status: "planning",
  assigned_planner: 1,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const mockMembers: Membership[] = [
  {
    id: "mem-1",
    user_id: 1,
    username: "alice_planner",
    email: "alice@test.com",
    role: "planner",
    joined_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "mem-2",
    user_id: 2,
    username: "bob_coordinator",
    email: "bob@test.com",
    role: "coordinator",
    joined_at: "2026-09-01T00:00:00Z",
  },
];

const mockTasks: Task[] = [
  {
    id: "task-1",
    event: "evt-123",
    title: "Draft Event Schedule",
    description: "Prepare session time-slots",
    due_date: "2026-10-20T12:00:00Z",
    status: "todo",
    assigned_to: 1,
    created_at: "2026-09-10T00:00:00Z",
    updated_at: "2026-09-10T00:00:00Z",
  },
  {
    id: "task-2",
    event: "evt-123",
    title: "Contact Keynote Speaker",
    description: "Follow up on travel arrangements",
    due_date: "2026-10-15T12:00:00Z",
    status: "in_progress",
    assigned_to: 2,
    created_at: "2026-09-11T00:00:00Z",
    updated_at: "2026-09-11T00:00:00Z",
  },
  {
    id: "task-3",
    event: "evt-123",
    title: "Secure Venue Deposit",
    description: "Paid invoice #102",
    due_date: "2026-09-30T12:00:00Z",
    status: "done",
    assigned_to: 1,
    created_at: "2026-09-05T00:00:00Z",
    updated_at: "2026-09-15T00:00:00Z",
  },
];

const mockEventContext: EventContextType = {
  eventId: "evt-123",
  event: mockEvent,
  isLoading: false,
  error: null,
  activeTab: "timeline",
  refetch: vi.fn(),
};

const mockOrgContext: OrganizationContextType = {
  organizations: [],
  activeOrg: { id: "org-1", name: "Apex Agency", slug: "apex", created_at: "" },
  members: mockMembers,
  currentUserRole: "owner",
  loading: false,
  membersLoading: false,
  error: null,
  isUnauthenticated: false,
  isCreateModalOpen: false,
  openCreateModal: vi.fn(),
  closeCreateModal: vi.fn(),
  setActiveOrg: vi.fn(),
  refreshOrganizations: vi.fn(),
  createOrg: vi.fn(),
  inviteMember: vi.fn(),
  removeMember: vi.fn(),
};

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <OrganizationContext.Provider value={mockOrgContext}>
        <EventContext.Provider value={mockEventContext}>
          <MemoryRouter>
            <EventTimelineTab />
          </MemoryRouter>
        </EventContext.Provider>
      </OrganizationContext.Provider>
    </QueryClientProvider>
  );
}

describe("EventTimelineTab & Task Management (Epic 3.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useTasks as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    });
  });

  it("renders loading pulse skeleton while tasks are loading", () => {
    (useTasks as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: true,
    });

    const { container } = renderComponent();
    expect(container.querySelector(".placeholder-pulse")).toBeInTheDocument();
  });

  it("renders empty state when event has no tasks", () => {
    (useTasks as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderComponent();
    expect(screen.getByText("No Tasks Yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create First Task/i })).toBeInTheDocument();
  });

  it("renders Kanban Board with 3 status columns and correct tasks", () => {
    renderComponent();

    // Check Kanban columns
    expect(screen.getByRole("heading", { level: 3, name: "To Do" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "In Progress" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Done" })).toBeInTheDocument();

    // Check Tasks exist in their respective columns
    expect(screen.getByText("Draft Event Schedule")).toBeInTheDocument();
    expect(screen.getByText("Contact Keynote Speaker")).toBeInTheDocument();
    expect(screen.getByText("Secure Venue Deposit")).toBeInTheDocument();

    // Progress bar summary
    expect(screen.getByText("1 of 3 done (33%)")).toBeInTheDocument();
  });

  it("toggles between Kanban Board and List view", () => {
    renderComponent();

    // By default, Kanban board is active
    expect(screen.getByRole("region", { name: /Tasks Kanban Board/i })).toBeInTheDocument();

    // Click List view toggle button
    const listBtn = screen.getByRole("button", { name: /List view/i });
    fireEvent.click(listBtn);

    // List table is rendered
    expect(screen.getByRole("table", { name: /Task List/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Done" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Assignee" })).toBeInTheDocument();

    // Click Board view toggle button to switch back
    const boardBtn = screen.getByRole("button", { name: /Kanban Board view/i });
    fireEvent.click(boardBtn);

    expect(screen.getByRole("region", { name: /Tasks Kanban Board/i })).toBeInTheDocument();
  });

  it("filters tasks by search query", () => {
    renderComponent();

    const searchInput = screen.getByRole("textbox", { name: /Search tasks/i });
    fireEvent.change(searchInput, { target: { value: "Keynote" } });

    // Matching task should remain visible
    expect(screen.getByText("Contact Keynote Speaker")).toBeInTheDocument();
    // Non-matching tasks should not be rendered
    expect(screen.queryByText("Draft Event Schedule")).not.toBeInTheDocument();
    expect(screen.queryByText("Secure Venue Deposit")).not.toBeInTheDocument();
  });

  it("shows no matching tasks empty state when search finds no results", () => {
    renderComponent();

    const searchInput = screen.getByRole("textbox", { name: /Search tasks/i });
    fireEvent.change(searchInput, { target: { value: "NonExistentKeywordXYZ" } });

    expect(screen.getByText("No Matching Tasks")).toBeInTheDocument();

    // Clear filters button resets search
    const clearBtn = screen.getByRole("button", { name: /Clear Filters/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText("Draft Event Schedule")).toBeInTheDocument();
  });

  it("filters tasks by status dropdown", () => {
    renderComponent();

    const statusSelect = screen.getByRole("combobox", { name: /Filter tasks by status/i });
    fireEvent.change(statusSelect, { target: { value: "done" } });

    expect(screen.getByText("Secure Venue Deposit")).toBeInTheDocument();
    expect(screen.queryByText("Draft Event Schedule")).not.toBeInTheDocument();
  });

  it("opens create task modal, validates, and submits new task", async () => {
    mockCreateTask.mockResolvedValueOnce({ id: "task-new", title: "Order Badges" });
    renderComponent();

    // Click "+ Add Task" button
    const addBtn = screen.getByRole("button", { name: "Add Task" });
    fireEvent.click(addBtn);

    // Modal opens
    expect(screen.getByRole("heading", { level: 3, name: "Create New Task" })).toBeInTheDocument();

    // Fill task title
    const titleInput = screen.getByLabelText(/Task Title/i);
    fireEvent.change(titleInput, { target: { value: "Order Badges & Lanyards" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /Create Task/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "evt-123",
          title: "Order Badges & Lanyards",
          status: "todo",
        })
      );
    });
  });

  it("triggers status transition when clicking quick action button", async () => {
    mockUpdateTask.mockResolvedValueOnce({ id: "task-1", status: "in_progress" });
    renderComponent();

    // "Draft Event Schedule" is in "todo", so it has a "Start" button
    const startBtn = screen.getByRole("button", { name: /Start/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith({
        id: "task-1",
        payload: { status: "in_progress" },
      });
    });
  });

  it("opens delete confirmation modal and deletes task", async () => {
    mockDeleteTask.mockResolvedValueOnce(undefined);
    renderComponent();

    // Switch to list view to access action buttons easily
    const listBtn = screen.getByRole("button", { name: /List view/i });
    fireEvent.click(listBtn);

    // Find delete button for first task
    const deleteBtn = screen.getByRole("button", { name: /Delete Draft Event Schedule/i });
    fireEvent.click(deleteBtn);

    // Delete modal opens
    expect(screen.getByRole("heading", { level: 3, name: "Delete Task" })).toBeInTheDocument();
    expect(screen.getAllByText("Draft Event Schedule").length).toBeGreaterThanOrEqual(1);

    // Click Confirm Delete
    const confirmBtn = screen.getByRole("button", { name: "Delete Task" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteTask).toHaveBeenCalledWith("task-1");
    });
  });
});
