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
