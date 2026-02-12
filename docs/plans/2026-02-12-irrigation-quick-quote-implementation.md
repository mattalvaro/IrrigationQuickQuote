# IrrigationQuickQuote Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a guided wizard that lets DIY irrigation customers measure their property on an interactive map and receive a high-level cost estimate, capturing their contact details as a lead.

**Architecture:** Next.js App Router with a multi-step wizard component. Mapbox GL JS + Draw for property measurement. Pure-function pricing engine driven by a JSON config. Leads stored via API route to SQLite (Turso). Widget export via Vite bundle.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Mapbox GL JS, @mapbox/mapbox-gl-draw, @turf/area, Vitest, React Testing Library, SQLite/Turso

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Step 1: Scaffold Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Expected: Project files created in current directory.

**Step 2: Install testing dependencies**

Run:
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Step 3: Create Vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `src/test/setup.ts`:
```typescript
import "@testing-library/jest-dom/vitest";
```

**Step 4: Add test script to package.json**

Add to `scripts`:
```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 5: Verify setup**

Run:
```bash
npm run build && npm run test:run
```

Expected: Build succeeds, test runner starts (0 tests).

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Tailwind and Vitest"
```

---

### Task 2: Pricing Engine

This is a pure function with no UI dependencies — ideal to build and test first.

**Files:**
- Create: `src/config/pricing.json`
- Create: `src/lib/pricing.ts`
- Create: `src/lib/__tests__/pricing.test.ts`

**Step 1: Create the pricing config**

Create `src/config/pricing.json`:
```json
{
  "lawn": { "ratePerSqm": 12.50, "label": "Lawn Irrigation" },
  "garden": { "ratePerSqm": 18.00, "label": "Garden Irrigation" },
  "controller": { "manual": 0, "automatic": 250, "label": "Controller/Timer" },
  "tapPoint": { "ratePerPoint": 85, "label": "Pipe & Fittings" },
  "baseCost": 150
}
```

**Step 2: Define the types**

Create `src/lib/pricing.ts`:
```typescript
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
```

**Step 3: Write the failing tests**

Create `src/lib/__tests__/pricing.test.ts`:
```typescript
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
      { label: "Lawn Irrigation", detail: "120 m²", amount: 1500 },
      { label: "Garden Irrigation", detail: "40 m²", amount: 720 },
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

    const lawnItem = result.lineItems.find((i) => i.label === "Lawn Irrigation");
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
```

**Step 4: Run tests to verify they fail**

Run: `npm run test:run -- src/lib/__tests__/pricing.test.ts`

Expected: FAIL — `calculateQuote` is not exported.

**Step 5: Implement calculateQuote**

Add to `src/lib/pricing.ts`:
```typescript
import pricingConfig from "@/config/pricing.json";

// ... types from step 2 above ...

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
      detail: `${input.lawnAreaSqm} m²`,
      amount: input.lawnAreaSqm * config.lawn.ratePerSqm,
    });
  }

  if (input.gardenAreaSqm > 0) {
    lineItems.push({
      label: config.garden.label,
      detail: `${input.gardenAreaSqm} m²`,
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
```

**Step 6: Run tests to verify they pass**

Run: `npm run test:run -- src/lib/__tests__/pricing.test.ts`

Expected: All 4 tests PASS.

**Step 7: Commit**

```bash
git add src/config/pricing.json src/lib/pricing.ts src/lib/__tests__/pricing.test.ts
git commit -m "feat: add pricing engine with config and tests"
```

---

### Task 3: Wizard Shell & State Management

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/components/Wizard.tsx`
- Create: `src/components/__tests__/Wizard.test.tsx`

**Step 1: Define shared types**

Create `src/lib/types.ts`:
```typescript
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
```

**Step 2: Write failing tests for Wizard**

Create `src/components/__tests__/Wizard.test.tsx`:
```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Wizard } from "@/components/Wizard";

