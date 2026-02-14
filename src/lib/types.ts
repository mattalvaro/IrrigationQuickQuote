export type LawnSprinklerType = "popUp" | "rotor" | "dripLine";
export type GardenSprinklerType = "popUp" | "rotor" | "dripLine" | "microSpray";
export type SprinklerType = LawnSprinklerType | GardenSprinklerType;
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
  address: string;

  // Product selection steps
  lawnSprinklerType: LawnSprinklerType;
  gardenSprinklerType: GardenSprinklerType;
  lawnNozzleType: NozzleType;
  gardenNozzleType: NozzleType;
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
  address: "",
  lawnSprinklerType: "popUp",
  gardenSprinklerType: "popUp",
  lawnNozzleType: "fixedSpray",
  gardenNozzleType: "fixedSpray",
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
  | "lawnSprinklerType"
  | "gardenSprinklerType"
  | "lawnNozzleType"
  | "gardenNozzleType"
  | "controllerType"
  | "details"
  | "estimate"
  | "lead";

export const STEP_ORDER: WizardStep[] = [
  "welcome",
  "map",
  "lawnSprinklerType",
  "gardenSprinklerType",
  "lawnNozzleType",
  "gardenNozzleType",
  "controllerType",
  "details",
  "estimate",
  "lead",
];
