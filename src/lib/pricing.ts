import type { SprinklerType, NozzleType, ControllerType } from "@/lib/types";
import pricingConfig from "@/config/pricing.json";

interface ProductOption {
  cost: number;
  label: string;
}

export interface PricingConfig {
  lawn: { ratePerSqm: number; label: string };
  garden: { ratePerSqm: number; label: string };
  sprinkler: Record<SprinklerType, ProductOption> & { label: string };
  nozzle: Record<NozzleType, ProductOption> & { label: string };
  controller: Record<ControllerType, ProductOption> & { label: string };
  tapPoint: { ratePerPoint: number; label: string };
  baseCost: number;
}

export interface QuoteInput {
  lawnAreaSqm: number;
  gardenAreaSqm: number;
  tapPoints: number;
  sprinklerType: SprinklerType;
  nozzleType: NozzleType;
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

  const sprinklerOption = config.sprinkler[input.sprinklerType];
  if (sprinklerOption.cost > 0) {
    lineItems.push({
      label: config.sprinkler.label,
      detail: sprinklerOption.label,
      amount: sprinklerOption.cost,
    });
  }

  const nozzleOption = config.nozzle[input.nozzleType];
  if (nozzleOption.cost > 0) {
    lineItems.push({
      label: config.nozzle.label,
      detail: nozzleOption.label,
      amount: nozzleOption.cost,
    });
  }

  const controllerOption = config.controller[input.controllerType];
  if (controllerOption.cost > 0) {
    lineItems.push({
      label: config.controller.label,
      detail: controllerOption.label,
      amount: controllerOption.cost,
    });
  }

  if (input.tapPoints > 0) {
    lineItems.push({
      label: config.tapPoint.label,
      detail: `${input.tapPoints} tap points`,
      amount: input.tapPoints * config.tapPoint.ratePerPoint,
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
