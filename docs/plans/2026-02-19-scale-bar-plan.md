# Scale Bar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace per-edge measurement labels on the email snapshot with a single 10m scale bar for CAD import calibration.

**Architecture:** Modify only `annotateCanvas()` in MapStep.tsx. Remove the label/leader-line/dot rendering loop and replace it with a scale bar drawn using `map.project()` to convert 10 real-world metres into canvas pixels.

**Tech Stack:** Mapbox GL JS (CDN globals), HTML Canvas 2D API, TypeScript

---

### Task 1: Remove measurement labels from canvas snapshot

**Files:**
- Modify: `src/components/MapStep.tsx:419-483`

**Step 1: Remove label and leader-line rendering from `annotateCanvas()`**

Replace the entire body of `annotateCanvas()` (lines 419-483) with a version that only draws the scale bar. The new function:

```typescript
function annotateCanvas(targetCanvas: HTMLCanvasElement, targetCtx: CanvasRenderingContext2D) {
  const map = mapRef.current;
  if (!map) return;

  const dpr = window.devicePixelRatio || 1;

  // --- Scale bar: calculate 10m in pixels ---
  const center = map.getCenter();
  // Project center and a point 10m east of center
  const centerPx = map.project(center);
  // 10m in degrees longitude at this latitude
  const metersPerDegreeLng = 111320 * Math.cos((center.lat * Math.PI) / 180);
  const deltaLng = 10 / metersPerDegreeLng;
  const offsetPx = map.project([center.lng + deltaLng, center.lat]);
  const barLengthPx = Math.abs(offsetPx.x - centerPx.x) * dpr;

  // --- Scale bar: draw in bottom-right corner ---
  const margin = 20 * dpr;
  const endCapHeight = 8 * dpr;
  const lineWidth = 2 * dpr;
  const fontSize = 11 * dpr;

  const barRight = targetCanvas.width - margin;
  const barLeft = barRight - barLengthPx;
  const barY = targetCanvas.height - margin;

  // Shadow for contrast on satellite imagery
  targetCtx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  targetCtx.shadowBlur = 4 * dpr;
  targetCtx.shadowOffsetX = 0;
  targetCtx.shadowOffsetY = 0;

  // Draw horizontal bar
  targetCtx.strokeStyle = '#ffffff';
  targetCtx.lineWidth = lineWidth;
  targetCtx.lineCap = 'butt';
  targetCtx.beginPath();
  targetCtx.moveTo(barLeft, barY);
  targetCtx.lineTo(barRight, barY);
  targetCtx.stroke();

  // Draw left end cap
  targetCtx.beginPath();
  targetCtx.moveTo(barLeft, barY - endCapHeight / 2);
  targetCtx.lineTo(barLeft, barY + endCapHeight / 2);
  targetCtx.stroke();

  // Draw right end cap
  targetCtx.beginPath();
  targetCtx.moveTo(barRight, barY - endCapHeight / 2);
  targetCtx.lineTo(barRight, barY + endCapHeight / 2);
  targetCtx.stroke();

  // Draw "10m" label centered above bar
  targetCtx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
  targetCtx.textAlign = 'center';
  targetCtx.textBaseline = 'bottom';
  targetCtx.fillStyle = '#ffffff';
  targetCtx.fillText('10m', (barLeft + barRight) / 2, barY - endCapHeight / 2 - 2 * dpr);

  // Reset shadow
  targetCtx.shadowColor = 'transparent';
  targetCtx.shadowBlur = 0;
}
```

**Step 2: Run dev server and visually verify**

Run: `npm run dev`
- Navigate to map step, draw a polygon
- Click Next to trigger snapshot capture
- Check the estimate/lead step — the snapshot should show polygons with a scale bar but NO edge measurements

**Step 3: Run existing tests**

Run: `npm run test:run`
Expected: All existing tests pass (label collision tests still pass since live map is unchanged)

**Step 4: Commit**

```bash
git add src/components/MapStep.tsx
git commit -m "feat: replace snapshot measurements with 10m scale bar for CAD import"
```

---

### Task 2: Clean up unused imports (if any)

**Files:**
- Modify: `src/components/MapStep.tsx`

**Step 1: Check if `calculateLabelBoxes`, `positionLabelsWithGrid`, `formatDistanceLabel` are still used**

These are used by `updateEdgeLabels()` for the live map — they should still be imported. Verify no unused imports remain after Task 1.

**Step 2: Run lint**

Run: `npm run lint`
Expected: No lint errors

**Step 3: Run build**

Run: `npm run build`
Expected: Clean build, no TypeScript errors

**Step 4: Commit (only if changes were needed)**

```bash
git add src/components/MapStep.tsx
git commit -m "chore: remove unused imports from MapStep"
```
