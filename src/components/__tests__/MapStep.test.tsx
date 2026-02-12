import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
