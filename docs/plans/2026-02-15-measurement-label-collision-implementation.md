# Measurement Label Collision Detection - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement grid-based collision detection for measurement labels with leader lines, eliminating overlaps and improving visual clarity.

**Architecture:** Pure TypeScript helper functions for collision detection and positioning, integrated into existing MapStep.tsx component. Same logic used for both Mapbox markers (live app) and canvas rendering (email snapshots).

**Tech Stack:** TypeScript, React, Mapbox GL JS, HTML5 Canvas

**Design Doc:** `docs/plans/2026-02-15-measurement-label-collision-design.md`

---

## Task 1: Add TypeScript interfaces for collision detection

**Files:**
- Modify: `src/components/MapStep.tsx:1-20` (add interfaces after imports)

**Step 1: Add LabelBox interface**

Add this interface after the existing type declarations (around line 12):

```typescript
interface LabelBox {
  id: string;                     // unique identifier (edge index + polygon id)
  x: number;                      // center X position (px or canvas coords)
  y: number;                      // center Y position (px or canvas coords)
  width: number;                  // label width in pixels
  height: number;                 // label height in pixels
  edgeMidpoint: [number, number]; // original [lng, lat] or [x, y]
  edgeMidpointPx: [number, number]; // edge midpoint in pixel coords
  distance: number;               // the measurement value (e.g., 13.5)
  type: 'lawn' | 'garden';
  finalPosition?: [number, number]; // set after collision resolution
  needsLeader?: boolean;          // true if moved from midpoint
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run dev`

Expected: Dev server starts with no TypeScript errors

**Step 3: Commit**

```bash
git add src/components/MapStep.tsx
git commit -m "feat: add LabelBox interface for collision detection"
```

---

## Task 2: Implement boxesOverlap helper function

**Files:**
- Modify: `src/components/MapStep.tsx:495` (add function after calcDistanceLocal)

**Step 1: Write the failing test**

Create test file:

```typescript
// src/components/__tests__/MapStep.collision.test.ts
import { describe, test, expect } from 'vitest';

// We'll export these functions from MapStep for testing
describe('Label collision detection', () => {
  test('boxesOverlap detects overlapping labels', () => {
    const a = { x: 100, y: 100, width: 50, height: 20 };
    const b = { x: 110, y: 105, width: 50, height: 20 };

    // These boxes overlap (centers only 10px apart, boxes extend 25px + 10px = 35px each)
    expect(boxesOverlap(a, b)).toBe(true);
  });

  test('boxesOverlap allows non-overlapping labels with padding', () => {
    const a = { x: 100, y: 100, width: 50, height: 20 };
    const b = { x: 200, y: 100, width: 50, height: 20 };

    // These boxes don't overlap (100px apart, each extends 25px + 8px padding = 33px)
    expect(boxesOverlap(a, b)).toBe(false);
  });
});

// Placeholder - will be implemented in MapStep.tsx
function boxesOverlap(a: any, b: any): boolean {
  return false;
}
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/__tests__/MapStep.collision.test.ts`

Expected: FAIL - "expected false to be true"

**Step 3: Write minimal implementation**

Add function to `src/components/MapStep.tsx` after `calcDistanceLocal` (around line 495):

```typescript
function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  const padding = 8; // 8px minimum gap between labels
  return !(
    a.x + a.width / 2 + padding < b.x - b.width / 2 ||
    a.x - a.width / 2 - padding > b.x + b.width / 2 ||
    a.y + a.height / 2 + padding < b.y - b.height / 2 ||
    a.y - a.height / 2 - padding > b.y + b.height / 2
  );
}
```

Export the function for testing by adding `export` keyword:

```typescript
export function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  const padding = 8;
  return !(
    a.x + a.width / 2 + padding < b.x - b.width / 2 ||
    a.x - a.width / 2 - padding > b.x + b.width / 2 ||
    a.y + a.height / 2 + padding < b.y - b.height / 2 ||
    a.y - a.height / 2 - padding > b.y + b.height / 2
  );
}
```

**Step 4: Update test to import real function**

Update test file:

