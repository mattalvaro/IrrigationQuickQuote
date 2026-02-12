import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MapStep } from "@/components/MapStep";
import { initialWizardData } from "@/lib/types";

// Mock mapbox-gl since it requires a browser with WebGL
vi.mock("mapbox-gl", () => {
  const MapMock = vi.fn(function (this: Record<string, unknown>) {
    this.on = vi.fn();
    this.remove = vi.fn();
    this.addControl = vi.fn();
    this.getCanvas = vi.fn(() => ({ toDataURL: vi.fn(() => "data:image/png;base64,mock") }));
  });
  const NavigationControlMock = vi.fn(function () {});
  return {
    default: {
      Map: MapMock,
      NavigationControl: NavigationControlMock,
      accessToken: "",
    },
  };
});

vi.mock("@mapbox/mapbox-gl-draw", () => {
  const DrawMock = vi.fn(function (this: Record<string, unknown>) {
    this.getAll = vi.fn(() => ({ features: [] }));
    this.changeMode = vi.fn();
  });
  return { default: DrawMock };
});

vi.mock("@turf/area", () => ({
  default: vi.fn(() => 100),
}));

describe("MapStep", () => {
  it("renders address search input", () => {
    render(<MapStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.getByPlaceholderText(/enter your address/i)).toBeInTheDocument();
  });

  it("renders map container", () => {
    render(<MapStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  it("renders drawing mode buttons", () => {
    render(<MapStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.getByRole("button", { name: /draw lawn/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /draw garden/i })).toBeInTheDocument();
  });

  it("displays area totals", () => {
    render(<MapStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.getByText(/total lawn/i)).toBeInTheDocument();
    expect(screen.getByText(/total garden/i)).toBeInTheDocument();
  });

  it("shows default instruction text when no areas drawn", () => {
    render(<MapStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.getByTestId("map-instructions")).toHaveTextContent(
      "Click 'Draw Lawn' or 'Draw Garden' to start measuring an area."
    );
  });

  it("shows 'add another' instruction when areas exist", () => {
    const dataWithAreas = {
      ...initialWizardData,
      lawnAreas: [{ id: "feat-1", sqm: 50 }],
    };
    render(<MapStep data={dataWithAreas} onUpdate={vi.fn()} />);
    expect(screen.getByTestId("map-instructions")).toHaveTextContent(
      "Click 'Draw Lawn' or 'Draw Garden' to add another area."
    );
  });

  it("does not show area list when no areas drawn", () => {
    render(<MapStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.queryByTestId("area-list")).not.toBeInTheDocument();
  });

  it("renders individual areas with labels and delete buttons", () => {
    const dataWithAreas = {
      ...initialWizardData,
      lawnAreas: [
        { id: "lawn-1", sqm: 45 },
        { id: "lawn-2", sqm: 82 },
      ],
      gardenAreas: [{ id: "garden-1", sqm: 30 }],
    };
    render(<MapStep data={dataWithAreas} onUpdate={vi.fn()} />);

    const areaList = screen.getByTestId("area-list");
    expect(areaList).toBeInTheDocument();
    expect(within(areaList).getByText("Lawn 1")).toBeInTheDocument();
    expect(within(areaList).getByText("Lawn 2")).toBeInTheDocument();
    expect(within(areaList).getByText("Garden 1")).toBeInTheDocument();
    expect(within(areaList).getByText("45 m²")).toBeInTheDocument();
    expect(within(areaList).getByText("82 m²")).toBeInTheDocument();
    expect(within(areaList).getByText("30 m²")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete lawn 1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete lawn 2/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete garden 1/i })).toBeInTheDocument();
  });
});
