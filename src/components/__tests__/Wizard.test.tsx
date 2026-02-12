import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Wizard } from "@/components/Wizard";

describe("Wizard", () => {
  it("renders the welcome step by default", () => {
    render(<Wizard />);
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });

  it("shows step progress indicator", () => {
    render(<Wizard />);
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
  });

  it("navigates to next step when Next is clicked", async () => {
    const user = userEvent.setup();
    render(<Wizard />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 2 of 5/i)).toBeInTheDocument();
  });

  it("navigates back when Back is clicked", async () => {
    const user = userEvent.setup();
    render(<Wizard />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
  });

  it("does not show Back button on first step", () => {
    render(<Wizard />);
    expect(
      screen.queryByRole("button", { name: /back/i })
    ).not.toBeInTheDocument();
  });
});
