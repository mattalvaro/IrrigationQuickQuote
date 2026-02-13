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
    // lawn 1500 + garden 720 + lawnSprinkler 180 + gardenSprinkler 180 + lawnNozzle 90 + gardenNozzle 90 + controller 250 + base 150 = 3160
    expect(screen.getByText(/\$3,160/)).toBeInTheDocument();
  });

  it("displays line items", () => {
    render(<EstimateStep data={mockData} />);
    expect(screen.getByText(/lawn irrigation/i)).toBeInTheDocument();
    expect(screen.getByText(/garden irrigation/i)).toBeInTheDocument();
    expect(screen.getByText(/lawn sprinkler type/i)).toBeInTheDocument();
    expect(screen.getByText(/garden sprinkler type/i)).toBeInTheDocument();
    expect(screen.getByText(/lawn nozzle type/i)).toBeInTheDocument();
    expect(screen.getByText(/garden nozzle type/i)).toBeInTheDocument();
    expect(screen.getByText(/controller/i)).toBeInTheDocument();
  });

  it("displays the guide price disclaimer", () => {
    render(<EstimateStep data={mockData} />);
    expect(screen.getByText(/guide price only/i)).toBeInTheDocument();
  });
});
