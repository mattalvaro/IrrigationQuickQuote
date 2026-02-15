# IrrigationQuickQuote

## Commands
- `npm run dev` — Start dev server (Next.js + Turbopack)
- `npm run build` — Production build
- `npm run test:run` — Run all tests once
- `npm test` — Run tests in watch mode
- `npm run lint` — ESLint check
- `npm run build:widget` — Build embeddable widget (IIFE → public/widget/)

## Environment
- Requires `NEXT_PUBLIC_MAPBOX_TOKEN` — Mapbox public token (format: `pk.eyJ...`)
- Requires `RESEND_API_KEY` — Resend API key for sending lead notification emails (server-side only)
- Requires `LEAD_NOTIFY_EMAIL` — Business email address to receive lead notifications
- Copy `.env.example` → `.env.local` and fill in your tokens

## Project Structure
- `src/app/` — Next.js App Router (layout, page, API routes)
- `src/components/` — Wizard steps and reusable components
- `src/components/__tests__/` — Component tests
- `src/lib/` — Types (`types.ts`) and pricing engine (`pricing.ts`)
- `src/lib/__tests__/` — Library tests
- `src/config/` — Pricing rates (`pricing.json`) and product options (`productOptions.ts`)
- `src/test/setup.ts` — Vitest setup (testing-library/jest-dom)
- `widget/` — Embeddable widget entry point and Vite config
- `public/css/` — Mapbox CSS files (copied from node_modules)
- `docs/plans/` — Design docs and implementation plans

## Architecture
- Next.js 16 App Router + Tailwind CSS v4 + TypeScript
- Mapbox GL JS loaded via CDN (`next/script` with `beforeInteractive`), NOT npm imports — Turbopack can't bundle mapbox-gl
- MapStep uses `declare const mapboxgl` globals, dynamically imported with `ssr: false`
- Path alias: `@/*` → `./src/*`
- Tests: Vitest + jsdom + @testing-library/react

### Measurement Label Collision Detection
- Grid-based collision avoidance with 8-direction positioning (40px offset)
- Radial spread fallback for dense clusters (4+ overlapping labels)
- Leader lines (CAD-style) connect repositioned labels to edge midpoints
- Visual styling: green backgrounds for lawn, orange for garden (white text)
- Identical behavior in live app (Mapbox markers) and email snapshots (canvas rendering)
- 8px minimum padding between labels, canvas bounds checking

## Conventions
- Components: named exports in PascalCase files (`ProductSelectionStep.tsx`)
- Tests: colocated in `__tests__/` directories next to source
- Pricing: flat add-on costs for products, per-sqm rates for area types — all defined in `pricing.json`
- Wizard flow: welcome → map → lawnSprinklerType? → gardenSprinklerType? → lawnNozzleType? → gardenNozzleType? → controllerType → details → estimate → lead (10 steps max, conditional on drawn areas and pop-up sprinkler selection)

## Gotchas
- `onUpdate` callbacks passed to MapStep MUST be wrapped in `useCallback` or the map reinitializes on every render
- Do NOT import mapbox-gl via npm — use the CDN globals only
- Mapbox token format starts with `pk.eyJ...` — don't double-prefix
- Plain `<script>` tags in layout.tsx don't load reliably — use `next/script`
- Collision detection helpers (`boxesOverlap`, `positionLabelsWithGrid`, `radialSpreadCluster`) are exported from MapStep for testing — don't duplicate this logic
