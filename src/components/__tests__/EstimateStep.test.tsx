import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EstimateStep } from "@/components/EstimateStep";
import { WizardData } from "@/lib/types";

const mockData: WizardData = {
  lawnAreas: [{ id: "1", sqm: 120 }],
  gardenAreas: [{ id: "2", sqm: 40 }],
  mapSnapshot: null,
  lawnSprinklerType: "popUp",
  gardenSprinklerType: "popUp",
  lawnNozzleType: "fixedSpray",
  gardenNozzleType: "fixedSpray",
  controllerType: "digitalTimer",
  waterSource: "mains",
  connectionType: "tap",
  name: "",
  email: "",
  phone: "",
};

describe("EstimateStep", () => {
  it("displays the total estimate", () => {
    render(<EstimateStep data={mockData} />);
    // lawn 120×6.50=780 + garden 40×6.50=260 + sprinklers/nozzles/digitalTimer=0 + base 150 = 1190
    expect(screen.getByText(/\$1,190/)).toBeInTheDocument();
  });

  it("displays line items", () => {
    render(<EstimateStep data={mockData} />);
    expect(screen.getByText(/lawn irrigation/i)).toBeInTheDocument();
    expect(screen.getByText(/garden irrigation/i)).toBeInTheDocument();
    expect(screen.getByText(/base cost/i)).toBeInTheDocument();
  });

  it("displays the guide price disclaimer", () => {
    render(<EstimateStep data={mockData} />);
    expect(screen.getByText(/guide price only/i)).toBeInTheDocument();
  });
});