describe("Wizard", () => {
  it("renders the welcome step by default", () => {
    render(<Wizard />);
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });

  it("shows step progress indicator", () => {
    render(<Wizard />);
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
  });

  it("navigates to next step when Next is clicked", async () => {
    const user = userEvent.setup();
    render(<Wizard />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 2 of 5/i)).toBeInTheDocument();
  });

  it("navigates back when Back is clicked", async () => {
    const user = userEvent.setup();
    render(<Wizard />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
  });

  it("does not show Back button on first step", () => {
    render(<Wizard />);
    expect(screen.queryByRole("button", { name: /back/i })).not.toBeInTheDocument();
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `npm run test:run -- src/components/__tests__/Wizard.test.tsx`

Expected: FAIL — `Wizard` component not found.

**Step 4: Implement Wizard component**

Create `src/components/Wizard.tsx`:
```tsx
"use client";

import { useState } from "react";
import { WizardData, initialWizardData, STEP_ORDER, WizardStep } from "@/lib/types";

export function Wizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<WizardData>(initialWizardData);

  const currentStep = STEP_ORDER[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEP_ORDER.length - 1;

  function next() {
    if (!isLast) setStepIndex((i) => i + 1);
  }

  function back() {
    if (!isFirst) setStepIndex((i) => i - 1);
  }

  function updateData(partial: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <p className="text-sm text-gray-500 mb-4">
        Step {stepIndex + 1} of {STEP_ORDER.length}
      </p>

      <div className="min-h-[300px]">
        {currentStep === "welcome" && <WelcomePlaceholder />}
        {currentStep === "map" && <p>Map step placeholder</p>}
        {currentStep === "details" && <p>Details step placeholder</p>}
        {currentStep === "estimate" && <p>Estimate step placeholder</p>}
        {currentStep === "lead" && <p>Lead capture placeholder</p>}
      </div>

      <div className="flex justify-between mt-6">
        {!isFirst ? (
          <button
            onClick={back}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Back
          </button>
        ) : (
          <div />
        )}
        {!isLast && (
          <button
            onClick={next}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function WelcomePlaceholder() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Welcome to IrrigationQuickQuote</h1>
      <p className="text-gray-600">
        Get a guide price for your DIY irrigation project in minutes.
        Measure your property on the map, answer a few questions, and
        receive an estimate.
      </p>
      <p className="text-sm text-gray-400 mt-4">
        This is a guide price only and would need to be confirmed based on a site assessment.
      </p>
    </div>
  );
}
```

**Step 5: Wire Wizard into the page**

Replace `src/app/page.tsx`:
```tsx
import { Wizard } from "@/components/Wizard";

export default function Home() {
  return (
    <main className="min-h-screen bg-white py-12">
      <Wizard />
    </main>
  );
}
```

**Step 6: Run tests to verify they pass**

Run: `npm run test:run -- src/components/__tests__/Wizard.test.tsx`

Expected: All 5 tests PASS.

**Step 7: Commit**

```bash
git add src/lib/types.ts src/components/Wizard.tsx src/components/__tests__/Wizard.test.tsx src/app/page.tsx
git commit -m "feat: add wizard shell with step navigation and progress"
```

---

### Task 4: Details Step

Build this before the map step since it's simpler and validates the wizard data flow.

**Files:**
- Create: `src/components/DetailsStep.tsx`
- Create: `src/components/__tests__/DetailsStep.test.tsx`

**Step 1: Write failing tests**

Create `src/components/__tests__/DetailsStep.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DetailsStep } from "@/components/DetailsStep";
import { initialWizardData } from "@/lib/types";

describe("DetailsStep", () => {
  it("renders water source dropdown", () => {
    render(<DetailsStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.getByLabelText(/water source/i)).toBeInTheDocument();
  });

  it("renders tap points input", () => {
    render(<DetailsStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.getByLabelText(/tap points/i)).toBeInTheDocument();
  });

  it("renders controller type toggle", () => {
    render(<DetailsStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.getByLabelText(/automatic/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/manual/i)).toBeInTheDocument();
  });

  it("calls onUpdate when water source changes", async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(<DetailsStep data={initialWizardData} onUpdate={onUpdate} />);

    await user.selectOptions(screen.getByLabelText(/water source/i), "city");
    expect(onUpdate).toHaveBeenCalledWith({ waterSource: "city" });
  });

  it("calls onUpdate when tap points changes", async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(<DetailsStep data={initialWizardData} onUpdate={onUpdate} />);

    const input = screen.getByLabelText(/tap points/i);
    await user.clear(input);
    await user.type(input, "3");
    expect(onUpdate).toHaveBeenCalledWith({ tapPoints: 3 });
  });

  it("calls onUpdate when controller type changes", async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(<DetailsStep data={initialWizardData} onUpdate={onUpdate} />);

    await user.click(screen.getByLabelText(/manual/i));
    expect(onUpdate).toHaveBeenCalledWith({ controllerType: "manual" });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/components/__tests__/DetailsStep.test.tsx`

Expected: FAIL — `DetailsStep` not found.

**Step 3: Implement DetailsStep**

Create `src/components/DetailsStep.tsx`:
```tsx
import { WizardData } from "@/lib/types";

interface DetailsStepProps {
  data: WizardData;
  onUpdate: (partial: Partial<WizardData>) => void;
}

export function DetailsStep({ data, onUpdate }: DetailsStepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Additional Details</h2>

      <div>
        <label htmlFor="waterSource" className="block text-sm font-medium text-gray-700 mb-1">
          Water Source
        </label>
        <select
          id="waterSource"
          value={data.waterSource}
          onChange={(e) => onUpdate({ waterSource: e.target.value as WizardData["waterSource"] })}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="">Select...</option>
          <option value="city">City Water</option>
          <option value="well">Well</option>
          <option value="tank">Rain Tank</option>
        </select>
      </div>

      <div>
        <label htmlFor="tapPoints" className="block text-sm font-medium text-gray-700 mb-1">
          Number of Tap Points
        </label>
        <input
          id="tapPoints"
          type="number"
          min={1}
          max={10}
          value={data.tapPoints}
          onChange={(e) => onUpdate({ tapPoints: parseInt(e.target.value, 10) || 1 })}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">Controller Type</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="controllerType"
              value="automatic"
              checked={data.controllerType === "automatic"}
              onChange={() => onUpdate({ controllerType: "automatic" })}
            />
            Automatic
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="controllerType"
              value="manual"
              checked={data.controllerType === "manual"}
              onChange={() => onUpdate({ controllerType: "manual" })}
            />
            Manual
          </label>
        </div>
      </fieldset>
    </div>
  );
}
```

**Step 4: Wire into Wizard**

Update `src/components/Wizard.tsx` to replace the details placeholder:
```tsx
{currentStep === "details" && <DetailsStep data={data} onUpdate={updateData} />}
```

Import at top:
```tsx
import { DetailsStep } from "@/components/DetailsStep";
```

**Step 5: Run tests to verify they pass**

Run: `npm run test:run -- src/components/__tests__/DetailsStep.test.tsx`

Expected: All 6 tests PASS.

**Step 6: Commit**

```bash
git add src/components/DetailsStep.tsx src/components/__tests__/DetailsStep.test.tsx src/components/Wizard.tsx
git commit -m "feat: add details step with water source, tap points, and controller type"
```

---

### Task 5: Estimate Step

**Files:**
- Create: `src/components/EstimateStep.tsx`
- Create: `src/components/__tests__/EstimateStep.test.tsx`

**Step 1: Write failing tests**

Create `src/components/__tests__/EstimateStep.test.tsx`:
```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EstimateStep } from "@/components/EstimateStep";
import { WizardData } from "@/lib/types";

const mockData: WizardData = {
  lawnAreas: [{ id: "1", sqm: 120 }],
  gardenAreas: [{ id: "2", sqm: 40 }],
  mapSnapshot: null,
  waterSource: "city",
  tapPoints: 2,
  controllerType: "automatic",
  name: "",
  email: "",
  phone: "",
};

describe("EstimateStep", () => {
  it("displays the total estimate", () => {
    render(<EstimateStep data={mockData} />);
    expect(screen.getByText(/\$2,790/)).toBeInTheDocument();
  });

  it("displays line items", () => {
    render(<EstimateStep data={mockData} />);
    expect(screen.getByText(/lawn irrigation/i)).toBeInTheDocument();
    expect(screen.getByText(/garden irrigation/i)).toBeInTheDocument();
    expect(screen.getByText(/controller/i)).toBeInTheDocument();
  });

  it("displays the guide price disclaimer", () => {
    render(<EstimateStep data={mockData} />);
    expect(screen.getByText(/guide price only/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/components/__tests__/EstimateStep.test.tsx`

Expected: FAIL.

**Step 3: Implement EstimateStep**

Create `src/components/EstimateStep.tsx`:
```tsx
import { WizardData } from "@/lib/types";
import { calculateQuote, getDefaultConfig } from "@/lib/pricing";

interface EstimateStepProps {
  data: WizardData;
}

export function EstimateStep({ data }: EstimateStepProps) {
  const totalLawn = data.lawnAreas.reduce((sum, a) => sum + a.sqm, 0);
  const totalGarden = data.gardenAreas.reduce((sum, a) => sum + a.sqm, 0);

  const quote = calculateQuote(
    {
      lawnAreaSqm: totalLawn,
      gardenAreaSqm: totalGarden,
      tapPoints: data.tapPoints,
      controllerType: data.controllerType,
    },
    getDefaultConfig()
  );

  const formatter = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your Estimate</h2>

      <table className="w-full">
        <tbody>
          {quote.lineItems.map((item) => (
            <tr key={item.label} className="border-b border-gray-100">
              <td className="py-2 text-gray-700">
                {item.label}
                {item.detail && (
                  <span className="text-sm text-gray-400 ml-2">({item.detail})</span>
                )}
              </td>
              <td className="py-2 text-right font-medium">
                {formatter.format(item.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-900">
            <td className="py-3 font-bold text-lg">Guide Price Total</td>
            <td className="py-3 text-right font-bold text-lg">
              {formatter.format(quote.total)}
            </td>
          </tr>
        </tfoot>
      </table>

      <p className="text-sm text-gray-500 italic">
        This is a guide price only and would need to be confirmed based on a site assessment.
      </p>
    </div>
  );
}
```

**Step 4: Wire into Wizard**

Update `src/components/Wizard.tsx`:
```tsx
{currentStep === "estimate" && <EstimateStep data={data} />}
```

Import:
```tsx
import { EstimateStep } from "@/components/EstimateStep";
```

**Step 5: Run tests to verify they pass**

Run: `npm run test:run -- src/components/__tests__/EstimateStep.test.tsx`

Expected: All 3 tests PASS.

**Step 6: Commit**

```bash
git add src/components/EstimateStep.tsx src/components/__tests__/EstimateStep.test.tsx src/components/Wizard.tsx
git commit -m "feat: add estimate step displaying pricing breakdown with disclaimer"
```

---

### Task 6: Lead Capture Step & API Route

**Files:**
- Create: `src/components/LeadCaptureStep.tsx`
- Create: `src/components/__tests__/LeadCaptureStep.test.tsx`
- Create: `src/app/api/leads/route.ts`
- Create: `src/lib/__tests__/leads-api.test.ts`

**Step 1: Write failing tests for LeadCaptureStep**

Create `src/components/__tests__/LeadCaptureStep.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeadCaptureStep } from "@/components/LeadCaptureStep";
import { initialWizardData } from "@/lib/types";

describe("LeadCaptureStep", () => {
  it("renders name, email, and phone fields", () => {
    render(<LeadCaptureStep data={initialWizardData} onUpdate={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  it("renders a submit button", () => {
    render(<LeadCaptureStep data={initialWizardData} onUpdate={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /get my estimate/i })).toBeInTheDocument();
  });

  it("calls onUpdate when fields change", async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(<LeadCaptureStep data={initialWizardData} onUpdate={onUpdate} onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/name/i), "Jane");
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: "J" }));
  });

  it("calls onSubmit when form is submitted", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const data = {
      ...initialWizardData,
      name: "Jane",
      email: "jane@example.com",
      phone: "0400000000",
    };
    render(<LeadCaptureStep data={data} onUpdate={vi.fn()} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /get my estimate/i }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("shows guide price disclaimer", () => {
    render(<LeadCaptureStep data={initialWizardData} onUpdate={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByText(/guide price/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/components/__tests__/LeadCaptureStep.test.tsx`

Expected: FAIL.

**Step 3: Implement LeadCaptureStep**

Create `src/components/LeadCaptureStep.tsx`:
```tsx
import { WizardData } from "@/lib/types";

interface LeadCaptureStepProps {
  data: WizardData;
  onUpdate: (partial: Partial<WizardData>) => void;
  onSubmit: () => void;
}

export function LeadCaptureStep({ data, onUpdate, onSubmit }: LeadCaptureStepProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold">Get Your Estimate</h2>

      <p className="text-sm text-gray-500">
        Enter your details to receive your guide price estimate. A team member
        will be in touch to confirm the final price based on a site assessment.
      </p>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={data.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={data.email}
          onChange={(e) => onUpdate({ email: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone
        </label>
        <input
          id="phone"
          type="tel"
          required
          value={data.phone}
          onChange={(e) => onUpdate({ phone: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <button
        type="submit"
        className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
      >
        Get My Estimate
      </button>
    </form>
  );
}
```

**Step 4: Run component tests to verify they pass**

Run: `npm run test:run -- src/components/__tests__/LeadCaptureStep.test.tsx`

Expected: All 5 tests PASS.

**Step 5: Implement API route**

Create `src/app/api/leads/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const LEADS_FILE = path.join(process.cwd(), "data", "leads.json");

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  estimate: Record<string, unknown>;
  inputData: Record<string, unknown>;
  mapSnapshot: string | null;
  createdAt: string;
}

async function readLeads(): Promise<Lead[]> {
  try {
    const data = await fs.readFile(LEADS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeLeads(leads: Lead[]): Promise<void> {
  const dir = path.dirname(LEADS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2));
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const lead: Lead = {
    id: crypto.randomUUID(),
    name: body.name,
    email: body.email,
    phone: body.phone,
    estimate: body.estimate,
    inputData: body.inputData,
    mapSnapshot: body.mapSnapshot ?? null,
    createdAt: new Date().toISOString(),
  };

  const leads = await readLeads();
  leads.push(lead);
  await writeLeads(leads);

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
```

**Step 6: Wire LeadCaptureStep into Wizard with submit handler**

Update `src/components/Wizard.tsx` — add import and submit logic:
```tsx
import { LeadCaptureStep } from "@/components/LeadCaptureStep";
```

Add submit handler inside Wizard component:
```tsx
const [submitted, setSubmitted] = useState(false);

async function handleSubmit() {
  const totalLawn = data.lawnAreas.reduce((sum, a) => sum + a.sqm, 0);
  const totalGarden = data.gardenAreas.reduce((sum, a) => sum + a.sqm, 0);

  await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      phone: data.phone,
      estimate: { totalLawn, totalGarden, tapPoints: data.tapPoints, controllerType: data.controllerType },
      inputData: data,
      mapSnapshot: data.mapSnapshot,
    }),
  });

  setSubmitted(true);
}
```

Replace lead placeholder:
```tsx
{currentStep === "lead" && !submitted && (
  <LeadCaptureStep data={data} onUpdate={updateData} onSubmit={handleSubmit} />
)}
{currentStep === "lead" && submitted && (
  <div className="text-center py-12">
    <h2 className="text-2xl font-bold mb-4">Thank You!</h2>
    <p className="text-gray-600">Your guide price estimate has been sent. A team member will be in touch to confirm.</p>
  </div>
)}
```

**Step 7: Add `data/` to `.gitignore`**

Append to `.gitignore`:
```
data/
```

**Step 8: Run all tests**

Run: `npm run test:run`

Expected: All tests PASS.

**Step 9: Commit**

```bash
git add src/components/LeadCaptureStep.tsx src/components/__tests__/LeadCaptureStep.test.tsx src/app/api/leads/route.ts src/components/Wizard.tsx .gitignore
git commit -m "feat: add lead capture step with API route for storing leads"
```

---

### Task 7: Mapbox Map Step

This is the core feature. Requires a Mapbox access token.

**Files:**
- Create: `src/components/MapStep.tsx`
- Create: `src/components/__tests__/MapStep.test.tsx`
- Create: `.env.local` (not committed)

**Step 1: Install Mapbox dependencies**

Run:
```bash
npm install mapbox-gl @mapbox/mapbox-gl-draw @turf/area
npm install -D @types/mapbox-gl @types/mapbox__mapbox-gl-draw
```

**Step 2: Set up environment variable**

Create `.env.local`:
```
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

Add to `.gitignore`:
```
.env.local
```

Create `.env.example`:
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

**Step 3: Write failing tests**

Create `src/components/__tests__/MapStep.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MapStep } from "@/components/MapStep";
import { initialWizardData } from "@/lib/types";

// Mock mapbox-gl since it requires a browser with WebGL
vi.mock("mapbox-gl", () => ({
  default: {
    Map: vi.fn(() => ({
      on: vi.fn(),
      remove: vi.fn(),
      addControl: vi.fn(),
      getCanvas: vi.fn(() => ({ toDataURL: vi.fn(() => "data:image/png;base64,mock") })),
    })),
    NavigationControl: vi.fn(),
  },
}));

vi.mock("@mapbox/mapbox-gl-draw", () => ({
  default: vi.fn(() => ({
    getAll: vi.fn(() => ({ features: [] })),
  })),
}));

describe("MapStep", () => {
  it("renders address search input", () => {
    render(<MapStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.getByPlaceholderText(/enter your address/i)).toBeInTheDocument();
  });

  it("renders map container", () => {
    render(<MapStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  it("renders drawing mode buttons", () => {
    render(<MapStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.getByRole("button", { name: /draw lawn/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /draw garden/i })).toBeInTheDocument();
  });

  it("displays area totals", () => {
    render(<MapStep data={initialWizardData} onUpdate={vi.fn()} />);
    expect(screen.getByText(/total lawn/i)).toBeInTheDocument();
    expect(screen.getByText(/total garden/i)).toBeInTheDocument();
  });
});
```

**Step 4: Run tests to verify they fail**

Run: `npm run test:run -- src/components/__tests__/MapStep.test.tsx`

Expected: FAIL — `MapStep` not found.

**Step 5: Implement MapStep**

Create `src/components/MapStep.tsx`:
```tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import area from "@turf/area";
import { WizardData } from "@/lib/types";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

type DrawingMode = "lawn" | "garden" | null;

interface MapStepProps {
  data: WizardData;
  onUpdate: (partial: Partial<WizardData>) => void;
}

export function MapStep({ data, onUpdate }: MapStepProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ place_name: string; center: [number, number] }>>([]);

  const featureTypes = useRef<Map<string, "lawn" | "garden">>(new Map());

  const totalLawn = data.lawnAreas.reduce((sum, a) => sum + a.sqm, 0);
  const totalGarden = data.gardenAreas.reduce((sum, a) => sum + a.sqm, 0);

  const updateAreas = useCallback(() => {
    if (!drawRef.current) return;
    const allFeatures = drawRef.current.getAll();
    const lawnAreas: { id: string; sqm: number }[] = [];
    const gardenAreas: { id: string; sqm: number }[] = [];

    for (const feature of allFeatures.features) {
      const id = feature.id as string;
      const sqm = Math.round(area(feature));
      const type = featureTypes.current.get(id);

      if (type === "lawn") lawnAreas.push({ id, sqm });
      else if (type === "garden") gardenAreas.push({ id, sqm });
    }

    onUpdate({ lawnAreas, gardenAreas });
  }, [onUpdate]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-v9",
      center: [133.7751, -25.2744], // Australia center
      zoom: 4,
      preserveDrawingBuffer: true,
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: false, trash: true },
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(draw, "top-left");

    map.on("draw.create", (e: { features: Array<{ id: string }> }) => {
      for (const f of e.features) {
        if (drawingMode) featureTypes.current.set(f.id as string, drawingMode);
      }
      updateAreas();
    });
    map.on("draw.update", updateAreas);
    map.on("draw.delete", (e: { features: Array<{ id: string }> }) => {
      for (const f of e.features) featureTypes.current.delete(f.id as string);
      updateAreas();
    });

    mapRef.current = map;
    drawRef.current = draw;

    return () => map.remove();
  }, [drawingMode, updateAreas]);

  async function searchAddress(query: string) {
    setAddress(query);
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&country=au&limit=5`
    );
    const json = await res.json();
    setSuggestions(json.features || []);
  }

  function selectAddress(center: [number, number]) {
    setSuggestions([]);
    mapRef.current?.flyTo({ center, zoom: 19 });
  }

  function startDrawing(mode: DrawingMode) {
    setDrawingMode(mode);
    drawRef.current?.changeMode("draw_polygon");
  }

  function captureSnapshot(): string | null {
    if (!mapRef.current) return null;
    return mapRef.current.getCanvas().toDataURL("image/png");
  }

  // Expose snapshot capture for parent to call before navigating
  useEffect(() => {
    const handleBeforeNext = () => {
      const snapshot = captureSnapshot();
      if (snapshot) onUpdate({ mapSnapshot: snapshot });
    };
    window.addEventListener("wizard:beforeNext", handleBeforeNext);
    return () => window.removeEventListener("wizard:beforeNext", handleBeforeNext);
  }, [onUpdate]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Measure Your Property</h2>

      <div className="relative">
        <input
          type="text"
          placeholder="Enter your address..."
          value={address}
          onChange={(e) => searchAddress(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={() => {
                  setAddress(s.place_name);
                  selectAddress(s.center);
                }}
              >
                {s.place_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => startDrawing("lawn")}
          className={`px-3 py-2 rounded text-sm font-medium ${
            drawingMode === "lawn"
              ? "bg-green-600 text-white"
              : "bg-green-100 text-green-800 hover:bg-green-200"
          }`}
        >
          Draw Lawn
        </button>
        <button
          type="button"
          onClick={() => startDrawing("garden")}
          className={`px-3 py-2 rounded text-sm font-medium ${
            drawingMode === "garden"
              ? "bg-orange-600 text-white"
              : "bg-orange-100 text-orange-800 hover:bg-orange-200"
          }`}
        >
          Draw Garden
        </button>
      </div>

      <div data-testid="map-container" ref={mapContainer} className="w-full h-96 rounded border border-gray-300" />

      <div className="flex gap-6 text-sm">
        <p>
          <span className="font-medium">Total Lawn:</span>{" "}
          <span className="text-green-700">{totalLawn} m²</span>
        </p>
        <p>
          <span className="font-medium">Total Garden:</span>{" "}
          <span className="text-orange-700">{totalGarden} m²</span>
        </p>
      </div>
    </div>
  );
}
```

**Step 6: Wire into Wizard**

Update `src/components/Wizard.tsx`:
```tsx
import { MapStep } from "@/components/MapStep";
```

Replace map placeholder:
```tsx
{currentStep === "map" && <MapStep data={data} onUpdate={updateData} />}
```

Update the `next()` function to dispatch snapshot event before navigating from map step:
```tsx
function next() {
  if (currentStep === "map") {
    window.dispatchEvent(new Event("wizard:beforeNext"));
  }
  if (!isLast) setStepIndex((i) => i + 1);
}
```

**Step 7: Run tests to verify they pass**

Run: `npm run test:run -- src/components/__tests__/MapStep.test.tsx`

Expected: All 4 tests PASS.

**Step 8: Run all tests**

Run: `npm run test:run`

Expected: All tests PASS.

**Step 9: Commit**

```bash
git add src/components/MapStep.tsx src/components/__tests__/MapStep.test.tsx src/components/Wizard.tsx .env.example .gitignore
git commit -m "feat: add Mapbox map step with polygon drawing and area calculation"
```

---

### Task 8: Styling & Polish

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/Wizard.tsx` (progress bar)

**Step 1: Update layout with proper metadata**

Update `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IrrigationQuickQuote",
  description: "Get a guide price for your DIY irrigation project in minutes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
```

**Step 2: Add a visual progress bar to Wizard**

Update the progress indicator in `src/components/Wizard.tsx`:
```tsx
<div className="mb-8">
  <p className="text-sm text-gray-500 mb-2">Step {stepIndex + 1} of {STEP_ORDER.length}</p>
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
      style={{ width: `${((stepIndex + 1) / STEP_ORDER.length) * 100}%` }}
    />
  </div>
</div>
```

**Step 3: Verify build**

Run: `npm run build`

Expected: Build succeeds.

**Step 4: Run all tests**

Run: `npm run test:run`

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/components/Wizard.tsx
git commit -m "style: add progress bar, layout metadata, and visual polish"
```

---

### Task 9: Embeddable Widget Bundle

**Files:**
- Create: `widget/index.tsx`
- Create: `widget/vite.config.ts`
- Modify: `package.json` (add widget build script)

**Step 1: Install Vite for widget bundling**

Run:
```bash
npm install -D vite @vitejs/plugin-react
```

**Step 2: Create widget entry point**

Create `widget/index.tsx`:
```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { Wizard } from "../src/components/Wizard";
import "../src/app/globals.css";

function mount() {
  const containers = document.querySelectorAll("[data-irrigation-quote]");
  containers.forEach((container) => {
    const root = createRoot(container);
    root.render(React.createElement(Wizard));
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
```

**Step 3: Create widget Vite config**

Create `widget/vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../src"),
    },
  },
  build: {
    outDir: "../public/widget",
    lib: {
      entry: path.resolve(__dirname, "index.tsx"),
      name: "IrrigationQuickQuote",
      fileName: "irrigation-quick-quote",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        assetFileNames: "irrigation-quick-quote.[ext]",
      },
    },
  },
});
```

**Step 4: Add build script**

Add to `package.json` scripts:
```json
"build:widget": "vite build --config widget/vite.config.ts"
```

**Step 5: Build the widget**

Run: `npm run build:widget`

Expected: Output in `public/widget/` — `irrigation-quick-quote.iife.js` and `irrigation-quick-quote.css`.

**Step 6: Commit**

```bash
git add widget/ package.json
git commit -m "feat: add embeddable widget bundle via Vite"
```

---

### Task 10: End-to-End Smoke Test

**Step 1: Start dev server and manually verify**

Run: `npm run dev`

Walk through the full wizard:
1. Welcome page loads with intro text and disclaimer
2. Next → Map step shows address search, drawing buttons, map container, area totals
3. Next → Details step shows water source, tap points, controller type
4. Next → Estimate step shows line items and guide price total with disclaimer
5. Next → Lead capture shows form and submit button

**Step 2: Verify build**

Run: `npm run build`

Expected: No errors.

**Step 3: Run all tests**

Run: `npm run test:run`

Expected: All tests PASS.

**Step 4: Final commit**

If any fixes were needed during the smoke test, commit them:
```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```