```typescript
// src/components/__tests__/MapStep.collision.test.ts
import { describe, test, expect } from 'vitest';
import { boxesOverlap } from '../MapStep';

describe('Label collision detection', () => {
  test('boxesOverlap detects overlapping labels', () => {
    const a = { x: 100, y: 100, width: 50, height: 20 };
    const b = { x: 110, y: 105, width: 50, height: 20 };
    expect(boxesOverlap(a, b)).toBe(true);
  });

  test('boxesOverlap allows non-overlapping labels with padding', () => {
    const a = { x: 100, y: 100, width: 50, height: 20 };
    const b = { x: 200, y: 100, width: 50, height: 20 };
    expect(boxesOverlap(a, b)).toBe(false);
  });
});
```

**Step 5: Run test to verify it passes**

Run: `npm test src/components/__tests__/MapStep.collision.test.ts`

Expected: PASS - all tests green

**Step 6: Commit**

```bash
git add src/components/MapStep.tsx src/components/__tests__/MapStep.collision.test.ts
git commit -m "feat: add boxesOverlap collision detection helper"
```

---

## Task 3: Implement calculateLabelBoxes helper function

**Files:**
- Modify: `src/components/MapStep.tsx:510` (add after boxesOverlap)

**Step 1: Write the implementation**

This function extracts all edges from drawn polygons and calculates bounding boxes:

```typescript
function calculateLabelBoxes(
  map: MapboxMap,
  draw: InstanceType<typeof MapboxDraw>,
  featureTypes: Map<string, 'lawn' | 'garden'>,
  dpr: number
): LabelBox[] {
  const allFeatures = draw.getAll();
  const boxes: LabelBox[] = [];

  for (const feature of allFeatures.features) {
    const id = feature.id as string;
    const type = featureTypes.get(id);
    if (!type || !feature.geometry || feature.geometry.type !== 'Polygon') continue;

    const coords = feature.geometry.coordinates[0] as [number, number][];
    if (!coords || coords.length < 4) continue;

    for (let i = 0; i < coords.length - 1; i++) {
      const dist = calcDistanceLocal(coords[i], coords[i + 1]);
      if (dist < 0.5) continue; // Skip tiny edges

      const midLng = (coords[i][0] + coords[i + 1][0]) / 2;
      const midLat = (coords[i][1] + coords[i + 1][1]) / 2;
      const label = dist < 10 ? `${dist.toFixed(1)}m` : `${Math.round(dist)}m`;

      // Calculate pixel position
      const midPx = map.project([midLng, midLat] as [number, number]);

      // Estimate label dimensions (will be more accurate when rendered)
      const fontSize = 11 * dpr;
      const estimatedWidth = (label.length * fontSize * 0.6 + 8 * dpr) / dpr;
      const estimatedHeight = (fontSize + 6 * dpr) / dpr;

      boxes.push({
        id: `${id}-edge-${i}`,
        x: midPx.x,
        y: midPx.y,
        width: estimatedWidth,
        height: estimatedHeight,
        edgeMidpoint: [midLng, midLat],
        edgeMidpointPx: [midPx.x, midPx.y],
        distance: dist,
        type,
        finalPosition: [midPx.x, midPx.y], // Start at midpoint
        needsLeader: false,
      });
    }
  }

  return boxes;
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run dev`

Expected: Dev server starts with no TypeScript errors

**Step 3: Commit**

```bash
git add src/components/MapStep.tsx
git commit -m "feat: add calculateLabelBoxes helper for bounding box extraction"
```

---

## Task 4: Implement positionLabelsWithGrid helper function

**Files:**
- Modify: `src/components/MapStep.tsx:570` (add after calculateLabelBoxes)

**Step 1: Write the implementation**

This function positions labels using 8-direction grid offset:

