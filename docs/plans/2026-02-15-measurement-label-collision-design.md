# Measurement Label Collision Detection & Visual Improvements

**Date:** 2026-02-15
**Status:** Approved
**Approach:** Grid-based collision avoidance with radial fallback

---

## Problem Statement

When multiple lawn and garden areas are drawn on the map, edge measurements overlap and become difficult to read. Additionally, the color distinction between lawn and garden areas is too subtle, making it hard to identify which measurements belong to which area type.

### Current Issues

1. **Overlapping labels** — Measurements positioned at edge midpoints overlap when polygons are close together or have many edges in a small space
2. **Poor color distinction** — Subtle cyan/orange colors don't clearly distinguish lawn from garden areas
3. **Crowding** — No collision detection or smart positioning leads to unreadable clusters (e.g., "6.7m, 1.6m, 11m" all overlapping)
4. **Email vs app consistency** — Both rendering modes (Mapbox markers and canvas) need identical behavior

---

## Solution Overview

Implement **grid-based collision avoidance** with these features:

- **Smart label positioning** using 8-direction grid offset, with radial spread for dense clusters
- **Leader lines** connecting repositioned labels to their edge midpoints (CAD-style)
- **Stronger polygon colors** with vibrant green (lawn) and orange (garden) fills and strokes
- **Matching label colors** using colored backgrounds instead of colored text
- **Identical behavior** in both live app (Mapbox markers) and email snapshots (canvas rendering)

---

## Visual Design

### Polygon Styling

**Current:**
- Lawn: Light cyan/blue with subtle fill
- Garden: Orange dashed outline

**New:**
- **Lawn polygons:**
  - Stroke: `#22c55e` (vibrant green), 3px width
  - Fill: `rgba(34, 197, 94, 0.15)` (semi-transparent green)
- **Garden polygons:**
  - Stroke: `#d97706` (vibrant orange), 3px width
  - Fill: `rgba(217, 119, 6, 0.15)` (semi-transparent orange)

### Measurement Labels

**Current:** Black pill background with colored text

**New:**
- **Background:** Semi-transparent colored pill matching polygon type
  - Lawn: `rgba(34, 197, 94, 0.85)` green background
  - Garden: `rgba(217, 119, 6, 0.85)` orange background
- **Text:** White (`#ffffff`) for high contrast
- **Font:** Plus Jakarta Sans, bold, 11px (scales with DPR for email)
- **Padding:** 4px horizontal, 3px vertical
- **Border radius:** 4px

### Leader Lines

