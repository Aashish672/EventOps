import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AnalyzeDocumentModal } from "../AnalyzeDocumentModal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgentRun, Document } from "../../../../api/types";

// Mock the useAnalyzeDocument hook
const mockMutateAsync = vi.fn();
let mockIsPending = false;

vi.mock("../../../../hooks/useAgents", () => ({
  useAnalyzeDocument: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}));

const mockCategories = [
  { id: "cat-1", event: "evt-123", name: "Catering", allocated_amount: "10000.00" },
  { id: "cat-2", event: "evt-123", name: "AV & Production", allocated_amount: "5000.00" },
];

vi.mock("../../../../hooks/useBudgets", () => ({
  useBudgetCategories: () => ({
    data: mockCategories,
    isLoading: false,
  }),
}));

const mockDoc: Document = {
  id: "doc-99",
  event: "evt-123",
  title: "Gourmet Catering Contract Quote v1",
  file_url: "https://storage.example.com/catering_quote.pdf",
  uploaded_by: 1,
  created_at: "2026-03-01T10:00:00Z",
  updated_at: "2026-03-01T10:00:00Z",
};

const mockRunResult: AgentRun = {
  id: "run-doc-intel-123",
  organization: "org-1",
  event: "evt-123",
  agent_type: "document_intelligence",
  trigger: "AI Contract Analysis for Gourmet Catering Contract Quote v1",
  input_snapshot: {
    document_id: "doc-99",
    document_title: "Gourmet Catering Contract Quote v1",
    vendor_name: "Gourmet Catering Co.",
    total_quoted_amount: "12500.00",
    budget_status: "exceeds_budget",
  },
  reasoning: "Extracted 3 line items totaling $12,500 which exceeds Catering allocation ($10,000).",
  proposed_diff: {
    mutations: [],
    vendor_name: "Gourmet Catering Co.",
    total_quoted_amount: "12500.00",
    budget_status: "exceeds_budget",
    variance_amount: "2500.00",
    negotiation_draft: "Dear Vendor, we request a 10% discount...",
  },
  final_diff: null,
  state: "pending",
  reviewed_by: null,
  reviewed_by_email: null,
  reviewed_at: null,
  created_at: "2026-03-01T10:05:00Z",
  updated_at: "2026-03-01T10:05:00Z",
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("AnalyzeDocumentModal Component", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  it("does not render when isOpen is false", () => {
    renderWithClient(
      <AnalyzeDocumentModal
        isOpen={false}
        onClose={mockOnClose}
        document={mockDoc}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render when document is null", () => {
    renderWithClient(
      <AnalyzeDocumentModal
        isOpen={true}
        onClose={mockOnClose}
        document={null}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders modal header, document title, category select, and preset scenarios", () => {
    renderWithClient(
      <AnalyzeDocumentModal
        isOpen={true}
        onClose={mockOnClose}
        document={mockDoc}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("AI Document Intelligence & Vendor Negotiator")).toBeInTheDocument();
    expect(screen.getByText("Gourmet Catering Contract Quote v1")).toBeInTheDocument();
    expect(screen.getByLabelText(/Target Budget Category/i)).toBeInTheDocument();
    expect(screen.getByText(/Catering \(Allocated: \$10,000\)/i)).toBeInTheDocument();
    expect(screen.getByText("Contract Item Extraction")).toBeInTheDocument();
    expect(screen.getByText("Vendor Rate Negotiation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run Contract Analysis/i })).toBeInTheDocument();
  });

  it("clicking a preset chip populates the notes textarea", () => {
    renderWithClient(
      <AnalyzeDocumentModal
        isOpen={true}
        onClose={mockOnClose}
        document={mockDoc}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    const textarea = screen.getByPlaceholderText(/Focus on audio equipment pricing/i);
    expect(textarea).toHaveValue("");

    const chip = screen.getByRole("button", { name: "Vendor Rate Negotiation" });
    fireEvent.click(chip);

    expect(textarea).toHaveValue(
      "Analyze rates for market inflation and draft a firm negotiation email requesting 10-15% discount or bundled services."
    );
  });

  it("submits mutation with selected category, custom notes and calls onSuccess", async () => {
    mockMutateAsync.mockResolvedValueOnce(mockRunResult);

    renderWithClient(
      <AnalyzeDocumentModal
        isOpen={true}
        onClose={mockOnClose}
        document={mockDoc}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    // Select category
    const categorySelect = screen.getByLabelText(/Target Budget Category/i);
    fireEvent.change(categorySelect, { target: { value: "cat-1" } });

    // Type notes
    const textarea = screen.getByPlaceholderText(/Focus on audio equipment pricing/i);
    fireEvent.change(textarea, { target: { value: "Verify net-30 terms and 10% discount" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /Run Contract Analysis/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        documentId: "doc-99",
        options: {
          target_category_id: "cat-1",
          target_category_name: "Catering",
          notes: "Verify net-30 terms and 10% discount",
          trigger_reason:
            "Contract analysis for Gourmet Catering Contract Quote v1: Verify net-30 terms and 10% discount",
        },
      });
      expect(mockOnSuccess).toHaveBeenCalledWith(mockRunResult);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("displays error message when analysis mutation fails", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("Document parsing failed due to timeout"));

    renderWithClient(
      <AnalyzeDocumentModal
        isOpen={true}
        onClose={mockOnClose}
        document={mockDoc}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Run Contract Analysis/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText("Document parsing failed due to timeout")
      ).toBeInTheDocument();
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it("closes modal on Cancel click", () => {
    renderWithClient(
      <AnalyzeDocumentModal
        isOpen={true}
        onClose={mockOnClose}
        document={mockDoc}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
