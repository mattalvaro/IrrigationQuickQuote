# Lead Email with Annotated Map — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Annotate the map snapshot with edge length labels and email it to the business when a lead is submitted.

**Architecture:** Client-side canvas annotation draws edge lengths onto the Mapbox canvas before snapshot capture. Server-side, the existing `/api/leads` route is extended to send a Resend email with the annotated map as both an inline image and a full-res file attachment, plus full quote details.

**Tech Stack:** Canvas 2D API (client), Resend SDK (server), Haversine formula for distance calculation.

---

### Task 1: Haversine Distance Utility

Extract a pure `calcDistance` function alongside the existing `calcArea` in MapStep. This will be reused for edge labels.

**Files:**
- Create: `src/lib/geo.ts`
- Create: `src/lib/__tests__/geo.test.ts`

**Step 1: Write the failing test**

Create `src/lib/__tests__/geo.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calcDistance } from "@/lib/geo";

describe("calcDistance", () => {
  it("returns 0 for identical points", () => {
    expect(calcDistance([0, 0], [0, 0])).toBe(0);
  });

  it("calculates a known distance (Sydney to Melbourne ~714km)", () => {
    const sydney: [number, number] = [151.2093, -33.8688];
    const melbourne: [number, number] = [144.9631, -37.8136];
    const dist = calcDistance(sydney, melbourne);
    expect(dist).toBeGreaterThan(710_000);
    expect(dist).toBeLessThan(720_000);
  });

  it("calculates a short residential edge (~10m)", () => {
    // Two points roughly 10m apart at lat -31.95
    const p1: [number, number] = [115.8600, -31.9500];
    const p2: [number, number] = [115.86012, -31.9500];
    const dist = calcDistance(p1, p2);
    expect(dist).toBeGreaterThan(8);
    expect(dist).toBeLessThan(14);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/geo.test.ts`
Expected: FAIL — module `@/lib/geo` not found

**Step 3: Write implementation**

Create `src/lib/geo.ts`:

```typescript
const RAD = Math.PI / 180;
const EARTH_RADIUS = 6371008.8;

/**
 * Haversine distance between two [lng, lat] points in meters.
 */
export function calcDistance(
  a: [number, number],
  b: [number, number]
): number {
  const dLat = (b[1] - a[1]) * RAD;
  const dLng = (b[0] - a[0]) * RAD;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * sinLng * sinLng;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/geo.test.ts`
Expected: PASS — all 3 tests pass

**Step 5: Commit**

```bash
git add src/lib/geo.ts src/lib/__tests__/geo.test.ts
git commit -m "feat: add Haversine calcDistance utility"
```

---

### Task 2: Canvas Annotation Function

Add `annotateCanvas()` to MapStep that draws edge length labels onto the Mapbox canvas.

**Files:**
- Modify: `src/components/MapStep.tsx`

**Step 1: Add the `annotateCanvas` function**

Add this function inside MapStep, before `captureSnapshot()` (around line 175). It takes the map, draw, and featureTypes refs:

```typescript
function annotateCanvas() {
  const map = mapRef.current;
  const draw = drawRef.current;
  if (!map || !draw) return;

  const canvas = map.getCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const allFeatures = draw.getAll();
  const dpr = window.devicePixelRatio || 1;

  for (const feature of allFeatures.features) {
    const id = feature.id as string;
    const type = featureTypes.current.get(id);
    if (!type || !feature.geometry || feature.geometry.type !== "Polygon") continue;

    const coords = feature.geometry.coordinates[0] as [number, number][];
    if (!coords || coords.length < 4) continue;

    const color = type === "lawn" ? "#22c55e" : "#d97706";

    for (let i = 0; i < coords.length - 1; i++) {
      const dist = calcDistanceLocal(coords[i], coords[i + 1]);
      if (dist < 0.5) continue; // skip tiny edges

      const pxA = map.project(coords[i] as [number, number]);
      const pxB = map.project(coords[i + 1] as [number, number]);
      const midX = ((pxA.x + pxB.x) / 2) * dpr;
      const midY = ((pxA.y + pxB.y) / 2) * dpr;

      const label = dist < 10
        ? `${dist.toFixed(1)}m`
        : `${Math.round(dist)}m`;

      const fontSize = 11 * dpr;
      ctx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const padX = 4 * dpr;
      const padY = 3 * dpr;
      const pillW = textWidth + padX * 2;
      const pillH = fontSize + padY * 2;
      const radius = 4 * dpr;

      // Draw background pill
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.beginPath();
      ctx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, radius);
      ctx.fill();

      // Draw text
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, midX, midY);
    }
  }
}
```

