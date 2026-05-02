import React from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProtectedTranslationText } from "@/components/invitation/protected-translation-text";

vi.stubGlobal("React", React);

describe("ProtectedTranslationText", () => {
  it("marks fixed invitation phrases as non-translatable", () => {
    render(<ProtectedTranslationText text="Dress Code - Black Tie e abito lungo" />);

    const dressCode = screen.getByText("Dress Code - Black tie e abito lungo");

    expect(dressCode).toHaveAttribute("translate", "no");
    expect(dressCode).toHaveClass("notranslate");
  });

  it("protects walking dinner inside longer labels", () => {
    render(<ProtectedTranslationText text="Walking dinner - Thursday, August 27th, 19h30" />);

    expect(screen.getByText("Walking dinner")).toHaveAttribute("translate", "no");
  });

  it("renders the old English dress-code phrase as the preferred mixed wording", () => {
    render(<ProtectedTranslationText text="Dress code - Black Tie and Long Dress" />);

    expect(screen.getByText("Dress Code - Black tie e abito lungo")).toHaveAttribute(
      "translate",
      "no",
    );
    expect(screen.queryByText("Black Tie and Long Dress")).not.toBeInTheDocument();
  });

  it("keeps the spaced separator inside casual chic dress-code lines", () => {
    render(<ProtectedTranslationText text="Dress Code- Casual Chic" />);

    expect(screen.getByText("Dress Code - Casual Chic")).toHaveAttribute("translate", "no");
  });
});
