import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiffViewer } from "../DiffViewer";
import { ProposalDiff } from "../../../../api/types";

describe("DiffViewer Component", () => {
  it("renders empty state when diff has no mutations", () => {
    const emptyDiff: ProposalDiff = { mutations: [] };
    render(<DiffViewer diff={emptyDiff} />);

    expect(
      screen.getByText(/No structured mutations specified in proposal diff/i)
    ).toBeInTheDocument();
  });

  it("renders mutation cards with entity type, action badge, and field values", () => {
    const sampleDiff: ProposalDiff = {
      mutations: [
        {
          action: "update",
          entity_type: "Task",
          entity_id: "task-12345678",
          fields: {
            status: "in_progress",
            title: "Updated Task Title",
          },
        },
        {
          action: "create",
          entity_type: "BudgetLineItem",
          fields: {
            description: "Extra Lighting",
            estimated_cost: "1500.00",
          },
        },
      ],
    };

    render(<DiffViewer diff={sampleDiff} />);

    expect(screen.getByText("Proposed Operations (2)")).toBeInTheDocument();
    expect(screen.getByText("Task")).toBeInTheDocument();
    expect(screen.getByText("BudgetLineItem")).toBeInTheDocument();
    expect(screen.getByText("UPDATE")).toBeInTheDocument();
    expect(screen.getByText("CREATE")).toBeInTheDocument();
    expect(screen.getByText("in_progress")).toBeInTheDocument();
    expect(screen.getByText("Updated Task Title")).toBeInTheDocument();
    expect(screen.getByText("Extra Lighting")).toBeInTheDocument();
  });
});
