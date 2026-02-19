# Scale Bar for Email Snapshot

## Summary

Replace per-edge measurement labels on the email snapshot image with a single 10m scale bar, so users can calibrate the image when imported into a CAD program.

## Requirements

- **Live map**: No changes. Edge measurement labels, leader lines, and dots remain during drawing.
- **Email snapshot**: Remove all measurement labels, leader lines, and endpoint dots. Add a 10m scale bar in the bottom-right corner.
- Polygons (lawn green, garden orange/dashed) remain on the snapshot.

## Scale Bar Design

### Calculation

- At capture time, use the map's current center and zoom level.
- Project two points 10m apart horizontally using `map.project()` / `map.unproject()` to get the pixel length of 10m.
- Multiply by device pixel ratio for hi-DPI canvas.

### Visual Style

- Horizontal white line with small vertical end caps (`|——————|`).
- White text label "10m" centered above the line.
- Black shadow/outline behind line and text for contrast against satellite imagery.
- Positioned bottom-right with ~20px margin from canvas edge.

### Sizing

- Line thickness: 2px (x DPR)
- End cap height: 8px (x DPR)
- Font: bold 11px Plus Jakarta Sans (same as existing labels)

## Implementation Scope

### Files changed

- `src/components/MapStep.tsx` — modify `annotateCanvas()` only:
  - Remove label, leader line, and dot rendering from canvas
  - Add scale bar drawing using map projection to calculate 10m in pixels
  - Draw scale bar in bottom-right corner

### Files NOT changed

- `updateEdgeLabels()` — untouched, live map labels stay
- `labelCollision.ts` — still used by live map, no changes
- `email.ts` — receives snapshot as before, no changes
- `Wizard.tsx` — no changes

No new files needed. ~50-line modification to one function.
