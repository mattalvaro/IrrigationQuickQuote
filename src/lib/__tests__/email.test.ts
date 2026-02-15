import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildLeadEmailHtml, sendLeadEmail } from "../email";
import type { LeadEmailData } from "../email";

describe("buildLeadEmailHtml", () => {
  const mockData: LeadEmailData = {
    name: "John Smith",
    email: "john@example.com",
    phone: "0412345678",
    address: "123 Main St, Sydney NSW 2000",
    lawnArea: 150,
    gardenArea: 50,
    pavementArea: 20,
    otherArea: 10,
    quote: {
      lineItems: [
        { description: "Lawn Pop-up Sprinklers", amount: 500 },
        { description: "Garden Drip System", amount: 300 },
        { description: "Controller", amount: 200 },
      ],
      total: 1000,
    },
    selections: {
      lawnSprinklerType: "pop-up",
      gardenSprinklerType: "drip",
      lawnNozzleType: "rotary",
      gardenNozzleType: "inline-drip",
      controllerType: "smart-wifi",
    },
  };

  it("includes customer name in the email", () => {
    const html = buildLeadEmailHtml(mockData);
    expect(html).toContain("John Smith");
  });

  it("includes customer email and phone", () => {
    const html = buildLeadEmailHtml(mockData);
    expect(html).toContain("john@example.com");
    expect(html).toContain("0412345678");
  });

  it("includes all line items in quote breakdown", () => {
    const html = buildLeadEmailHtml(mockData);
    expect(html).toContain("Lawn Pop-up Sprinklers");
    expect(html).toContain("Garden Drip System");
    expect(html).toContain("Controller");
  });

  it("displays total in AUD currency format", () => {
    const html = buildLeadEmailHtml(mockData);
    expect(html).toContain("$1,000");
  });

  it("includes product selections", () => {
    const html = buildLeadEmailHtml(mockData);
    expect(html).toContain("pop-up");
    expect(html).toContain("drip");
    expect(html).toContain("rotary");
    expect(html).toContain("inline-drip");
    expect(html).toContain("smart-wifi");
  });

  it("does not include inline map image (map sent as attachment)", () => {
    const html = buildLeadEmailHtml(mockData);
    expect(html).not.toContain('cid:map-snapshot');
    expect(html).not.toContain('Property Map');
  });

  it("includes area totals", () => {
    const html = buildLeadEmailHtml(mockData);
    expect(html).toContain("150"); // lawn area
    expect(html).toContain("50"); // garden area
    expect(html).toContain("20"); // pavement area
    expect(html).toContain("10"); // other area
  });
});

describe("sendLeadEmail", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  const mockData: LeadEmailData = {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "0498765432",
    address: "456 High St, Melbourne VIC 3000",
    lawnArea: 100,
    gardenArea: 75,
    pavementArea: 0,
    otherArea: 0,
    quote: {
      lineItems: [
        { description: "Lawn Spray System", amount: 400 },
      ],
      total: 400,
    },
    selections: {
      lawnSprinklerType: "spray",
      controllerType: "basic-timer",
    },
  };

  it("throws error if RESEND_API_KEY is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("LEAD_NOTIFY_EMAIL", "notify@example.com");

    await expect(sendLeadEmail(mockData, null)).rejects.toThrow("RESEND_API_KEY");
  });

  it("throws error if LEAD_NOTIFY_EMAIL is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("LEAD_NOTIFY_EMAIL", "");

    await expect(sendLeadEmail(mockData, null)).rejects.toThrow("LEAD_NOTIFY_EMAIL");
  });
});
