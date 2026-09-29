import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { DocumentList } from "../DocumentList";
import { DocumentModal } from "../DocumentModal";
import { DeleteDocumentModal } from "../DeleteDocumentModal";
import { EventDocumentsTab } from "../../tabs/EventDocumentsTab";
import { EventContext, EventContextType } from "../../../../context/EventContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Document, Event } from "../../../../api/types";
import { detectDocumentType, isValidUrl } from "../documentUtils";

// Mock mutations
const mockCreateDocument = vi.fn();
const mockUpdateDocument = vi.fn();
const mockDeleteDocument = vi.fn();

vi.mock("../../../../hooks/useDocuments", () => ({
  useDocuments: vi.fn(),
  useCreateDocument: () => ({ mutateAsync: mockCreateDocument, isPending: false }),
  useUpdateDocument: () => ({ mutateAsync: mockUpdateDocument, isPending: false }),
  useDeleteDocument: () => ({ mutateAsync: mockDeleteDocument, isPending: false }),
}));

import { useDocuments } from "../../../../hooks/useDocuments";

const mockEvent: Event = {
  id: "evt-doc-1",
  organization: "org-1",
  name: "Spring Gala 2026",
  description: "Spring gala event",
  start_date: "2026-05-15T18:00:00Z",
  end_date: "2026-05-15T23:00:00Z",
  status: "planning",
  assigned_planner: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockEventContext: EventContextType = {
  eventId: "evt-doc-1",
  event: mockEvent,
  isLoading: false,
  error: null,
  activeTab: "overview",
  refetch: vi.fn(),
};

const mockDocuments: Document[] = [
  {
    id: "doc-1",
    event: "evt-doc-1",
    title: "Master Venue Contract",
    file_url: "https://storage.example.com/contracts/venue_contract.pdf",
    uploaded_by: 1,
    created_at: "2026-02-10T14:30:00Z",
    updated_at: "2026-02-10T14:30:00Z",
  },
  {
    id: "doc-2",
    event: "evt-doc-1",
    title: "Seating Layout & Floor Plan",
    file_url: "https://storage.example.com/assets/floor_plan_v2.png",
    uploaded_by: 1,
    created_at: "2026-02-12T10:15:00Z",
    updated_at: "2026-02-12T10:15:00Z",
  },
  {
    id: "doc-3",
    event: "evt-doc-1",
    title: "Catering Budget Estimates",
    file_url: "https://docs.google.com/spreadsheets/d/catering_estimate",
    uploaded_by: null,
    created_at: "2026-02-15T09:00:00Z",
    updated_at: "2026-02-15T09:00:00Z",
  },
];

describe("documentUtils helper functions", () => {
  it("detects PDF category correctly", () => {
    const res = detectDocumentType("https://example.com/file.pdf");
    expect(res.category).toBe("pdf");
    expect(res.label).toBe("PDF");
  });

  it("detects spreadsheet category correctly", () => {
    const res = detectDocumentType("https://example.com/budget.xlsx");
    expect(res.category).toBe("sheet");
    expect(res.label).toBe("Spreadsheet");
  });

  it("detects image category correctly", () => {
    const res = detectDocumentType("https://example.com/photo.jpeg");
    expect(res.category).toBe("image");
    expect(res.label).toBe("Image");
  });

  it("detects document category correctly", () => {
    const res = detectDocumentType("https://example.com/terms.docx");
    expect(res.category).toBe("doc");
    expect(res.label).toBe("Document");
  });

  it("detects generic link category for unknown extensions", () => {
    const res = detectDocumentType("https://example.com/link");
    expect(res.category).toBe("link");
    expect(res.label).toBe("Link / File");
  });

  it("validates valid http and https URLs", () => {
    expect(isValidUrl("https://example.com/file.pdf")).toBe(true);
    expect(isValidUrl("http://localhost:8000/doc")).toBe(true);
    expect(isValidUrl("not-a-url")).toBe(false);
    expect(isValidUrl("ftp://file.com")).toBe(false);
  });
});

describe("DocumentModal Component", () => {
  it("renders in create mode with empty fields", () => {
    render(
      <DocumentModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Attach Document" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Document Title/i)).toHaveValue("");
    expect(screen.getByLabelText(/File \/ Document Link/i)).toHaveValue("");
    expect(screen.getByRole("button", { name: "Attach Document" })).toBeInTheDocument();
  });

  it("renders in edit mode with prefilled values", () => {
    render(
      <DocumentModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initialDocument={mockDocuments[0]}
      />
    );

    expect(screen.getByRole("heading", { name: "Edit Document" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Document Title/i)).toHaveValue("Master Venue Contract");
    expect(screen.getByLabelText(/File \/ Document Link/i)).toHaveValue(
      "https://storage.example.com/contracts/venue_contract.pdf"
    );
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("validates required title field", async () => {
    const mockSubmit = vi.fn();
    render(
      <DocumentModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={mockSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/File \/ Document Link/i), {
      target: { value: "https://example.com/doc.pdf" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Attach Document" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Document title is required.");
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("validates required file URL field", async () => {
    const mockSubmit = vi.fn();
    render(
      <DocumentModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={mockSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/Document Title/i), {
      target: { value: "Run of Show" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Attach Document" }));

    expect(screen.getByRole("alert")).toHaveTextContent("File URL is required.");
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("validates invalid URL format", async () => {
    const mockSubmit = vi.fn();
    render(
      <DocumentModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={mockSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/Document Title/i), {
      target: { value: "Run of Show" },
    });
    fireEvent.change(screen.getByLabelText(/File \/ Document Link/i), {
      target: { value: "not-a-valid-url" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Attach Document" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a valid URL");
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("submits valid document and calls onClose", async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn();

    render(
      <DocumentModal
        isOpen={true}
        onClose={mockClose}
        onSubmit={mockSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/Document Title/i), {
      target: { value: "Vendor Agreement" },
    });
    fireEvent.change(screen.getByLabelText(/File \/ Document Link/i), {
      target: { value: "https://storage.example.com/vendor.pdf" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Attach Document" }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        title: "Vendor Agreement",
        file_url: "https://storage.example.com/vendor.pdf",
      });
      expect(mockClose).toHaveBeenCalled();
    });
  });

  it("displays server error if onSubmit rejects", async () => {
    const mockSubmit = vi.fn().mockRejectedValue(new Error("Storage limit exceeded"));
    render(
      <DocumentModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={mockSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/Document Title/i), {
      target: { value: "Vendor Agreement" },
    });
    fireEvent.change(screen.getByLabelText(/File \/ Document Link/i), {
      target: { value: "https://storage.example.com/vendor.pdf" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Attach Document" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Storage limit exceeded");
    });
  });
});

describe("DeleteDocumentModal Component", () => {
  it("renders document title and confirmation message", () => {
    render(
      <DeleteDocumentModal
        isOpen={true}
        document={mockDocuments[0]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Delete Document" })).toBeInTheDocument();
    expect(screen.getByText("Master Venue Contract")).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove this document/i)).toBeInTheDocument();
  });

  it("calls onConfirm with document ID and calls onClose", async () => {
    const mockConfirm = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn();

    render(
      <DeleteDocumentModal
        isOpen={true}
        document={mockDocuments[0]}
        onClose={mockClose}
        onConfirm={mockConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Document" }));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith("doc-1");
      expect(mockClose).toHaveBeenCalled();
    });
  });
});

describe("DocumentList Component", () => {
  it("renders loading state when isLoading is true", () => {
    render(
      <DocumentList
        documents={[]}
        isLoading={true}
        onAddDocument={vi.fn()}
        onEditDocument={vi.fn()}
        onDeleteDocument={vi.fn()}
      />
    );

    expect(screen.getByText("Loading event documents...")).toBeInTheDocument();
  });

  it("renders empty state when documents list is empty", () => {
    const mockAdd = vi.fn();
    render(
      <DocumentList
        documents={[]}
        isLoading={false}
        onAddDocument={mockAdd}
        onEditDocument={vi.fn()}
        onDeleteDocument={vi.fn()}
      />
    );

    expect(screen.getByText("No documents attached yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Attach First Document/i }));
    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it("renders documents table with rows, badges, and action buttons", () => {
    const mockEdit = vi.fn();
    const mockDelete = vi.fn();

    render(
      <DocumentList
        documents={mockDocuments}
        isLoading={false}
        onAddDocument={vi.fn()}
        onEditDocument={mockEdit}
        onDeleteDocument={mockDelete}
      />
    );

    expect(screen.getByText("Master Venue Contract")).toBeInTheDocument();
    expect(screen.getByText("Seating Layout & Floor Plan")).toBeInTheDocument();
    expect(screen.getByText("Catering Budget Estimates")).toBeInTheDocument();

    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("Image")).toBeInTheDocument();
    expect(screen.getByText("Spreadsheet")).toBeInTheDocument();

    // Trigger Edit
    fireEvent.click(screen.getByLabelText("Edit Master Venue Contract"));
    expect(mockEdit).toHaveBeenCalledWith(mockDocuments[0]);

    // Trigger Delete
    fireEvent.click(screen.getByLabelText("Delete Master Venue Contract"));
    expect(mockDelete).toHaveBeenCalledWith(mockDocuments[0]);
  });

  it("filters documents based on search query", () => {
    render(
      <DocumentList
        documents={mockDocuments}
        isLoading={false}
        onAddDocument={vi.fn()}
        onEditDocument={vi.fn()}
        onDeleteDocument={vi.fn()}
      />
    );

    const searchInput = screen.getByLabelText("Search documents");
    fireEvent.change(searchInput, { target: { value: "floor plan" } });

    expect(screen.getByText("Seating Layout & Floor Plan")).toBeInTheDocument();
    expect(screen.queryByText("Master Venue Contract")).not.toBeInTheDocument();
    expect(screen.queryByText("Catering Budget Estimates")).not.toBeInTheDocument();
  });

  it("shows search empty state when no documents match query", () => {
    render(
      <DocumentList
        documents={mockDocuments}
        isLoading={false}
        onAddDocument={vi.fn()}
        onEditDocument={vi.fn()}
        onDeleteDocument={vi.fn()}
      />
    );

    const searchInput = screen.getByLabelText("Search documents");
    fireEvent.change(searchInput, { target: { value: "nonexistent query" } });

    expect(screen.getByText("No matching documents")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear Search" }));

    expect(screen.getByText("Master Venue Contract")).toBeInTheDocument();
  });
});

describe("EventDocumentsTab Integration (Sub-Task 3.7.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useDocuments as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockDocuments,
      isLoading: false,
    });
  });

  it("opens create modal from header button and submits new document", async () => {
    mockCreateDocument.mockResolvedValueOnce({ id: "doc-new" });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EventContext.Provider value={mockEventContext}>
            <EventDocumentsTab />
          </EventContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole("heading", { level: 2, name: "Event Documents" })).toBeInTheDocument();

    // Click Attach Document
    fireEvent.click(screen.getByRole("button", { name: /Attach Document/i }));

    expect(screen.getByRole("heading", { name: "Attach Document" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Document Title/i), {
      target: { value: "Acoustics Spec Sheet" },
    });
    fireEvent.change(screen.getByLabelText(/File \/ Document Link/i), {
      target: { value: "https://example.com/acoustics.pdf" },
    });

    const modal = screen.getByRole("dialog");
    fireEvent.click(within(modal).getByRole("button", { name: "Attach Document" }));

    await waitFor(() => {
      expect(mockCreateDocument).toHaveBeenCalledWith({
        title: "Acoustics Spec Sheet",
        file_url: "https://example.com/acoustics.pdf",
        event: "evt-doc-1",
      });
    });
  });

  it("opens edit modal from row action and submits updated document", async () => {
    mockUpdateDocument.mockResolvedValueOnce({ id: "doc-1" });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EventContext.Provider value={mockEventContext}>
            <EventDocumentsTab />
          </EventContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Click edit on the first row
    fireEvent.click(screen.getByLabelText("Edit Master Venue Contract"));

    expect(screen.getByRole("heading", { name: "Edit Document" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Document Title/i), {
      target: { value: "Master Venue Contract - Signed" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockUpdateDocument).toHaveBeenCalledWith({
        id: "doc-1",
        payload: {
          title: "Master Venue Contract - Signed",
          file_url: "https://storage.example.com/contracts/venue_contract.pdf",
          event: "evt-doc-1",
        },
      });
    });
  });

  it("opens delete modal from row action and deletes document", async () => {
    mockDeleteDocument.mockResolvedValueOnce(undefined);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EventContext.Provider value={mockEventContext}>
            <EventDocumentsTab />
          </EventContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Click delete on the first row
    fireEvent.click(screen.getByLabelText("Delete Master Venue Contract"));

    expect(screen.getByRole("heading", { name: "Delete Document" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete Document" }));

    await waitFor(() => {
      expect(mockDeleteDocument).toHaveBeenCalledWith("doc-1");
    });
  });
});