```typescript
function positionLabelsWithGrid(
  boxes: LabelBox[],
  canvasWidth: number,
  canvasHeight: number
): LabelBox[] {
  // Sort by priority: longest edges first, lawn before garden
  const sortedBoxes = [...boxes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'lawn' ? -1 : 1;
    return b.distance - a.distance; // Descending
  });

  const positioned: LabelBox[] = [];
  const offset = 40; // pixels

  // 8 directions: N, NE, E, SE, S, SW, W, NW
  const directions: Array<[number, number]> = [
    [0, -offset],      // N
    [offset, -offset], // NE
    [offset, 0],       // E
    [offset, offset],  // SE
    [0, offset],       // S
    [-offset, offset], // SW
    [-offset, 0],      // W
    [-offset, -offset] // NW
  ];

  for (const box of sortedBoxes) {
    let placed = false;
    const [origX, origY] = box.edgeMidpointPx!;

    // Try original position first
    box.x = origX;
    box.y = origY;
    box.finalPosition = [origX, origY];
    box.needsLeader = false;

    if (!positioned.some(p => boxesOverlap(box, p))) {
      positioned.push(box);
      continue;
    }

    // Try 8 grid positions
    for (const [dx, dy] of directions) {
      box.x = origX + dx;
      box.y = origY + dy;
      box.finalPosition = [box.x, box.y];
      box.needsLeader = true;

      // Check canvas bounds
      const left = box.x - box.width / 2;
      const right = box.x + box.width / 2;
      const top = box.y - box.height / 2;
      const bottom = box.y + box.height / 2;

      if (left < 0 || right > canvasWidth || top < 0 || bottom > canvasHeight) {
        continue; // Out of bounds
      }

      if (!positioned.some(p => boxesOverlap(box, p))) {
        positioned.push(box);
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Fallback: keep at original position even if overlapping
      // Radial spread will be added in next task
      box.x = origX;
      box.y = origY;
      box.finalPosition = [origX, origY];
      box.needsLeader = false;
      positioned.push(box);
    }
  }

  return positioned;
}
```

**Step 2: Add test for grid positioning**

Add to `src/components/__tests__/MapStep.collision.test.ts`:

```typescript
test('positionLabelsWithGrid finds valid position in 8-grid', () => {
  const boxes = [
    {
      id: 'a',
      x: 100,
      y: 100,
      width: 50,
      height: 20,
      edgeMidpoint: [0, 0],
      edgeMidpointPx: [100, 100],
      distance: 10,
      type: 'lawn' as const,
    },
    {
      id: 'b',
      x: 105,
      y: 102,
      width: 50,
      height: 20,
      edgeMidpoint: [0, 0],
      edgeMidpointPx: [105, 102],
      distance: 8,
      type: 'lawn' as const,
    },
  ];

  const positioned = positionLabelsWithGrid(boxes, 1000, 1000);

  // First box should stay at original position
  expect(positioned[0].x).toBe(100);
  expect(positioned[0].y).toBe(100);
  expect(positioned[0].needsLeader).toBe(false);

  // Second box should be repositioned
  expect(positioned[1].x).not.toBe(105);
  expect(positioned[1].needsLeader).toBe(true);
});
```

Import the function:

```typescript
import { boxesOverlap, positionLabelsWithGrid } from '../MapStep';
```

Export from MapStep.tsx:

```typescript
export function positionLabelsWithGrid(
  boxes: LabelBox[],
  canvasWidth: number,
  canvasHeight: number
): LabelBox[] {
  // ... implementation
}
```

**Step 3: Run test to verify it passes**

Run: `npm test src/components/__tests__/MapStep.collision.test.ts`

Expected: PASS - all tests green

**Step 4: Commit**

```bash
git add src/components/MapStep.tsx src/components/__tests__/MapStep.collision.test.ts
git commit -m "feat: add grid-based label positioning with 8-direction offset"
```

---

## Task 5: Implement radialSpreadCluster helper function

**Files:**
- Modify: `src/components/MapStep.tsx:650` (add after positionLabelsWithGrid)

**Step 1: Write the implementation**

This function spreads clustered labels in a radial pattern:

