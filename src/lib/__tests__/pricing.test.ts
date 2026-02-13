import { describe, it, expect } from "vitest";
import { calculateQuote } from "@/lib/pricing";

const config = {
  lawn: { ratePerSqm: 12.5, label: "Lawn Irrigation" },
  garden: { ratePerSqm: 18.0, label: "Garden Irrigation" },
  lawnSprinkler: {
    popUp: { cost: 180, label: "Pop-up Sprinklers" },
    rotor: { cost: 320, label: "Rotor Sprinklers" },
    dripLine: { cost: 220, label: "Drip Line" },
    label: "Lawn Sprinkler Type",
  },
  gardenSprinkler: {
    popUp: { cost: 180, label: "Pop-up Sprinklers" },
    rotor: { cost: 320, label: "Rotor Sprinklers" },
    dripLine: { cost: 220, label: "Drip Line" },
    microSpray: { cost: 150, label: "Micro-spray" },
    label: "Garden Sprinkler Type",
  },
  lawnNozzle: {
    fixedSpray: { cost: 90, label: "Fixed Spray" },
    adjustable: { cost: 120, label: "Adjustable" },
    mpRotator: { cost: 180, label: "MP Rotator" },
    label: "Lawn Nozzle Type",
  },
  gardenNozzle: {
    fixedSpray: { cost: 90, label: "Fixed Spray" },
    adjustable: { cost: 120, label: "Adjustable" },
    mpRotator: { cost: 180, label: "MP Rotator" },
    label: "Garden Nozzle Type",
  },
  controller: {
    manualTapTimer: { cost: 0, label: "Manual Tap Timer" },
    digitalTimer: { cost: 250, label: "Digital Timer" },
    smartWifi: { cost: 450, label: "Smart Wi-Fi Controller" },
    label: "Controller/Timer",
  },
  baseCost: 150,
};

describe("calculateQuote", () => {
  it("calculates a full quote with all inputs", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 120,
        gardenAreaSqm: 40,
        lawnSprinklerType: "popUp",
        gardenSprinklerType: "popUp",
        lawnNozzleType: "fixedSpray",
        gardenNozzleType: "fixedSpray",
        controllerType: "digitalTimer",
      },
      config
    );

    expect(result.lineItems).toEqual([
      { label: "Lawn Irrigation", detail: "120 m\u00B2", amount: 1500 },
      { label: "Garden Irrigation", detail: "40 m\u00B2", amount: 720 },
      { label: "Lawn Sprinkler Type", detail: "Pop-up Sprinklers", amount: 180 },
      { label: "Garden Sprinkler Type", detail: "Pop-up Sprinklers", amount: 180 },
      { label: "Lawn Nozzle Type", detail: "Fixed Spray", amount: 90 },
      { label: "Garden Nozzle Type", detail: "Fixed Spray", amount: 90 },
      { label: "Controller/Timer", detail: "Digital Timer", amount: 250 },
      { label: "Base Cost", detail: "", amount: 150 },
    ]);
    expect(result.total).toBe(3160);
  });

  it("returns zero for lawn when area is 0", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 0,
        gardenAreaSqm: 50,
        gardenSprinklerType: "popUp",
        gardenNozzleType: "fixedSpray",
        controllerType: "manualTapTimer",
      },
      config
    );

    const lawnItem = result.lineItems.find(
      (i) => i.label === "Lawn Irrigation"
    );
    expect(lawnItem).toBeUndefined();
    // garden 900 + gardenSprinkler 180 + gardenNozzle 90 + base 150
    expect(result.total).toBe(900 + 180 + 90 + 150);
  });

  it("omits controller line item when cost is zero (manual tap timer)", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 100,
        gardenAreaSqm: 0,
        lawnSprinklerType: "popUp",
        lawnNozzleType: "fixedSpray",
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
        controllerType: "manualTapTimer",
      },
      config
    );

    // base 150 only (no nozzles when not provided)
    expect(result.total).toBe(150);
    expect(result.lineItems[result.lineItems.length - 1]).toEqual(
      { label: "Base Cost", detail: "", amount: 150 }
    );
  });

  it("adds rotor sprinkler and mp rotator nozzle costs", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 0,
        gardenAreaSqm: 0,
        lawnSprinklerType: "rotor",
        lawnNozzleType: "mpRotator",
        controllerType: "manualTapTimer",
      },
      config
    );

    const sprinklerItem = result.lineItems.find(
      (i) => i.label === "Lawn Sprinkler Type"
    );
    const nozzleItem = result.lineItems.find(
      (i) => i.label === "Lawn Nozzle Type"
    );
    expect(sprinklerItem!.amount).toBe(320);
    expect(nozzleItem!.amount).toBe(180);
  });

  it("omits sprinkler lines when types not provided", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 100,
        gardenAreaSqm: 50,
        controllerType: "digitalTimer",
      },
      config
    );

    const lawnSprinklerItem = result.lineItems.find(
      (i) => i.label === "Lawn Sprinkler Type"
    );
    const gardenSprinklerItem = result.lineItems.find(
      (i) => i.label === "Garden Sprinkler Type"
    );
    expect(lawnSprinklerItem).toBeUndefined();
    expect(gardenSprinklerItem).toBeUndefined();
  });

  it("adds micro-spray cost for garden sprinkler", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 0,
        gardenAreaSqm: 30,
        gardenSprinklerType: "microSpray",
        controllerType: "manualTapTimer",
      },
      config
    );

    const gardenSprinklerItem = result.lineItems.find(
      (i) => i.label === "Garden Sprinkler Type"
    );
    expect(gardenSprinklerItem).toBeDefined();
    expect(gardenSprinklerItem!.amount).toBe(150);
    expect(gardenSprinklerItem!.detail).toBe("Micro-spray");
  });

  it("omits nozzle lines when types not provided", () => {
    const result = calculateQuote(
      {
        lawnAreaSqm: 100,
        gardenAreaSqm: 50,
        lawnSprinklerType: "rotor",
        gardenSprinklerType: "dripLine",
        controllerType: "digitalTimer",
      },
      config
    );

    const lawnNozzleItem = result.lineItems.find(
      (i) => i.label === "Lawn Nozzle Type"
    );
    const gardenNozzleItem = result.lineItems.find(
      (i) => i.label === "Garden Nozzle Type"
    );
    expect(lawnNozzleItem).toBeUndefined();
    expect(gardenNozzleItem).toBeUndefined();
  });
});
