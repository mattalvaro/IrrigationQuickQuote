import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Simple integration test that uses the real filesystem
describe("POST /api/leads", () => {
  const TEST_LEADS_FILE = path.join(process.cwd(), "data", "test-leads.json");

  beforeEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(TEST_LEADS_FILE);
    } catch {
      // File doesn't exist, that's fine
    }
  });

  afterEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(TEST_LEADS_FILE);
    } catch {
      // Ignore errors
    }
    vi.unstubAllEnvs();
  });

  it("returns 201 on valid lead submission", async () => {
    // Stub environment variables for email sending
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("LEAD_NOTIFY_EMAIL", "test@example.com");

    // Import after stubbing envs
    const { POST } = await import("../leads/route");

    const mockBody = {
      name: "Test User",
      email: "test@example.com",
      phone: "0412345678",
      estimate: {
        lineItems: [
          { label: "Lawn Installation", detail: "100 m²", amount: 1500 },
          { label: "Base Cost", detail: "", amount: 500 },
        ],
        total: 2000,
      },
      inputData: {
        lawnAreas: [{ id: "lawn-1", sqm: 100 }],
        gardenAreas: [{ id: "garden-1", sqm: 50 }],
        lawnSprinklerType: "popUp",
        gardenSprinklerType: "dripLine",
        lawnNozzleType: "fixedSpray",
        gardenNozzleType: "adjustable",
        controllerType: "digitalTimer",
        waterSource: "mains",
        connectionType: "tap",
        name: "Test User",
        email: "test@example.com",
        phone: "0412345678",
      },
      mapSnapshot: null,
    };

    const request = new NextRequest("http://localhost:3000/api/leads", {
      method: "POST",
      body: JSON.stringify(mockBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty("id");
    expect(typeof data.id).toBe("string");
  });
});
