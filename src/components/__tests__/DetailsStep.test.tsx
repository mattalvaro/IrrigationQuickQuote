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

  it("renders tap points input", () => {
    render(<DetailsStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.getByLabelText(/tap points/i)).toBeInTheDocument();
  });

  it("renders controller type toggle", () => {
    render(<DetailsStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.getByLabelText(/automatic/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/manual/i)).toBeInTheDocument();
  });

  it("calls onUpdate when water source changes", async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(<DetailsStep data={initialWizardData} onUpdate={onUpdate} />);

    await user.selectOptions(screen.getByLabelText(/water source/i), "city");
    expect(onUpdate).toHaveBeenCalledWith({ waterSource: "city" });
  });

  it("calls onUpdate when tap points changes", async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(
      <DetailsStep
        data={{ ...initialWizardData, tapPoints: 0 }}
        onUpdate={onUpdate}
      />
    );

    const input = screen.getByLabelText(/tap points/i);
    await user.type(input, "3");
    expect(onUpdate).toHaveBeenCalledWith({ tapPoints: 3 });
  });

  it("calls onUpdate when controller type changes", async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(<DetailsStep data={initialWizardData} onUpdate={onUpdate} />);

    await user.click(screen.getByLabelText(/manual/i));
    expect(onUpdate).toHaveBeenCalledWith({ controllerType: "manual" });
  });
});
