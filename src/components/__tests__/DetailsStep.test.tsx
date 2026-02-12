import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DetailsStep } from "@/components/DetailsStep";
import { initialWizardData } from "@/lib/types";

describe("DetailsStep", () => {
  it("renders water source dropdown", () => {
    render(<DetailsStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.getByLabelText(/water source/i)).toBeInTheDocument();
  });

  it("shows Mains, Bore, and Other as water source options", () => {
    render(<DetailsStep data={initialWizardData} onUpdate={vi.fn()} />);
    const select = screen.getByLabelText(/water source/i);
    expect(select).toHaveTextContent("Mains");
    expect(select).toHaveTextContent("Bore");
    expect(select).toHaveTextContent("Other");
    expect(select).not.toHaveTextContent("Tank");
  });

  it("does not show connection type when no water source selected", () => {
    render(<DetailsStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.queryByLabelText(/connection type/i)).not.toBeInTheDocument();
  });

  it("shows mains connection options when water source is mains", () => {
    const data = { ...initialWizardData, waterSource: "mains" as const };
    render(<DetailsStep data={data} onUpdate={vi.fn()} />);
    const select = screen.getByLabelText(/connection type/i);
    expect(select).toHaveTextContent("20mm Gate Valve");
    expect(select).toHaveTextContent("Tap");
    expect(select).toHaveTextContent("Unsure");
  });

  it("shows bore connection options when water source is bore", () => {
    const data = { ...initialWizardData, waterSource: "bore" as const };
    render(<DetailsStep data={data} onUpdate={vi.fn()} />);
    const select = screen.getByLabelText(/connection type/i);
    expect(select).toHaveTextContent("Pump in Well");
    expect(select).toHaveTextContent("Submersible");
    expect(select).toHaveTextContent("Unsure");
  });

  it("does not show connection type when water source is other", () => {
    const data = { ...initialWizardData, waterSource: "other" as const };
    render(<DetailsStep data={data} onUpdate={vi.fn()} />);
    expect(screen.queryByLabelText(/connection type/i)).not.toBeInTheDocument();
  });

  it("resets connection type when water source changes", async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(<DetailsStep data={initialWizardData} onUpdate={onUpdate} />);

    await user.selectOptions(screen.getByLabelText(/water source/i), "mains");
    expect(onUpdate).toHaveBeenCalledWith({ waterSource: "mains", connectionType: "" });
  });

  it("calls onUpdate when connection type changes", async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    const data = { ...initialWizardData, waterSource: "mains" as const };
    render(<DetailsStep data={data} onUpdate={onUpdate} />);

    await user.selectOptions(screen.getByLabelText(/connection type/i), "tap");
    expect(onUpdate).toHaveBeenCalledWith({ connectionType: "tap" });
  });
});
