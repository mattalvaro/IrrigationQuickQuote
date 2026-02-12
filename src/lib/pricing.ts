import pricingConfig from "@/config/pricing.json";

export interface PricingConfig {
  lawn: { ratePerSqm: number; label: string };
  garden: { ratePerSqm: number; label: string };
  controller: { manual: number; automatic: number; label: string };
  tapPoint: { ratePerPoint: number; label: string };
  baseCost: number;
}

export interface QuoteInput {
  lawnAreaSqm: number;
  gardenAreaSqm: number;
  tapPoints: number;
  controllerType: "manual" | "automatic";
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

  const controllerCost = config.controller[input.controllerType];
  if (controllerCost > 0) {
    lineItems.push({
      label: config.controller.label,
      detail: input.controllerType === "automatic" ? "Automatic" : "Manual",
      amount: controllerCost,
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