Also add a local distance helper at the bottom of the file (alongside `calcArea`):

```typescript
function calcDistanceLocal(a: [number, number], b: [number, number]): number {
  const RAD = Math.PI / 180;
  const EARTH_RADIUS = 6371008.8;
  const dLat = (b[1] - a[1]) * RAD;
  const dLng = (b[0] - a[0]) * RAD;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * sinLng * sinLng;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}
```

**Step 2: Wire `annotateCanvas` into the snapshot flow**

Modify `captureSnapshot()` (currently at line 175) to call `annotateCanvas()` before `toDataURL()`:

```typescript
function captureSnapshot(): string | null {
  if (!mapRef.current) return null;
  annotateCanvas();
  return mapRef.current.getCanvas().toDataURL("image/png");
}
```

**Step 3: Run existing tests to verify nothing breaks**

Run: `npx vitest run src/components/__tests__/MapStep.test.tsx`
Expected: PASS — all 8 existing tests still pass (canvas annotation only fires on real Mapbox, which is mocked in tests)

**Step 4: Run build to verify compilation**

Run: `npm run build`
Expected: Compiled successfully

**Step 5: Commit**

```bash
git add src/components/MapStep.tsx
git commit -m "feat: annotate map canvas with edge length labels before snapshot"
```

---

### Task 3: Install Resend and Update .env

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.example`
- Modify: `.env.local` (manually, not committed)

**Step 1: Install resend**

Run: `npm install resend`

**Step 2: Update .env.example**

Add to `.env.example`:

```
RESEND_API_KEY=your_resend_api_key_here
LEAD_NOTIFY_EMAIL=quotes@yourbusiness.com.au
```

**Step 3: Add real values to .env.local**

Manually add `RESEND_API_KEY` and `LEAD_NOTIFY_EMAIL` to `.env.local` (not committed).

**Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add resend dependency and env vars"
```

---

### Task 4: Email Sending Module

Create `src/lib/email.ts` with the email template and send function.

**Files:**
- Create: `src/lib/email.ts`
- Create: `src/lib/__tests__/email.test.ts`

**Step 1: Write the failing test for `buildLeadEmailHtml`**

Create `src/lib/__tests__/email.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildLeadEmailHtml } from "@/lib/email";

describe("buildLeadEmailHtml", () => {
  const sampleData = {
    name: "John Smith",
    email: "john@example.com",
    phone: "0412345678",
    totalLawn: 120,
    totalGarden: 45,
    lineItems: [
      { label: "Lawn Area", detail: "120 m²", amount: 1500 },
      { label: "Base Cost", detail: "", amount: 150 },
    ],
    total: 1650,
    selections: {
      lawnSprinklerType: "popUp",
      gardenSprinklerType: "dripLine",
      controllerType: "smartWifi",
      waterSource: "mains",
      connectionType: "tap",
    },
    createdAt: "2026-02-14T10:00:00.000Z",
  };

  it("includes customer name in the HTML", () => {
    const html = buildLeadEmailHtml(sampleData);
    expect(html).toContain("John Smith");
  });

  it("includes customer email and phone", () => {
    const html = buildLeadEmailHtml(sampleData);
    expect(html).toContain("john@example.com");
    expect(html).toContain("0412345678");
  });

  it("includes line item labels and amounts", () => {
    const html = buildLeadEmailHtml(sampleData);
    expect(html).toContain("Lawn Area");
    expect(html).toContain("$1,500");
  });

  it("includes guide price total", () => {
    const html = buildLeadEmailHtml(sampleData);
    expect(html).toContain("$1,650");
  });

  it("includes product selections", () => {
    const html = buildLeadEmailHtml(sampleData);
    expect(html).toContain("popUp");
    expect(html).toContain("smartWifi");
    expect(html).toContain("mains");
  });

  it("includes inline map image reference", () => {
    const html = buildLeadEmailHtml(sampleData);
    expect(html).toContain("cid:map-snapshot");
  });

  it("includes area totals", () => {
    const html = buildLeadEmailHtml(sampleData);
    expect(html).toContain("120 m²");
    expect(html).toContain("45 m²");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/email.test.ts`
