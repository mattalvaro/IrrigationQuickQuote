export type SprinklerType = "popUp" | "rotor" | "dripLine";
export type NozzleType = "fixedSpray" | "adjustable" | "mpRotator";
export type ControllerType = "manualTapTimer" | "digitalTimer" | "smartWifi";
export type ConnectionType =
  | "20mmGateValve" | "tap"          // mains
  | "pumpInWell" | "submersible"     // bore
  | "unsure" | "";

export interface WizardData {
  // Map step
  lawnAreas: { id: string; sqm: number }[];
  gardenAreas: { id: string; sqm: number }[];
  mapSnapshot: string | null; // base64 PNG

  // Product selection steps
  sprinklerType: SprinklerType;
  nozzleType: NozzleType;
  controllerType: ControllerType;

  // Details step
  waterSource: "mains" | "bore" | "other" | "";
  connectionType: ConnectionType;

  // Lead capture
  name: string;
  email: string;
  phone: string;
}

export const initialWizardData: WizardData = {
  lawnAreas: [],
  gardenAreas: [],
  mapSnapshot: null,
  sprinklerType: "popUp",
  nozzleType: "fixedSpray",
  controllerType: "digitalTimer",
  waterSource: "",
  connectionType: "",
  name: "",
  email: "",
  phone: "",
};

export type WizardStep =
  | "welcome"
  | "map"
  | "sprinklerType"
  | "nozzleType"
  | "controllerType"
  | "details"
  | "estimate"
  | "lead";

export const STEP_ORDER: WizardStep[] = [
  "welcome",
  "map",
  "sprinklerType",
  "nozzleType",
  "controllerType",
  "details",
  "estimate",
  "lead",
];
