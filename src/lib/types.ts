export interface WizardData {
  // Map step
  lawnAreas: { id: string; sqm: number }[];
  gardenAreas: { id: string; sqm: number }[];
  mapSnapshot: string | null; // base64 PNG

  // Details step
  waterSource: "city" | "well" | "tank" | "";
  tapPoints: number;
  controllerType: "manual" | "automatic";

  // Lead capture
  name: string;
  email: string;
  phone: string;
}

export const initialWizardData: WizardData = {
  lawnAreas: [],
  gardenAreas: [],
  mapSnapshot: null,
  waterSource: "",
  tapPoints: 1,
  controllerType: "automatic",
  name: "",
  email: "",
  phone: "",
};

export type WizardStep = "welcome" | "map" | "details" | "estimate" | "lead";

export const STEP_ORDER: WizardStep[] = [
  "welcome",
  "map",
  "details",
  "estimate",
  "lead",
];