```typescript
function radialSpreadCluster(cluster: LabelBox[], centroid: [number, number]): void {
  const clusterSize = cluster.length;
  const radius = 60 + clusterSize * 10; // Dynamic radius based on cluster size
  const angleStep = (2 * Math.PI) / clusterSize;

  cluster.forEach((box, index) => {
    const angle = index * angleStep;
    const x = centroid[0] + radius * Math.cos(angle);
    const y = centroid[1] + radius * Math.sin(angle);

    box.x = x;
    box.y = y;
    box.finalPosition = [x, y];
    box.needsLeader = true;
  });
}
```

**Step 2: Update positionLabelsWithGrid to use radial spread**

Modify the fallback section in `positionLabelsWithGrid`:

```typescript
  // After trying all grid positions...
  if (!placed) {
    // Collect all overlapping labels into a cluster
    const overlapping = positioned.filter(p => boxesOverlap(box, p));

    if (overlapping.length >= 3) {
      // Form a cluster with this box and overlapping boxes
      const cluster = [...overlapping, box];

      // Calculate centroid
      const centroidX = cluster.reduce((sum, b) => sum + b.edgeMidpointPx![0], 0) / cluster.length;
      const centroidY = cluster.reduce((sum, b) => sum + b.edgeMidpointPx![1], 0) / cluster.length;

      // Apply radial spread
      radialSpreadCluster(cluster, [centroidX, centroidY]);
      positioned.push(box);
      placed = true;
    }
  }

  if (!placed) {
    // Still couldn't place - keep at original position
    box.x = origX;
    box.y = origY;
    box.finalPosition = [origX, origY];
    box.needsLeader = false;
    positioned.push(box);
  }
```

**Step 3: Add test for radial spread**

Add to `src/components/__tests__/MapStep.collision.test.ts`:

```typescript
test('radialSpreadCluster distributes labels evenly', () => {
  const cluster = [
    { id: 'a', x: 100, y: 100, edgeMidpointPx: [100, 100] },
    { id: 'b', x: 102, y: 101, edgeMidpointPx: [102, 101] },
    { id: 'c', x: 101, y: 102, edgeMidpointPx: [101, 102] },
    { id: 'd', x: 103, y: 103, edgeMidpointPx: [103, 103] },
  ] as LabelBox[];

  const centroid: [number, number] = [101.5, 101.5];
  radialSpreadCluster(cluster, centroid);

  // All labels should have needsLeader true
  cluster.forEach(box => {
    expect(box.needsLeader).toBe(true);
  });

  // All labels should be at different positions
  const positions = cluster.map(b => `${b.x},${b.y}`);
  const uniquePositions = new Set(positions);
  expect(uniquePositions.size).toBe(4);
});
```

Import and export:

```typescript
import { boxesOverlap, positionLabelsWithGrid, radialSpreadCluster } from '../MapStep';
```

```typescript
export function radialSpreadCluster(cluster: LabelBox[], centroid: [number, number]): void {
  // ... implementation
}
```

**Step 4: Run test to verify it passes**

Run: `npm test src/components/__tests__/MapStep.collision.test.ts`

Expected: PASS - all tests green

**Step 5: Commit**

```bash
git add src/components/MapStep.tsx src/components/__tests__/MapStep.collision.test.ts
git commit -m "feat: add radial spread for dense label clusters"
```

---

## Task 6: Update label styling (colored backgrounds, white text)

**Files:**
- Modify: `src/components/MapStep.tsx:40-95` (updateEdgeLabels function)

**Step 1: Update live app label styling**

Modify the label styling in `updateEdgeLabels()` (around line 73):

```typescript
// OLD styling:
el.style.cssText = `
  background: rgba(0, 0, 0, 0.75);
  color: ${color};
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  font-family: 'Plus Jakarta Sans', sans-serif;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
`;

// NEW styling:
const bgColor = type === 'lawn'
  ? 'rgba(34, 197, 94, 0.85)'   // Green for lawn
  : 'rgba(217, 119, 6, 0.85)';  // Orange for garden

el.style.cssText = `
  background: ${bgColor};
  color: #ffffff;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  font-family: 'Plus Jakarta Sans', sans-serif;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
`;
```

**Step 2: Update canvas label styling**

Modify the label drawing in `annotateCanvas()` (around line 273):

