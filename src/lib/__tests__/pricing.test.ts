import { describe, it, expect } from "vitest";
import { calculateQuote } from "@/lib/pricing";

const config = {
  lawn: { ratePerSqm: 12.5, label: "Lawn Irrigation" },
  garden: { ratePerSqm: 18.0, label: "Garden Irrigation" },
  controller: { manual: 0, automatic: 250, label: "Controller/Timer" },
  tapPoint: { ratePerPoint: 85, label: "Pipe & Fittings" },
  baseCost: 150,
};

describe("calculateQuote", () => {
  it("calculates a full quote with all inputs", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 120,
        gardenAreaSqm: 40,
        tapPoints: 2,
        controllerType: "automatic",
      },
      config
    );

    expect(result.lineItems).toEqual([
      { label: "Lawn Irrigation", detail: "120 m\u00B2", amount: 1500 },
      { label: "Garden Irrigation", detail: "40 m\u00B2", amount: 720 },
      { label: "Controller/Timer", detail: "Automatic", amount: 250 },
      { label: "Pipe & Fittings", detail: "2 tap points", amount: 170 },
      { label: "Base Cost", detail: "", amount: 150 },
    ]);
    expect(result.total).toBe(2790);
  });

  it("returns zero for lawn when area is 0", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 0,
        gardenAreaSqm: 50,
        tapPoints: 1,
        controllerType: "manual",
      },
      config
    );

    const lawnItem = result.lineItems.find(
      (i) => i.label === "Lawn Irrigation"
    );
    expect(lawnItem).toBeUndefined();
    expect(result.total).toBe(50 * 18 + 0 + 85 + 150);
  });

  it("returns zero for controller when manual", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 100,
        gardenAreaSqm: 0,
        tapPoints: 1,
        controllerType: "manual",
      },
      config
    );

    const controllerItem = result.lineItems.find(
      (i) => i.label === "Controller/Timer"
    );
    expect(controllerItem).toBeUndefined();
  });

  it("always includes base cost", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 0,
        gardenAreaSqm: 0,
        tapPoints: 0,
        controllerType: "manual",
      },
      config
    );

    expect(result.total).toBe(150);
    expect(result.lineItems).toEqual([
      { label: "Base Cost", detail: "", amount: 150 },
    ]);
  });
});