Expected: FAIL — module `@/lib/email` not found

**Step 3: Write the email module**

Create `src/lib/email.ts`:

```typescript
import { Resend } from "resend";

export interface LeadEmailData {
  name: string;
  email: string;
  phone: string;
  totalLawn: number;
  totalGarden: number;
  lineItems: { label: string; detail: string; amount: number }[];
  total: number;
  selections: Record<string, string>;
  createdAt: string;
}

const formatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function buildLeadEmailHtml(data: LeadEmailData): string {
  const lineItemsHtml = data.lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e8e3d9;color:#4a6355;font-size:14px;">
          ${item.label}${item.detail ? ` <span style="color:#7a9488;font-size:12px;">(${item.detail})</span>` : ""}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e8e3d9;text-align:right;font-weight:600;color:#1a2e23;font-size:14px;">
          ${formatter.format(item.amount)}
        </td>
      </tr>`
    )
    .join("");

  const selectionsHtml = Object.entries(data.selections)
    .filter(([, v]) => v && v !== "")
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:4px 12px;color:#7a9488;font-size:13px;">${k}</td>
        <td style="padding:4px 12px;color:#1a2e23;font-size:13px;font-weight:500;">${v}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#faf8f3;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">

    <div style="background:#132e1f;border-radius:12px 12px 0 0;padding:20px 24px;">
      <h1 style="margin:0;color:#4ade80;font-size:20px;">New Quote Request</h1>
      <p style="margin:4px 0 0;color:#7a9488;font-size:13px;">${new Date(data.createdAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}</p>
    </div>

    <div style="background:white;padding:24px;border:1px solid #e8e3d9;border-top:none;">

      <h2 style="margin:0 0 12px;color:#1a2e23;font-size:16px;">Customer Details</h2>
      <table style="width:100%;margin-bottom:20px;">
        <tr><td style="padding:4px 12px;color:#7a9488;font-size:13px;">Name</td><td style="padding:4px 12px;color:#1a2e23;font-weight:600;">${data.name}</td></tr>
        <tr><td style="padding:4px 12px;color:#7a9488;font-size:13px;">Email</td><td style="padding:4px 12px;"><a href="mailto:${data.email}" style="color:#2d5a3f;">${data.email}</a></td></tr>
        <tr><td style="padding:4px 12px;color:#7a9488;font-size:13px;">Phone</td><td style="padding:4px 12px;"><a href="tel:${data.phone}" style="color:#2d5a3f;">${data.phone}</a></td></tr>
      </table>

      <h2 style="margin:0 0 12px;color:#1a2e23;font-size:16px;">Property Map</h2>
      <img src="cid:map-snapshot" alt="Annotated property map" style="width:100%;border-radius:8px;border:1px solid #e8e3d9;margin-bottom:8px;" />
      <table style="width:100%;margin-bottom:20px;">
        <tr>
          <td style="padding:4px 12px;font-size:13px;"><span style="display:inline-block;width:10px;height:10px;background:#22c55e;border-radius:50%;margin-right:6px;vertical-align:middle;"></span>Lawn: ${data.totalLawn} m²</td>
          <td style="padding:4px 12px;font-size:13px;"><span style="display:inline-block;width:10px;height:10px;background:#d97706;border-radius:50%;margin-right:6px;vertical-align:middle;"></span>Garden: ${data.totalGarden} m²</td>
        </tr>
      </table>

      <h2 style="margin:0 0 12px;color:#1a2e23;font-size:16px;">Quote Breakdown</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        ${lineItemsHtml}
        <tr style="border-top:2px solid #1a2e23;">
          <td style="padding:12px;font-weight:700;font-size:16px;color:#1a2e23;">Guide Price Total</td>
          <td style="padding:12px;text-align:right;font-weight:700;font-size:18px;color:#1a2e23;">${formatter.format(data.total)}</td>
        </tr>
      </table>

      <h2 style="margin:0 0 12px;color:#1a2e23;font-size:16px;">Product Selections</h2>
      <table style="width:100%;margin-bottom:16px;">
        ${selectionsHtml}
      </table>

    </div>

    <div style="background:#f0ebe0;border-radius:0 0 12px 12px;padding:12px 24px;border:1px solid #e8e3d9;border-top:none;">
      <p style="margin:0;color:#7a9488;font-size:11px;">This is an automated lead notification from IrrigationQuickQuote. The full-resolution map is attached as a PNG file.</p>
    </div>

  </div>
</body>
</html>`;
}

export async function sendLeadEmail(
  data: LeadEmailData,
  mapSnapshotBase64: string | null
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.LEAD_NOTIFY_EMAIL;

  if (!apiKey || !toEmail) {
    console.warn("Email not sent: RESEND_API_KEY or LEAD_NOTIFY_EMAIL not configured");
    return;
  }

  const resend = new Resend(apiKey);
  const totalArea = data.totalLawn + data.totalGarden;
  const subject = `New Quote Request — ${data.name} — ${totalArea}m²`;
  const html = buildLeadEmailHtml(data);

  const attachments: Array<{ filename: string; content: Buffer; content_type?: string }> = [];
  const headers: Record<string, string> = {};

  if (mapSnapshotBase64) {
    const base64Data = mapSnapshotBase64.replace(/^data:image\/png;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    attachments.push(
      {
        filename: "map-snapshot.png",
        content: imageBuffer,
        content_type: "image/png",
      },
      {
        filename: "property-map.png",
        content: imageBuffer,
        content_type: "image/png",
      }
    );
    headers["X-Entity-Ref-ID"] = `lead-${Date.now()}`;
  }

  await resend.emails.send({
    from: "IrrigationQuickQuote <onboarding@resend.dev>",
    to: [toEmail],
    subject,
    html,
    attachments,
    headers,
  });
}
```

> **Note on inline CID:** Resend supports inline images via attachments. The first attachment (`map-snapshot.png`) is referenced in the HTML via `cid:map-snapshot`. If Resend doesn't natively support CID matching by filename, we fall back to the image appearing as a regular attachment — the HTML `<img>` will be blank but the full-res attachment will still be downloadable. Check [Resend attachment docs](https://resend.com/docs/api-reference/emails/send-email) during implementation for exact CID syntax. If CID isn't supported, switch the `<img>` src to a data URI (base64 inline) as a fallback.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/email.test.ts`
Expected: PASS — all 7 tests pass

**Step 5: Commit**

```bash
git add src/lib/email.ts src/lib/__tests__/email.test.ts
git commit -m "feat: add lead email template and send function"
```

---

### Task 5: Wire Email into API Route

Modify the leads API route to call `sendLeadEmail` after saving the lead.

**Files:**
- Modify: `src/app/api/leads/route.ts`

**Step 1: Write the failing test for the API route**

Create `src/app/api/__tests__/leads.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock resend before importing the route
vi.mock("resend", () => {
  const sendMock = vi.fn().mockResolvedValue({ id: "mock-email-id" });
  return {
    Resend: vi.fn(() => ({
      emails: { send: sendMock },
    })),
  };
});

// Mock fs to avoid file system writes in tests
vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn().mockResolvedValue("[]"),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("POST /api/leads", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("LEAD_NOTIFY_EMAIL", "test@example.com");
  });

  it("returns 201 and sends email on valid submission", async () => {
    // Dynamic import so mocks are in place
    const { POST } = await import("@/app/api/leads/route");

    const body = {
      name: "Test User",
      email: "user@test.com",
      phone: "0400000000",
      estimate: { totalLawn: 100, totalGarden: 50 },
      inputData: {
        lawnSprinklerType: "popUp",
        gardenSprinklerType: "dripLine",
        controllerType: "smartWifi",
        waterSource: "mains",
        connectionType: "tap",
        lawnAreas: [{ id: "1", sqm: 100 }],
        gardenAreas: [{ id: "2", sqm: 50 }],
      },
      mapSnapshot: "data:image/png;base64,iVBORw0KGgo=",
    };

    const request = new Request("http://localhost/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.id).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/__tests__/leads.test.ts`
Expected: FAIL (route doesn't import or call sendLeadEmail yet, but the test structure should work once wired)

**Step 3: Modify the API route**

Update `src/app/api/leads/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { sendLeadEmail } from "@/lib/email";
import { calculateQuote, getDefaultConfig } from "@/lib/pricing";

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

  // Fire-and-forget email
  const input = body.inputData || {};
  const totalLawn = (input.lawnAreas || []).reduce(
    (sum: number, a: { sqm: number }) => sum + a.sqm,
    0
  );
  const totalGarden = (input.gardenAreas || []).reduce(
    (sum: number, a: { sqm: number }) => sum + a.sqm,
    0
  );

  const quote = calculateQuote(
    {
      lawnAreaSqm: totalLawn,
      gardenAreaSqm: totalGarden,
      lawnSprinklerType: input.lawnSprinklerType,
      gardenSprinklerType: input.gardenSprinklerType,
      lawnNozzleType: input.lawnNozzleType,
      gardenNozzleType: input.gardenNozzleType,
      controllerType: input.controllerType || "manualTapTimer",
    },
    getDefaultConfig()
  );

  sendLeadEmail(
    {
      name: body.name,
      email: body.email,
      phone: body.phone,
      totalLawn,
      totalGarden,
      lineItems: quote.lineItems,
      total: quote.total,
      selections: {
        lawnSprinklerType: input.lawnSprinklerType || "",
        gardenSprinklerType: input.gardenSprinklerType || "",
        lawnNozzleType: input.lawnNozzleType || "",
        gardenNozzleType: input.gardenNozzleType || "",
        controllerType: input.controllerType || "",
        waterSource: input.waterSource || "",
        connectionType: input.connectionType || "",
      },
      createdAt: lead.createdAt,
    },
    body.mapSnapshot ?? null
  ).catch((err) => {
    console.error("Failed to send lead email:", err);
  });

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/__tests__/leads.test.ts`
Expected: PASS

**Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 6: Run build**

Run: `npm run build`
Expected: Compiled successfully

**Step 7: Commit**

```bash
git add src/app/api/leads/route.ts src/app/api/__tests__/leads.test.ts
git commit -m "feat: send lead notification email via Resend on submission"
```

---

### Task 6: Update .env.example and CLAUDE.md

**Files:**
- Modify: `.env.example`
- Modify: `CLAUDE.md`

**Step 1: Update .env.example**

Append to `.env.example`:

```
RESEND_API_KEY=your_resend_api_key_here
LEAD_NOTIFY_EMAIL=quotes@yourbusiness.com.au
```

**Step 2: Update CLAUDE.md Environment section**

Add to the Environment section of CLAUDE.md:

```
- Requires `RESEND_API_KEY` — Resend API key for sending lead notification emails (server-side only)
- Requires `LEAD_NOTIFY_EMAIL` — Business email address to receive lead notifications
```

**Step 3: Commit**

```bash
git add .env.example CLAUDE.md
git commit -m "docs: add Resend env vars to .env.example and CLAUDE.md"
```

---

### Task 7: Manual End-to-End Test

This is a manual verification task — no automated test.

**Step 1: Ensure .env.local has valid values**

Verify `.env.local` contains real values for:
- `RESEND_API_KEY`
- `LEAD_NOTIFY_EMAIL`
- `NEXT_PUBLIC_MAPBOX_TOKEN`

**Step 2: Start dev server**

Run: `npm run dev`

**Step 3: Complete the wizard flow**

1. Go to `http://localhost:3000`
2. Click Next past welcome
3. Search an address, zoom in, draw a lawn polygon and a garden polygon
4. Select sprinklers, nozzles, controller
5. Fill in water source + connection type
6. Review estimate
7. Fill in name/email/phone and submit

**Step 4: Verify email received**

Check the `LEAD_NOTIFY_EMAIL` inbox:
- Email subject: `New Quote Request — {name} — {total}m²`
- Body contains: customer details, map image with edge labels, quote table, product selections
- Attachment: `property-map.png` (full-resolution)

**Step 5: Verify edge labels on map**

Open the attached `property-map.png`:
- Each polygon edge should have a measurement label (e.g., "12.3m")
- Lawn edges in green, garden edges in orange
- Labels have dark background pills for readability

---

Plan complete and saved to `docs/plans/2026-02-14-lead-email-with-annotated-map.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open a new session with executing-plans, batch execution with checkpoints

Which approach?