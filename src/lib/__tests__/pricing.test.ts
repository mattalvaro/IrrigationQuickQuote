import { describe, it, expect } from "vitest";
import { calculateQuote } from "@/lib/pricing";

const config = {
  lawn: { ratePerSqm: 12.5, label: "Lawn Irrigation" },
  garden: { ratePerSqm: 18.0, label: "Garden Irrigation" },
  sprinkler: {
    popUp: { cost: 180, label: "Pop-up Sprinklers" },
    rotor: { cost: 320, label: "Rotor Sprinklers" },
    dripLine: { cost: 220, label: "Drip Line" },
    label: "Sprinkler Type",
  },
  nozzle: {
    fixedSpray: { cost: 90, label: "Fixed Spray" },
    adjustable: { cost: 120, label: "Adjustable" },
    mpRotator: { cost: 180, label: "MP Rotator" },
    label: "Nozzle Type",
  },
  controller: {
    manualTapTimer: { cost: 0, label: "Manual Tap Timer" },
    digitalTimer: { cost: 250, label: "Digital Timer" },
    smartWifi: { cost: 450, label: "Smart Wi-Fi Controller" },
    label: "Controller/Timer",
  },
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
        sprinklerType: "popUp",
        nozzleType: "fixedSpray",
        controllerType: "digitalTimer",
      },
      config
    );

    expect(result.lineItems).toEqual([
      { label: "Lawn Irrigation", detail: "120 m\u00B2", amount: 1500 },
      { label: "Garden Irrigation", detail: "40 m\u00B2", amount: 720 },
      { label: "Sprinkler Type", detail: "Pop-up Sprinklers", amount: 180 },
      { label: "Nozzle Type", detail: "Fixed Spray", amount: 90 },
      { label: "Controller/Timer", detail: "Digital Timer", amount: 250 },
      { label: "Pipe & Fittings", detail: "2 tap points", amount: 170 },
      { label: "Base Cost", detail: "", amount: 150 },
    ]);
    expect(result.total).toBe(3060);
  });

  it("returns zero for lawn when area is 0", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 0,
        gardenAreaSqm: 50,
        tapPoints: 1,
        sprinklerType: "popUp",
        nozzleType: "fixedSpray",
        controllerType: "manualTapTimer",
      },
      config
    );

    const lawnItem = result.lineItems.find(
      (i) => i.label === "Lawn Irrigation"
    );
    expect(lawnItem).toBeUndefined();
    // garden 900 + sprinkler 180 + nozzle 90 + controller 0 + tap 85 + base 150
    expect(result.total).toBe(900 + 180 + 90 + 85 + 150);
  });

  it("omits controller line item when cost is zero (manual tap timer)", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 100,
        gardenAreaSqm: 0,
        tapPoints: 1,
        sprinklerType: "popUp",
        nozzleType: "fixedSpray",
        controllerType: "manualTapTimer",
      },
      config
    );

    const controllerItem = result.lineItems.find(
      (i) => i.label === "Controller/Timer"
    );
    expect(controllerItem).toBeUndefined();
  });

  it("includes smart wifi controller cost", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 0,
        gardenAreaSqm: 0,
        tapPoints: 0,
        sprinklerType: "popUp",
        nozzleType: "fixedSpray",
        controllerType: "smartWifi",
      },
      config
    );

    const controllerItem = result.lineItems.find(
      (i) => i.label === "Controller/Timer"
    );
    expect(controllerItem).toBeDefined();
    expect(controllerItem!.amount).toBe(450);
  });

  it("always includes base cost", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 0,
        gardenAreaSqm: 0,
        tapPoints: 0,
        sprinklerType: "popUp",
        nozzleType: "fixedSpray",
        controllerType: "manualTapTimer",
      },
      config
    );

    // sprinkler 180 + nozzle 90 + base 150
    expect(result.total).toBe(180 + 90 + 150);
    expect(result.lineItems[result.lineItems.length - 1]).toEqual(
      { label: "Base Cost", detail: "", amount: 150 }
    );
  });

  it("adds rotor sprinkler and mp rotator costs", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 0,
        gardenAreaSqm: 0,
        tapPoints: 0,
        sprinklerType: "rotor",
        nozzleType: "mpRotator",
        controllerType: "manualTapTimer",
      },
      config
    );

    const sprinklerItem = result.lineItems.find(
      (i) => i.label === "Sprinkler Type"
    );
    const nozzleItem = result.lineItems.find(
      (i) => i.label === "Nozzle Type"
    );
    expect(sprinklerItem!.amount).toBe(320);
    expect(nozzleItem!.amount).toBe(180);
  });
});
