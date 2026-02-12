import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EstimateStep } from "@/components/EstimateStep";
import { WizardData } from "@/lib/types";

const mockData: WizardData = {
  lawnAreas: [{ id: "1", sqm: 120 }],
  gardenAreas: [{ id: "2", sqm: 40 }],
  mapSnapshot: null,
  waterSource: "city",
  tapPoints: 2,
  controllerType: "automatic",
  name: "",
  email: "",
  phone: "",
};

describe("EstimateStep", () => {
  it("displays the total estimate", () => {
    render(<EstimateStep data={mockData} />);
    expect(screen.getByText(/\$2,790/)).toBeInTheDocument();
  });

  it("displays line items", () => {
    render(<EstimateStep data={mockData} />);
    expect(screen.getByText(/lawn irrigation/i)).toBeInTheDocument();
    expect(screen.getByText(/garden irrigation/i)).toBeInTheDocument();
    expect(screen.getByText(/controller/i)).toBeInTheDocument();
  });

  it("displays the guide price disclaimer", () => {
    render(<EstimateStep data={mockData} />);
    expect(screen.getByText(/guide price only/i)).toBeInTheDocument();
  });
});
