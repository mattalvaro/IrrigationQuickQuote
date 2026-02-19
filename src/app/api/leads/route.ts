import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { sendLeadEmail } from "@/lib/email";
import { calculateQuote, getDefaultConfig } from "@/lib/pricing";
import type { QuoteInput } from "@/lib/pricing";

const LEADS_FILE = path.join(process.cwd(), "data", "leads.json");

// Simple in-memory rate limiter: max 5 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function validateLeadInput(body: Record<string, unknown>): string | null {
  if (!body || typeof body !== "object") return "Invalid request body";

  const { name, email, phone } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) return "Name is required";
  if (name.length > 200) return "Name is too long";

  if (!email || typeof email !== "string") return "Email is required";
  if (email.length > 254) return "Email is too long";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format";

  if (!phone || typeof phone !== "string") return "Phone is required";
  if (phone.length > 30) return "Phone is too long";

  return null;
}

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

// Simple async mutex to prevent concurrent read-modify-write races
let writeLock: Promise<void> = Promise.resolve();

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
  // Atomic write: write to temp file then rename to prevent corruption
  const tmpFile = `${LEADS_FILE}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(leads, null, 2));
  await fs.rename(tmpFile, LEADS_FILE);
}

async function appendLead(lead: Lead): Promise<void> {
  // Serialize access so concurrent requests don't overwrite each other
  const previous = writeLock;
  let resolve: () => void;
  writeLock = new Promise<void>((r) => { resolve = r; });
  await previous;
  try {
    const leads = await readLeads();
    leads.push(lead);
    await writeLeads(leads);
  } finally {
    resolve!();
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const body = await request.json();

  // Input validation
  const validationError = validateLeadInput(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

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

  await appendLead(lead);

  // Send email notification (fire-and-forget, don't block response)
  const inputData = body.inputData;

  // Calculate area totals
  const lawnArea = (inputData.lawnAreas || []).reduce((sum: number, area: { sqm: number }) => sum + area.sqm, 0);
  const gardenArea = (inputData.gardenAreas || []).reduce((sum: number, area: { sqm: number }) => sum + area.sqm, 0);

  // Recalculate quote using pricing engine
  const quoteInput: QuoteInput = {
    lawnAreaSqm: lawnArea,
    gardenAreaSqm: gardenArea,
    lawnSprinklerType: inputData.lawnSprinklerType,
    gardenSprinklerType: inputData.gardenSprinklerType,
    lawnNozzleType: inputData.lawnNozzleType,
    gardenNozzleType: inputData.gardenNozzleType,
    controllerType: inputData.controllerType,
  };
  const quote = calculateQuote(quoteInput, getDefaultConfig());

  // Map quote format to email format
  const emailQuote = {
    lineItems: quote.lineItems.map((item) => ({
      description: `${item.label}${item.detail ? ` — ${item.detail}` : ""}`,
      amount: item.amount,
    })),
    total: quote.total,
  };

  console.log("📧 Attempting to send lead email...");
  console.log("  To:", process.env.LEAD_NOTIFY_EMAIL);
  console.log("  Map snapshot:", lead.mapSnapshot ? `${lead.mapSnapshot.substring(0, 50)}...` : "null");

  sendLeadEmail(
    {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      address: inputData.address || "Address not provided",
      lawnArea,
      gardenArea,
      pavementArea: 0, // Not tracked in current wizard
      otherArea: 0, // Not tracked in current wizard
      quote: emailQuote,
      selections: {
        lawnSprinklerType: inputData.lawnSprinklerType,
        gardenSprinklerType: inputData.gardenSprinklerType,
        lawnNozzleType: inputData.lawnNozzleType,
        gardenNozzleType: inputData.gardenNozzleType,
        controllerType: inputData.controllerType,
      },
    },
    lead.mapSnapshot
  )
    .then(() => {
      console.log("✅ Lead email sent successfully!");
    })
    .catch((error) => {
      // Log error but don't fail the request
      console.error("❌ Failed to send lead email:");
      console.error("  Error message:", error.message);
      console.error("  Full error:", error);
    });

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
