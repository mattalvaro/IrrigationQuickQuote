import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Wizard } from "@/components/Wizard";

// Mock mapbox-gl since MapStep requires WebGL
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
  default: vi.fn(() => 0),
}));

describe("Wizard", () => {
  it("renders the welcome step by default", () => {
    render(<Wizard />);
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });

  it("shows step progress indicator (no areas drawn = 6 steps)", () => {
    render(<Wizard />);
    // With no lawn/garden areas, sprinkler and nozzle steps are filtered out
    // welcome, map, controllerType, details, estimate, lead = 6
    expect(screen.getByText(/step 1 of 6/i)).toBeInTheDocument();
  });

  it("navigates to next step when Next is clicked", async () => {
    const user = userEvent.setup();
    render(<Wizard />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 2 of 6/i)).toBeInTheDocument();
  });

  it("navigates back when Back is clicked", async () => {
    const user = userEvent.setup();
    render(<Wizard />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText(/step 1 of 6/i)).toBeInTheDocument();
  });

  it("does not show Back button on first step", () => {
    render(<Wizard />);
    expect(
      screen.queryByRole("button", { name: /back/i })
    ).not.toBeInTheDocument();
  });
});