```typescript
// OLD:
targetCtx.fillStyle = "rgba(0, 0, 0, 0.65)";
targetCtx.beginPath();
targetCtx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, radius);
targetCtx.fill();

targetCtx.fillStyle = color;
targetCtx.textAlign = "center";
targetCtx.textBaseline = "middle";
targetCtx.fillText(label, midX, midY);

// NEW:
const bgColor = type === 'lawn'
  ? 'rgba(34, 197, 94, 0.85)'   // Green for lawn
  : 'rgba(217, 119, 6, 0.85)';  // Orange for garden

targetCtx.fillStyle = bgColor;
targetCtx.beginPath();
targetCtx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, radius);
targetCtx.fill();

targetCtx.fillStyle = '#ffffff'; // White text
targetCtx.textAlign = "center";
targetCtx.textBaseline = "middle";
targetCtx.fillText(label, midX, midY);
```

**Step 3: Test visually in dev server**

Run: `npm run dev`

Visit: http://localhost:3000

Action: Draw a lawn and garden area, verify labels have colored backgrounds with white text

Expected: Lawn labels green background, garden labels orange background, all text white

**Step 4: Commit**

```bash
git add src/components/MapStep.tsx
git commit -m "feat: update label styling with colored backgrounds and white text"
```

---

## Task 7: Integrate collision detection into live app (Mapbox markers)

**Files:**
- Modify: `src/components/MapStep.tsx:40-95` (updateEdgeLabels function)

**Step 1: Refactor updateEdgeLabels to use collision detection**

Replace the current `updateEdgeLabels` function:

