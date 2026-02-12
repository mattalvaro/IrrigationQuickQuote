import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeadCaptureStep } from "@/components/LeadCaptureStep";
import { initialWizardData } from "@/lib/types";

describe("LeadCaptureStep", () => {
  it("renders name, email, and phone fields", () => {
    render(<LeadCaptureStep data={initialWizardData} onUpdate={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  it("renders a submit button", () => {
    render(<LeadCaptureStep data={initialWizardData} onUpdate={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /get my estimate/i })).toBeInTheDocument();
  });

  it("calls onUpdate when fields change", async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(<LeadCaptureStep data={initialWizardData} onUpdate={onUpdate} onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/name/i), "Jane");
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: "J" }));
  });

  it("calls onSubmit when form is submitted", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const data = {
      ...initialWizardData,
      name: "Jane",
      email: "jane@example.com",
      phone: "0400000000",
    };
    render(<LeadCaptureStep data={data} onUpdate={vi.fn()} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /get my estimate/i }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("shows guide price disclaimer", () => {
    render(<LeadCaptureStep data={initialWizardData} onUpdate={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByText(/guide price/i)).toBeInTheDocument();
  });
});
