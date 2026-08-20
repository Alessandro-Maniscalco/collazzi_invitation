import React, { type AnchorHTMLAttributes, type ReactNode } from "react";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SeatingPlanner } from "@/components/host/seating-planner";
import type { SeatingSnapshot } from "@/lib/seating";

type MockLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children?: ReactNode;
};

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: MockLinkProps) =>
    React.createElement("a", { ...props, href }, children),
}));

vi.stubGlobal("React", React);

afterEach(() => cleanup());

describe("SeatingPlanner", () => {
  it("keeps the compact table-name target centered around only its text", () => {
    const initialData: SeatingSnapshot = {
      tables: [{ id: 1, name: "Table 1" }],
      guests: [],
    };

    render(React.createElement(SeatingPlanner, { initialData }));

    const tableName = screen.getByRole("button", { name: "Table 1" });
    expect(tableName).toHaveClass("mx-auto", "w-fit", "max-w-full");
    expect(tableName).not.toHaveClass("w-full");
  });

  it("filters the alphabetical unseated list from the top search field", () => {
    const initialData: SeatingSnapshot = {
      tables: [{ id: 1, name: "Table 1" }],
      guests: [
        {
          id: "party-1:guest_1",
          partyId: "party-1",
          member: "guest_1",
          firstName: "Alessandra",
          lastName: "Rossi",
          checkedIn: false,
        },
        {
          id: "party-2:guest_1",
          partyId: "party-2",
          member: "guest_1",
          firstName: "Béatrice",
          lastName: "Bianchi",
          checkedIn: false,
        },
      ],
    };

    render(React.createElement(SeatingPlanner, { initialData }));

    fireEvent.change(screen.getByRole("searchbox", { name: "Search unseated guests" }), {
      target: { value: "beatrice" },
    });

    expect(screen.getByText("Béatrice Bianchi")).toBeInTheDocument();
    expect(screen.queryByText("Alessandra Rossi")).not.toBeInTheDocument();
    expect(screen.getByText("1 of 2 guests · alphabetical")).toBeInTheDocument();
  });
});