```typescript
const updateEdgeLabels = useCallback(() => {
  const map = mapRef.current;
  const draw = drawRef.current;
  if (!map || !draw) return;

  // Remove all existing markers
  edgeMarkersRef.current.forEach((marker) => marker.remove());
  edgeMarkersRef.current = [];

  // Calculate label boxes
  const dpr = window.devicePixelRatio || 1;
  const boxes = calculateLabelBoxes(map, draw, featureTypes.current, dpr);

  // Position labels with collision detection
  const canvas = map.getCanvas();
  const positioned = positionLabelsWithGrid(boxes, canvas.width, canvas.height);

  // Create markers at final positions
  for (const box of positioned) {
    const [finalX, finalY] = box.finalPosition!;
    const finalLngLat = map.unproject([finalX, finalY]);
    const label = box.distance < 10
      ? `${box.distance.toFixed(1)}m`
      : `${Math.round(box.distance)}m`;

    const bgColor = box.type === 'lawn'
      ? 'rgba(34, 197, 94, 0.85)'
      : 'rgba(217, 119, 6, 0.85)';

    // Create label element
    const labelEl = document.createElement('div');
    labelEl.className = 'edge-label';
    labelEl.style.cssText = `
      background: ${bgColor};
      color: #ffffff;
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      font-family: 'Plus Jakarta Sans', sans-serif;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    labelEl.textContent = label;

    const marker = new mapboxgl.Marker({ element: labelEl, anchor: 'center' })
      .setLngLat(finalLngLat)
      .addTo(map);

    edgeMarkersRef.current.push(marker);

    // Add leader line if needed
    if (box.needsLeader) {
      const lineColor = box.type === 'lawn' ? '#22c55e' : '#d97706';
      const [midLng, midLat] = box.edgeMidpoint;

      // Create SVG line element
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: visible;
      `;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

      // Convert coordinates to pixel positions for SVG
      const startPx = map.project([midLng, midLat]);
      const endPx = map.project(finalLngLat);

      line.setAttribute('x1', startPx.x.toString());
      line.setAttribute('y1', startPx.y.toString());
      line.setAttribute('x2', endPx.x.toString());
      line.setAttribute('y2', endPx.y.toString());
      line.setAttribute('stroke', lineColor);
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('opacity', '0.7');

      svg.appendChild(line);

      // Create a marker for the SVG (hackish but works with Mapbox)
      const svgContainer = document.createElement('div');
      svgContainer.appendChild(svg);

      const lineMarker = new mapboxgl.Marker({
        element: svgContainer,
        anchor: 'center'
      })
        .setLngLat([midLng, midLat])
        .addTo(map);

      edgeMarkersRef.current.push(lineMarker);

      // Create endpoint dot
      const dotEl = document.createElement('div');
      dotEl.style.cssText = `
        width: 6px;
        height: 6px;
        background: ${lineColor};
        border: 1px solid white;
        border-radius: 50%;
        pointer-events: none;
      `;

      const dotMarker = new mapboxgl.Marker({ element: dotEl, anchor: 'center' })
        .setLngLat([midLng, midLat])
        .addTo(map);

      edgeMarkersRef.current.push(dotMarker);
    }
  }
}, []);
```

**Step 2: Test in dev server**

Run: `npm run dev`

Action:
1. Draw two overlapping lawn areas
2. Verify labels reposition to avoid overlap
3. Verify leader lines appear for repositioned labels

Expected: No overlapping labels, leader lines connect labels to edges

**Step 3: Commit**

```bash
git add src/components/MapStep.tsx
git commit -m "feat: integrate collision detection into live app markers with leader lines"
```

---

## Task 8: Integrate collision detection into email snapshot (canvas)

**Files:**
- Modify: `src/components/MapStep.tsx:235-284` (annotateCanvas function)

**Step 1: Refactor annotateCanvas to use collision detection**

Replace the current `annotateCanvas` function:

```typescript
function annotateCanvas(targetCanvas: HTMLCanvasElement, targetCtx: CanvasRenderingContext2D) {
  const map = mapRef.current;
  const draw = drawRef.current;
  if (!map || !draw) return;

  const dpr = window.devicePixelRatio || 1;

  // Calculate label boxes in canvas coordinates
  const boxes = calculateLabelBoxes(map, draw, featureTypes.current, dpr);

  // Position labels with collision detection
  const positioned = positionLabelsWithGrid(boxes, targetCanvas.width, targetCanvas.height);

  // Draw leader lines first (behind labels)
  for (const box of positioned) {
    if (!box.needsLeader) continue;

    const lineColor = box.type === 'lawn' ? '#22c55e' : '#d97706';
    const [startX, startY] = box.edgeMidpointPx!;
    const [endX, endY] = box.finalPosition!;

    // Draw line
    targetCtx.strokeStyle = lineColor;
    targetCtx.lineWidth = 1.5 * dpr;
    targetCtx.globalAlpha = 0.7;
    targetCtx.beginPath();
    targetCtx.moveTo(startX * dpr, startY * dpr);
    targetCtx.lineTo(endX * dpr, endY * dpr);
    targetCtx.stroke();
    targetCtx.globalAlpha = 1.0;

    // Draw endpoint dot
    targetCtx.fillStyle = lineColor;
    targetCtx.strokeStyle = '#ffffff';
    targetCtx.lineWidth = 1 * dpr;
    targetCtx.beginPath();
    targetCtx.arc(startX * dpr, startY * dpr, 3 * dpr, 0, 2 * Math.PI);
    targetCtx.fill();
    targetCtx.stroke();
  }

  // Draw labels on top
  for (const box of positioned) {
    const [x, y] = box.finalPosition!;
    const label = box.distance < 10
      ? `${box.distance.toFixed(1)}m`
      : `${Math.round(box.distance)}m`;

    const bgColor = box.type === 'lawn'
      ? 'rgba(34, 197, 94, 0.85)'
      : 'rgba(217, 119, 6, 0.85)';

    const fontSize = 11 * dpr;
    targetCtx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
    const textWidth = targetCtx.measureText(label).width;
    const padX = 4 * dpr;
    const padY = 3 * dpr;
    const pillW = textWidth + padX * 2;
    const pillH = fontSize + padY * 2;
    const radius = 4 * dpr;

    // Draw pill background
    targetCtx.fillStyle = bgColor;
    targetCtx.beginPath();
    targetCtx.roundRect(
      x * dpr - pillW / 2,
      y * dpr - pillH / 2,
      pillW,
      pillH,
      radius
    );
    targetCtx.fill();

    // Draw text
    targetCtx.fillStyle = '#ffffff';
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
    targetCtx.fillText(label, x * dpr, y * dpr);
  }
}
```

**Step 2: Test email snapshot**

Run: `npm run dev`

Action:
1. Complete full wizard flow
2. Draw overlapping areas
3. Submit lead
4. Check email received

Expected: Email image shows same layout as live app, with leader lines and no overlaps

**Step 3: Commit**

```bash
git add src/components/MapStep.tsx
git commit -m "feat: integrate collision detection into canvas email snapshots"
```

---

## Task 9: Manual testing and refinement

**Files:**
- None (testing phase)

**Step 1: Test single polygon, no overlap**

Actions:
1. Run `npm run dev`
2. Navigate to map step
3. Draw one lawn area with 4-5 edges
4. Observe labels

Expected:
- All labels at edge midpoints
- No leader lines
- Green styling (colored background, white text)

**Step 2: Test two adjacent polygons with overlap**

Actions:
1. Draw a lawn area
2. Draw a garden area very close to the lawn
3. Observe labels

Expected:
- Some labels repositioned
- Leader lines visible for repositioned labels
- Green (lawn) vs orange (garden) clearly distinct
- No overlapping labels

**Step 3: Test dense cluster (4+ labels)**

Actions:
1. Draw a complex lawn shape with many short edges in small space
2. Zoom in to create dense label cluster
3. Observe labels

Expected:
- Radial spread activated for cluster
- All labels visible and readable
- Leader lines connect correctly
- No overlaps

**Step 4: Test canvas bounds**

Actions:
1. Draw polygon at top edge of map
2. Draw polygon at bottom edge
3. Draw polygon at left edge
4. Draw polygon at right edge

Expected:
- Labels stay within canvas bounds
- No labels cut off at edges
- Labels shift inward when necessary

**Step 5: Test email snapshot consistency**

Actions:
1. Complete full wizard flow
2. Draw multiple overlapping areas
3. Submit lead
4. Check email received

Expected:
- Email image matches live app appearance
- Leader lines render correctly
- Colors preserved (green lawn, orange garden)
- White text readable on colored backgrounds

**Step 6: Document any issues**

Create a file `docs/testing-notes.md` with any issues found during manual testing.

**Step 7: Run full test suite**

Run: `npm test`

Expected: All tests pass (including new collision detection tests)

**Step 8: Final commit**

```bash
git add .
git commit -m "chore: complete manual testing of collision detection feature"
```

---

## Task 10: Update existing tests (if any fail)

**Files:**
- Modify: `src/components/__tests__/MapStep.test.tsx` (if exists)

**Step 1: Check if existing MapStep tests need updates**

Run: `npm test src/components/__tests__/MapStep.test.tsx`

**Step 2: Update any failing tests**

If tests fail due to changed label styling or behavior, update them to reflect new collision detection logic.

**Step 3: Ensure all tests pass**

Run: `npm test`

Expected: All tests green

**Step 4: Commit**

```bash
git add src/components/__tests__/
git commit -m "test: update MapStep tests for collision detection"
```

---

## Success Criteria Checklist

Before marking complete, verify:

- [ ] No overlapping labels in any tested scenario
- [ ] Clear visual distinction between lawn (green) and garden (orange) labels
- [ ] Leader lines appear for repositioned labels
- [ ] Leader lines correctly connect labels to edge midpoints
- [ ] Endpoint dots visible at edge midpoints
- [ ] White text readable on colored backgrounds
- [ ] Live app and email snapshots render identically
- [ ] Labels stay within canvas bounds
- [ ] All automated tests pass
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Performance: no noticeable lag when drawing polygons

---

## Future Enhancements (Not in Scope)

- Interactive label repositioning (drag to custom positions)
- Measurement tooltips on hover
- Polygon styling with lawn/garden colors during drawing
- Visual regression tests with Playwright
- Zoom-aware label sizing

---

## Rollback Plan

If issues arise in production:

```bash
git revert HEAD~10..HEAD  # Revert all tasks
npm test                  # Verify tests still pass
npm run build             # Rebuild
```

This will restore the previous simple midpoint labeling without collision detection.
