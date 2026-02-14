# Lead Email with Annotated Map — Design

## Summary

When a customer submits the quote wizard, send an email to the business with the full quote details and an annotated satellite map image showing drawn areas with edge length measurements. The map image is also attached as a full-resolution PNG file for design/field use.

## Map Annotation (Client-side Canvas)

Edge length labels are drawn directly onto the Mapbox canvas before the snapshot is captured.

### How it works

1. On `wizard:beforeNext`, before calling `toDataURL()`, iterate through all features in MapboxDraw
2. For each polygon, use `map.project()` to convert each vertex's lat/lng to pixel coordinates
3. For each edge (pair of consecutive vertices):
   - Calculate real-world distance using the Haversine formula (no new dependencies)
   - Find the midpoint in pixel space
   - Draw a label (e.g., "12.3m") with Canvas 2D `fillText`
4. Labels get a semi-transparent dark background pill for readability over satellite imagery
5. Lawn edges labeled in green, garden edges in orange (matching existing color coding)
6. `toDataURL()` then captures the fully annotated canvas

### Edge cases

- Edges shorter than 0.5m are not labeled (avoids clutter)
- Label overlap on complex shapes is not solved in v1 (most residential lots are simple rectangles)

## Email via Resend

### Dependencies

- `resend` npm package (new)

### Environment variables

- `RESEND_API_KEY` — Resend API key (server-side only)
- `LEAD_NOTIFY_EMAIL` — business email to receive notifications

### Trigger

Fires in `POST /api/leads` after the lead is saved to JSON. Fire-and-forget — errors are logged but don't block the 201 response.

### Email content

- **Subject:** `New Quote Request — {name} — {total area}m²`
- **Inline map image:** annotated satellite screenshot displayed in the email body (CID attachment)
- **Full-res attachment:** same PNG as a downloadable file attachment for design use
- **Customer details:** name, email, phone
- **Area summary:** lawn total m², garden total m²
- **Quote breakdown:** all line items + guide price total
- **Product selections:** sprinkler types, nozzle types, controller, water source, connection type
- **Timestamp**

### Template approach

Plain HTML string with inline styles built in `src/lib/email.ts`. No React Email dependency — the email is simple enough for a template literal.

### Map image handling

Base64 PNG from the snapshot is decoded to a Buffer. Used twice in the Resend API call:
1. As an inline CID attachment for rendering in the email body
2. As a separate full-resolution file attachment (`property-map.png`)

## Files changed

| File | Change |
|------|--------|
| `src/components/MapStep.tsx` | Add `annotateCanvas()` — draws edge length labels before snapshot |
| `src/app/api/leads/route.ts` | Add Resend email call after lead save |
| `src/lib/email.ts` | New — email sending logic + HTML template |
| `.env.example` | Add `RESEND_API_KEY`, `LEAD_NOTIFY_EMAIL` |

## Data flow

1. User completes wizard → clicks "Get My Estimate"
2. `wizard:beforeNext` fires → `annotateCanvas()` draws labels → `toDataURL()` captures annotated snapshot
3. Client POSTs to `/api/leads` with wizard data + annotated `mapSnapshot`
4. API saves lead to JSON (existing)
5. API calls `sendLeadEmail()` — decodes base64, sends via Resend with inline + file attachment
6. Client shows success screen

## What doesn't change

- `WizardData` types — `mapSnapshot` is already `string | null`
- Wizard flow and step order
- Client-side behavior after submission
