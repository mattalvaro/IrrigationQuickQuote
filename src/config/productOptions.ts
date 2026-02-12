import type { ProductOption } from "@/components/ProductSelectionStep";

export const sprinklerOptions: ProductOption[] = [
  {
    id: "popUp",
    label: "Pop-up Sprinklers",
    description: "Retractable heads ideal for lawns and open areas.",
    image: "https://placehold.co/400x300/e2e8f0/475569?text=Pop-up+Sprinklers",
    price: 180,
  },
  {
    id: "rotor",
    label: "Rotor Sprinklers",
    description: "Rotating heads for large coverage areas.",
    image: "https://placehold.co/400x300/e2e8f0/475569?text=Rotor+Sprinklers",
    price: 320,
  },
  {
    id: "dripLine",
    label: "Drip Line",
    description: "Low-flow tubing for garden beds and hedges.",
    image: "https://placehold.co/400x300/e2e8f0/475569?text=Drip+Line",
    price: 220,
  },
];

export const nozzleOptions: ProductOption[] = [
  {
    id: "fixedSpray",
    label: "Fixed Spray",
    description: "Standard fixed-pattern nozzles for small zones.",
    image: "https://placehold.co/400x300/e2e8f0/475569?text=Fixed+Spray",
    price: 90,
  },
  {
    id: "adjustable",
    label: "Adjustable",
    description: "Variable arc and radius for flexible coverage.",
    image: "https://placehold.co/400x300/e2e8f0/475569?text=Adjustable",
    price: 120,
  },
  {
    id: "mpRotator",
    label: "MP Rotator",
    description: "High-efficiency multi-stream rotating nozzles.",
    image: "https://placehold.co/400x300/e2e8f0/475569?text=MP+Rotator",
    price: 180,
  },
];

export const controllerOptions: ProductOption[] = [
  {
    id: "manualTapTimer",
    label: "Manual Tap Timer",
    description: "Simple twist-to-set timer at the tap.",
    image: "https://placehold.co/400x300/e2e8f0/475569?text=Manual+Tap+Timer",
    price: 0,
  },
  {
    id: "digitalTimer",
    label: "Digital Timer",
    description: "Programmable digital controller with multiple zones.",
    image: "https://placehold.co/400x300/e2e8f0/475569?text=Digital+Timer",
    price: 250,
  },
  {
    id: "smartWifi",
    label: "Smart Wi-Fi Controller",
    description: "App-controlled smart controller with weather integration.",
    image: "https://placehold.co/400x300/e2e8f0/475569?text=Smart+Wi-Fi",
    price: 450,
  },
];
