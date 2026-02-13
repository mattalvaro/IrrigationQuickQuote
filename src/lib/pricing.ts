import type { LawnSprinklerType, GardenSprinklerType, NozzleType, ControllerType } from "@/lib/types";
import pricingConfig from "@/config/pricing.json";

interface ProductOption {
  cost: number;
  label: string;
}

export interface PricingConfig {
  lawn: { ratePerSqm: number; label: string };
  garden: { ratePerSqm: number; label: string };
  lawnSprinkler: Record<LawnSprinklerType, ProductOption> & { label: string };
  gardenSprinkler: Record<GardenSprinklerType, ProductOption> & { label: string };
  lawnNozzle: Record<NozzleType, ProductOption> & { label: string };
  gardenNozzle: Record<NozzleType, ProductOption> & { label: string };
  controller: Record<ControllerType, ProductOption> & { label: string };
  baseCost: number;
}

export interface QuoteInput {
  lawnAreaSqm: number;
  gardenAreaSqm: number;
  lawnSprinklerType?: LawnSprinklerType;
  gardenSprinklerType?: GardenSprinklerType;
  lawnNozzleType?: NozzleType;
  gardenNozzleType?: NozzleType;
  controllerType: ControllerType;
}

export interface QuoteLineItem {
  label: string;
  detail: string;
  amount: number;
}

export interface QuoteResult {
  lineItems: QuoteLineItem[];
  total: number;
}

export function getDefaultConfig(): PricingConfig {
  return pricingConfig as PricingConfig;
}

export function calculateQuote(
  input: QuoteInput,
  config: PricingConfig = getDefaultConfig()
): QuoteResult {
  const lineItems: QuoteLineItem[] = [];

  if (input.lawnAreaSqm > 0) {
    lineItems.push({
      label: config.lawn.label,
      detail: `${input.lawnAreaSqm} m\u00B2`,
      amount: input.lawnAreaSqm * config.lawn.ratePerSqm,
    });
  }

  if (input.gardenAreaSqm > 0) {
    lineItems.push({
      label: config.garden.label,
      detail: `${input.gardenAreaSqm} m\u00B2`,
      amount: input.gardenAreaSqm * config.garden.ratePerSqm,
    });
  }

  if (input.lawnSprinklerType) {
    const lawnSprinklerOption = config.lawnSprinkler[input.lawnSprinklerType];
    if (lawnSprinklerOption.cost > 0) {
      lineItems.push({
        label: config.lawnSprinkler.label,
        detail: lawnSprinklerOption.label,
        amount: lawnSprinklerOption.cost,
      });
    }
  }

  if (input.gardenSprinklerType) {
    const gardenSprinklerOption = config.gardenSprinkler[input.gardenSprinklerType];
    if (gardenSprinklerOption.cost > 0) {
      lineItems.push({
        label: config.gardenSprinkler.label,
        detail: gardenSprinklerOption.label,
        amount: gardenSprinklerOption.cost,
      });
    }
  }

  if (input.lawnNozzleType) {
    const lawnNozzleOption = config.lawnNozzle[input.lawnNozzleType];
    if (lawnNozzleOption.cost > 0) {
      lineItems.push({
        label: config.lawnNozzle.label,
        detail: lawnNozzleOption.label,
        amount: lawnNozzleOption.cost,
      });
    }
  }

  if (input.gardenNozzleType) {
    const gardenNozzleOption = config.gardenNozzle[input.gardenNozzleType];
    if (gardenNozzleOption.cost > 0) {
      lineItems.push({
        label: config.gardenNozzle.label,
        detail: gardenNozzleOption.label,
        amount: gardenNozzleOption.cost,
      });
    }
  }

  const controllerOption = config.controller[input.controllerType];
  if (controllerOption.cost > 0) {
    lineItems.push({
      label: config.controller.label,
      detail: controllerOption.label,
      amount: controllerOption.cost,
    });
  }

  lineItems.push({
    label: "Base Cost",
    detail: "",
    amount: config.baseCost,
  });

  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return { lineItems, total };
}
