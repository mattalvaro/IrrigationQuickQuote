import { Resend } from "resend";

export interface LeadEmailData {
  name: string;
  email: string;
  phone: string;
  address: string;
  lawnArea: number;
  gardenArea: number;
  pavementArea: number;
  otherArea: number;
  quote: {
    lineItems: Array<{ description: string; amount: number }>;
    total: number;
  };
  selections: {
    lawnSprinklerType?: string;
    gardenSprinklerType?: string;
    lawnNozzleType?: string;
    gardenNozzleType?: string;
    controllerType?: string;
  };
}

const formatAUD = (amount: number): string => {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function buildLeadEmailHtml(data: LeadEmailData): string {
  const totalArea = data.lawnArea + data.gardenArea + data.pavementArea + data.otherArea;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Quote Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #132e1f; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                New Quote Request
              </h1>
              <p style="margin: 10px 0 0 0; color: #a8d5a8; font-size: 16px;">
                ${totalArea}m² total area
              </p>
            </td>
          </tr>

          <!-- Customer Details -->
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #e5e5e5;">
              <h2 style="margin: 0 0 20px 0; color: #132e1f; font-size: 18px; font-weight: 600;">
                Customer Details
              </h2>
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Name:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 500;">${data.name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Email:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">
                    <a href="mailto:${data.email}" style="color: #2e7d32; text-decoration: none;">${data.email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Phone:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">
                    <a href="tel:${data.phone}" style="color: #2e7d32; text-decoration: none;">${data.phone}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Address:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${data.address}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Area Breakdown -->
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #e5e5e5;">
              <h2 style="margin: 0 0 20px 0; color: #132e1f; font-size: 18px; font-weight: 600;">
                Area Breakdown
              </h2>
              <table role="presentation" style="width: 100%;">
                ${data.lawnArea > 0 ? `
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Lawn:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${data.lawnArea}m²</td>
                </tr>
                ` : ''}
                ${data.gardenArea > 0 ? `
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Garden:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${data.gardenArea}m²</td>
                </tr>
                ` : ''}
                ${data.pavementArea > 0 ? `
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Pavement:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${data.pavementArea}m²</td>
                </tr>
                ` : ''}
                ${data.otherArea > 0 ? `
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Other:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${data.otherArea}m²</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 12px 0 8px 0; color: #132e1f; font-size: 14px; font-weight: 600; border-top: 1px solid #e5e5e5;">Total:</td>
                  <td style="padding: 12px 0 8px 0; color: #132e1f; font-size: 14px; font-weight: 600; text-align: right; border-top: 1px solid #e5e5e5;">${totalArea}m²</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Quote Breakdown -->
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #e5e5e5;">
              <h2 style="margin: 0 0 20px 0; color: #132e1f; font-size: 18px; font-weight: 600;">
                Quote Breakdown
              </h2>
              <table role="presentation" style="width: 100%;">
                ${data.quote.lineItems.map(item => `
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">${item.description}</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${formatAUD(item.amount)}</td>
                </tr>
                `).join('')}
                <tr>
                  <td style="padding: 16px 0 8px 0; color: #132e1f; font-size: 16px; font-weight: 600; border-top: 2px solid #132e1f;">Total:</td>
                  <td style="padding: 16px 0 8px 0; color: #132e1f; font-size: 18px; font-weight: 700; text-align: right; border-top: 2px solid #132e1f;">${formatAUD(data.quote.total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Product Selections -->
          <tr>
            <td style="padding: 30px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #132e1f; font-size: 18px; font-weight: 600;">
                Product Selections
              </h2>
              <table role="presentation" style="width: 100%;">
                ${data.selections.lawnSprinklerType ? `
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Lawn Sprinkler Type:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${data.selections.lawnSprinklerType}</td>
                </tr>
                ` : ''}
                ${data.selections.gardenSprinklerType ? `
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Garden Sprinkler Type:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${data.selections.gardenSprinklerType}</td>
                </tr>
                ` : ''}
                ${data.selections.lawnNozzleType ? `
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Lawn Nozzle Type:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${data.selections.lawnNozzleType}</td>
                </tr>
                ` : ''}
                ${data.selections.gardenNozzleType ? `
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Garden Nozzle Type:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${data.selections.gardenNozzleType}</td>
                </tr>
                ` : ''}
                ${data.selections.controllerType ? `
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Controller Type:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${data.selections.controllerType}</td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9f9f9; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                This is an automated quote request from IrrigationQuickQuote
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendLeadEmail(
  data: LeadEmailData,
  mapSnapshotBase64: string | null
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.LEAD_NOTIFY_EMAIL;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }

  if (!notifyEmail) {
    throw new Error("LEAD_NOTIFY_EMAIL environment variable is not set");
  }

  const resend = new Resend(apiKey);
  const totalArea = data.lawnArea + data.gardenArea + data.pavementArea + data.otherArea;
  const subject = `New Quote Request — ${data.name} — ${totalArea}m²`;
  const html = buildLeadEmailHtml(data);

  const attachments: Array<{
    filename: string;
    content: Buffer;
  }> = [];

  // Add map snapshot as regular attachment if provided
  if (mapSnapshotBase64) {
    // Strip data URI prefix if present
    const base64Data = mapSnapshotBase64.replace(/^data:image\/png;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    attachments.push({
      filename: "property-map.png",
      content: imageBuffer,
    });
  }

  await resend.emails.send({
    from: "IrrigationQuickQuote <onboarding@resend.dev>",
    to: notifyEmail,
    subject,
    html,
    attachments: attachments.length > 0 ? attachments : undefined,
  });
}
