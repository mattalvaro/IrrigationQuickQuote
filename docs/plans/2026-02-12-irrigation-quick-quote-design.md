# IrrigationQuickQuote — Design Document

## Purpose

A guided wizard web app that gives DIY irrigation customers a high-level cost estimate based on their property. The standout feature is a Mapbox-powered interactive map where customers draw their lawn and garden areas on a satellite view of their property. The app produces a simple summary estimate (not a detailed parts list) and captures the customer's contact details as a lead.

The estimate is clearly presented as a guide price requiring confirmation — not a binding quote.

## User Flow

1. **Welcome** — Brief intro explaining what the tool does and that it produces a guide price
2. **Address & Map** — Customer enters their address, Mapbox centers on their property. They draw polygons to mark lawn areas and garden beds. Areas (m²) are calculated and displayed in real time
3. **Additional Details** — A few quick questions: water source type, number of tap points, manual vs automatic control
4. **Estimate** — Summary price breakdown by category (Lawn Irrigation, Garden Irrigation, Controller/Timer, Pipe & Fittings). Clear "guide price" disclaimer
5. **Lead Capture** — Name, email, phone to receive the estimate. Map snapshot included in what they receive

## Architecture

### Standalone App

Next.js app deployed on Vercel. Handles the full wizard experience, lead storage, and serves the embeddable widget script.

### Embeddable Widget

The wizard component bundled as a single JS file that third-party sites can drop in with a `<script>` tag and a `<div>` placeholder. Same React wizard, just mounted into the host page.

### Key Components

- **Wizard Shell** — Controls step navigation, progress indicator, back/next flow
- **MapStep** — Mapbox GL JS integration. Address geocoding, satellite imagery, polygon drawing tool, area calculation, snapshot capture
- **DetailsStep** — Simple form: water source (dropdown), number of tap points (number input), manual vs automatic (toggle)
- **EstimateStep** — Reads areas + details, runs them through the pricing config, displays the summary breakdown with disclaimer
- **LeadCaptureStep** — Contact form (name, email, phone). On submit, stores the lead with the estimate data and map snapshot

### Pricing Engine

A pure function that takes the inputs (lawn m², garden m², number of zones, tap points, controller type) and returns category totals based on rates defined in a JSON config file.

### Data Storage

Leads stored via a simple API route in Next.js. Each lead record holds: name, email, phone, estimate breakdown, input data (areas, details), map snapshot (base64 or uploaded to blob storage), and timestamp.

## Mapbox Integration

### Address Search

Mapbox Geocoding API. Customer types their address, autocomplete suggests matches, selection flies the map to their property at a close zoom level with satellite imagery.

### Drawing Tools

Mapbox GL Draw plugin. Customer switches between two drawing modes:

- **Lawn** (green polygons) — tap corners to outline lawn areas
- **Garden** (brown/orange polygons) — tap corners to outline garden beds

Each polygon shows its calculated area (m²) as a label on the map. Customers can draw multiple polygons of each type (e.g., front lawn + back lawn). Running totals for total lawn m² and total garden m² are displayed alongside the map.

### Editing

Customers can click a polygon to select it, drag vertices to adjust, or delete it and redraw.

### Snapshot

When the customer proceeds to the next step, the map canvas (with all drawn polygons visible) is captured as a PNG using Mapbox's `preserveDrawingBuffer` option. This image is stored with the lead data and included in the estimate they receive.

### Mobile Consideration

Drawing polygons on a phone is tricky. The map step should work on tablet and desktop. On mobile, either simplify to manual m² input fields or allow drawing with touch-friendly larger hit targets.

## Pricing Config

A JSON file (`config/pricing.json`) with rates per category:

```json
{
  "lawn": { "ratePerSqm": 12.50, "label": "Lawn Irrigation" },
  "garden": { "ratePerSqm": 18.00, "label": "Garden Irrigation" },
  "controller": { "manual": 0, "automatic": 250, "label": "Controller/Timer" },
  "tapPoint": { "ratePerPoint": 85, "label": "Pipe & Fittings" },
  "baseCost": 150
}
```

### Example Estimate Output

| Category | Amount |
|---|---|
| Lawn Irrigation (120 m²) | $1,500 |
| Garden Irrigation (40 m²) | $720 |
| Controller/Timer | $250 |
| Pipe & Fittings (2 tap points) | $170 |
| Base Cost | $150 |
| **Guide Price Total** | **$2,790** |

*This is a guide price only and would need to be confirmed based on a site assessment.*

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Map | Mapbox GL JS + Mapbox Draw |
| Styling | Tailwind CSS |
| Deployment | Vercel |
| Database | SQLite via Turso (or simple file-based storage to start) |
| Widget Bundle | Vite (standalone script) |

## Delivery Modes

- **Standalone:** Full Next.js app at its own domain
- **Embeddable:** Single `<script>` tag + `<div>` that third-party sites drop in
