import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { sendLeadEmail } from "@/lib/email";
import { calculateQuote, getDefaultConfig } from "@/lib/pricing";
import type { QuoteInput } from "@/lib/pricing";

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