- **Color:** Matches polygon type (`#22c55e` for lawn, `#d97706` for garden)
- **Width:** 1.5px (thin but visible)
- **Style:** Solid line
- **Opacity:** 0.7 (subtle, doesn't dominate)
- **Endpoint:** Small dot (3px radius) at edge midpoint to mark measurement location
- **When shown:** Only when label is repositioned away from edge midpoint

---

## Collision Detection Algorithm

### Bounding Box Structure

```typescript
interface LabelBox {
  id: string;                    // unique identifier (edge index + polygon id)
  x: number;                     // center X position (px or canvas coords)
  y: number;                     // center Y position (px or canvas coords)
  width: number;                 // label width in pixels
  height: number;                // label height in pixels
  edgeMidpoint: [number, number]; // original [lng, lat] or [x, y]
  distance: number;              // the measurement value (e.g., 13.5)
  type: 'lawn' | 'garden';
  finalPosition?: [number, number]; // set after collision resolution
  needsLeader?: boolean;         // true if moved from midpoint
}
```

### Overlap Detection

Two labels overlap if their bounding boxes intersect with an 8px minimum gap:

```typescript
function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  const padding = 8; // 8px minimum gap between labels
  return !(
    a.x + a.width/2 + padding < b.x - b.width/2 ||
    a.x - a.width/2 - padding > b.x + b.width/2 ||
    a.y + a.height/2 + padding < b.y - b.height/2 ||
    a.y - a.height/2 - padding > b.y + b.height/2
  );
}
```

### Processing Order

Labels are positioned in priority order:

1. **Longest edges first** — Larger measurements are more important and get priority placement
2. **Lawn before garden** — Arbitrary but consistent ordering
3. **Descending by distance** — Within each type, sort by measurement value descending

This ensures critical measurements (longest edges) secure their preferred positions first, while smaller measurements are more likely to be repositioned.

---

## Label Positioning Strategy

### Grid-Based Positioning

For each label, try positions in this order:

1. **Original position** (edge midpoint) — No leader line if this works
2. **8-direction grid** if overlap detected:
   - **North (0°):** `[x, y - offset]`
   - **Northeast (45°):** `[x + offset, y - offset]`
   - **East (90°):** `[x + offset, y]`
   - **Southeast (135°):** `[x + offset, y + offset]`
   - **South (180°):** `[x, y + offset]`
   - **Southwest (225°):** `[x - offset, y + offset]`
   - **West (270°):** `[x - offset, y]`
   - **Northwest (315°):** `[x - offset, y - offset]`

   Where `offset = 40px` (sufficient to clear most labels)

3. **Radial spread fallback** if all 8 grid positions overlap:
   - Identify all labels in cluster (within 60px of each other)
   - Calculate cluster centroid (average x, average y)
   - Spread labels in circle around centroid with radius `60px + (clusterSize * 10px)`
   - Distribute evenly: angle between labels = `360° / clusterSize`

### Example Flow

```
Label A at (100, 100) — no overlap, stays at edge midpoint, no leader line
Label B at (105, 102) — overlaps with A
  ↳ Try North (105, 62) — no overlap! Place here, draw leader line
Label C at (108, 104) — overlaps with A and B
  ↳ Try North (108, 64) — overlaps with B
  ↳ Try NE (148, 64) — no overlap! Place here, draw leader line
Label D at (110, 105) — overlaps with A, B, C
  ↳ Try all 8 positions — all overlap!
  ↳ FALLBACK: Cluster detected (A, B, C, D)
  ↳ Spread all 4 in radial pattern at 0°, 90°, 180°, 270°
```

### Canvas Bounds Checking

After positioning, ensure labels stay within map canvas:

- If `x - width/2 < 0`, shift right
- If `x + width/2 > canvasWidth`, shift left
- If `y - height/2 < 0`, shift down
- If `y + height/2 > canvasHeight`, shift up

---

## Implementation Architecture

### Code Structure

All logic resides in **MapStep.tsx** as new helper functions:

```typescript
// New helper functions

function calculateLabelBoxes(
  map: MapboxMap,
  draw: MapboxDraw,
  featureTypes: Map<string, 'lawn' | 'garden'>,
  dpr: number
): LabelBox[] {
  // Extract all edges, calculate pixel positions and bounding boxes
}

function detectCollisions(boxes: LabelBox[]): LabelBox[] {
  // Sort by priority, detect overlaps
}

function positionLabelsWithGrid(
  boxes: LabelBox[],
  canvasWidth: number,
  canvasHeight: number
): LabelBox[] {
  // Apply grid-based positioning algorithm
}

function radialSpreadCluster(
  cluster: LabelBox[],
  centroid: [number, number]
): void {
  // Spread cluster in radial pattern
}
```

### Integration Points

#### Live App (Mapbox Markers)

Modify `updateEdgeLabels()`:

1. Calculate all label boxes using `calculateLabelBoxes()`
2. Run collision detection and positioning
3. Create Mapbox markers at final positions (not edge midpoints)
4. For labels with `needsLeader: true`:
   - Create additional marker elements for leader lines (SVG line elements)
   - Create small dot markers at edge midpoints

#### Email Snapshot (Canvas)

Modify `annotateCanvas()`:

1. Calculate all label boxes (same logic as live app)
2. Run collision detection and positioning (same algorithm)
3. Draw leader lines first (behind labels) using canvas line drawing
4. Draw endpoint dots at edge midpoints
5. Draw labels at final positions

**Key principle:** Both rendering modes use identical positioning logic. Only the rendering method differs (DOM elements vs canvas drawing).

### Polygon Color Challenge

**Problem:** MapboxDraw styles are static and don't have access to the `featureTypes` map that tracks which polygons are lawn vs garden.

**Solutions considered:**

1. **Custom Mapbox GL sources/layers** — Replace MapboxDraw's default polygon rendering with custom layers that reference `featureTypes`. More control but complex.
2. **Post-draw styling** — After drawing completes, add custom Mapbox GL layers on top to apply colors. Simpler but polygons flash with default style first.
3. **Accept default draw styling** — Keep MapboxDraw's default blue for all polygons during drawing, rely on label colors for distinction. Simplest but loses visual reinforcement.

**Recommended:** Start with option 3 (accept default styling) to unblock implementation. Enhance with option 2 (post-draw styling) in a follow-up if needed.

---

## Testing Strategy

### Manual Testing Scenarios

1. **Single polygon, no overlap**
   - Draw one lawn area with 4-5 edges
   - Verify: All labels at edge midpoints, no leader lines, green styling

2. **Two adjacent polygons, some overlap**
   - Draw lawn and garden areas close together
   - Verify: Overlapping labels repositioned, leader lines drawn, colors distinct (green vs orange)

3. **Dense cluster (4+ labels)**
   - Draw complex shapes with many edges in small space
   - Verify: Radial spread activated, all labels visible and readable, leader lines connect correctly

4. **Canvas bounds**
   - Draw polygon at map edge (top, bottom, left, right)
   - Verify: Labels don't extend off-canvas, shifted inward correctly, still readable

5. **Email snapshot consistency**
   - Complete full wizard flow, submit lead
   - Verify: Email image matches live app appearance, leader lines render correctly, colors preserved

### Automated Tests (Nice-to-Have)

Add test file `src/components/__tests__/MapStep.collision.test.ts`:

```typescript
describe('Label collision detection', () => {
  test('boxesOverlap detects overlapping labels', () => { ... });
  test('boxesOverlap allows non-overlapping labels', () => { ... });
  test('positionLabelsWithGrid finds valid position in 8-grid', () => { ... });
  test('radialSpreadCluster distributes labels evenly', () => { ... });
  test('canvas bounds checking prevents off-screen labels', () => { ... });
});
```

These tests verify pure positioning functions in isolation.

### Visual Regression Testing (Future)

Eventually add Playwright visual regression tests:
- Capture screenshots of map with various polygon configurations
- Compare against baseline images
- Detect unintended styling changes

For initial launch, manual testing is sufficient given the visual nature of this feature.

---

## Success Criteria

1. **No overlapping labels** — All measurements readable even with complex, dense polygon arrangements
2. **Clear visual distinction** — Obvious which measurements belong to lawn vs garden areas
3. **Professional appearance** — Leader lines create CAD/survey software aesthetic
4. **Consistent rendering** — Live app and email snapshots look identical
5. **Performance** — No noticeable lag when drawing polygons or updating measurements
6. **Maintainable code** — Pure functions, well-documented, testable

---

## Future Enhancements

- **Interactive label repositioning** — Allow user to drag labels to custom positions
- **Measurement tooltips** — Hover to highlight the corresponding edge on the polygon
- **Polygon styling** — Implement custom Mapbox GL layers for lawn/garden color distinction during drawing
- **Visual regression tests** — Automated screenshot comparison to catch styling regressions
- **Zoom-aware label sizing** — Scale label font size based on map zoom level
