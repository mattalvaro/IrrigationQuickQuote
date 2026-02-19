"use client";

import { useEffect, useRef, useState, useCallback, type RefObject } from "react";
import type { Map as MapboxMap, NavigationControl, IControl } from "mapbox-gl";
import { WizardData } from "@/lib/types";
import { calcDistance, calcArea } from "@/lib/geo";
import {
  type LabelBox,
  boxesOverlap,
  positionLabelsWithGrid,
  radialSpreadCluster,
  formatDistanceLabel,
  LABEL_FONT_SIZE,
  LABEL_PADDING_X,
  LABEL_PADDING_Y,
  LABEL_CHAR_WIDTH_RATIO,
} from "@/lib/labelCollision";

// Re-export for backward compatibility (tests import from MapStep)
export { type LabelBox, boxesOverlap, positionLabelsWithGrid, radialSpreadCluster } from "@/lib/labelCollision";

/* global mapboxgl, MapboxDraw */
declare const mapboxgl: typeof import("mapbox-gl").default;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const MapboxDraw: any;

type DrawingMode = "lawn" | "garden" | null;

interface MapStepProps {
  data: WizardData;
  onUpdate: (partial: Partial<WizardData>) => void;
  snapshotRef?: RefObject<(() => string | null) | null>;
}

export function MapStep({ data, onUpdate, snapshotRef }: MapStepProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const drawRef = useRef<InstanceType<typeof MapboxDraw> | null>(null);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);
  const [address, setAddress] = useState(data.address || "");
  const [suggestions, setSuggestions] = useState<
    Array<{ place_name: string; center: [number, number] }>
  >([]);

  const featureTypes = useRef<Map<string, "lawn" | "garden">>(new Map());
  const drawingModeRef = useRef<DrawingMode>(null);
  const edgeMarkersRef = useRef<Array<any>>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    drawingModeRef.current = drawingMode;
  }, [drawingMode]);

  const totalLawn = data.lawnAreas.reduce((sum, a) => sum + a.sqm, 0);
  const totalGarden = data.gardenAreas.reduce((sum, a) => sum + a.sqm, 0);

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

    // Position labels with collision detection (use CSS pixels, not device pixels)
    const canvas = map.getCanvas();
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;
    const positioned = positionLabelsWithGrid(boxes, cssWidth, cssHeight);

    // Create markers at final positions
    for (const box of positioned) {
      const [finalX, finalY] = box.finalPosition!;
      const finalLngLat = map.unproject([finalX, finalY]);
      const label = formatDistanceLabel(box.distance);

      const bgColor = box.type === 'lawn'
        ? 'rgba(34, 197, 94, 0.85)'
        : 'rgba(217, 119, 6, 0.85)';

      // Create label element
      const labelEl = document.createElement('div');
      labelEl.className = 'edge-label';
      labelEl.style.cssText = `
        background: ${bgColor};
        color: #ffffff;
        padding: ${LABEL_PADDING_Y}px ${LABEL_PADDING_X}px;
        border-radius: 4px;
        font-size: ${LABEL_FONT_SIZE}px;
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

        // Create a marker for the SVG
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

  const updateAreas = useCallback(() => {
    if (!drawRef.current) return;
    const allFeatures = drawRef.current.getAll();
    const lawnAreas: { id: string; sqm: number }[] = [];
    const gardenAreas: { id: string; sqm: number }[] = [];

    for (const feature of allFeatures.features) {
      const id = feature.id as string;
      const sqm = Math.round(calcArea(feature));
      const type = featureTypes.current.get(id);

      if (type === "lawn") lawnAreas.push({ id, sqm });
      else if (type === "garden") gardenAreas.push({ id, sqm });
    }

    onUpdate({ lawnAreas, gardenAreas });
    updateEdgeLabels();
  }, [onUpdate, updateEdgeLabels]);

  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof (window as any).mapboxgl !== "undefined") {
      setScriptReady(true);
      return;
    }
    const interval = setInterval(() => {
      if (typeof (window as any).mapboxgl !== "undefined") {
        setScriptReady(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !scriptReady) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-v9",
      center: [133.7751, -25.2744],
      zoom: 4,
      preserveDrawingBuffer: true,
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: false, trash: true },
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(draw as unknown as IControl, "top-left");

    // Re-render edge labels after pan/zoom so leader lines stay correct
    map.on("moveend", () => updateEdgeLabels());

    map.on("draw.create", (e: { features: Array<{ id: string }> }) => {
      const currentMode = drawingModeRef.current;
      if (currentMode) {
        for (const feature of e.features) {
          featureTypes.current.set(feature.id, currentMode);
        }
      }
      updateAreas();
      setDrawingMode(null);
    });
    map.on("draw.update", () => updateAreas());
    map.on("draw.delete", (e: { features: Array<{ id: string }> }) => {
      for (const feature of e.features) {
        featureTypes.current.delete(feature.id);
      }
      updateAreas();
    });

    mapRef.current = map;
    drawRef.current = draw;

    return () => map.remove();
  }, [updateAreas, scriptReady]);

  function searchAddress(query: string) {
    setAddress(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=au&limit=5&types=address,place`
        );
        if (!res.ok) {
          console.error("Mapbox geocoding failed:", res.status, await res.text());
          return;
        }
        const json = await res.json();
        setSuggestions(
          (json.features || []).map((f: { place_name: string; center: [number, number] }) => ({
            place_name: f.place_name,
            center: f.center,
          }))
        );
      } catch (err) {
        console.error("Mapbox geocoding error:", err);
      }
    }, 350);
  }

  function selectAddress(center: [number, number], placeName: string) {
    setSuggestions([]);
    setAddress(placeName);
    onUpdate({ address: placeName });
    mapRef.current?.flyTo({ center, zoom: 19 });
  }

  function startDrawing(mode: DrawingMode) {
    setDrawingMode(mode);
    if (drawRef.current) {
      drawRef.current.changeMode("draw_polygon");
    }
  }

  function deleteArea(id: string) {
    if (drawRef.current) {
      drawRef.current.delete([id]);
      featureTypes.current.delete(id);
      updateAreas();
    }
  }

  const hasAreas = data.lawnAreas.length > 0 || data.gardenAreas.length > 0;

  const instructionText =
    drawingMode !== null
      ? "Click on the map to place points. Double-click to finish the shape."
      : hasAreas
        ? "Click a button below to add another area, or continue to the next step."
        : "Search for your address, then draw your lawn and garden areas.";

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
      const label = formatDistanceLabel(box.distance);

      const bgColor = box.type === 'lawn'
        ? 'rgba(34, 197, 94, 0.85)'
        : 'rgba(217, 119, 6, 0.85)';

      const fontSize = LABEL_FONT_SIZE * dpr;
      targetCtx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
      const textWidth = targetCtx.measureText(label).width;
      const padX = LABEL_PADDING_X * dpr;
      const padY = LABEL_PADDING_Y * dpr;
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

  function captureSnapshot(): string | null {
    if (!mapRef.current) return null;

    const map = mapRef.current;
    const mapCanvas = map.getCanvas();

    // Create a temporary 2D canvas
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = mapCanvas.width;
    tempCanvas.height = mapCanvas.height;

    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return null;

    // Copy the WebGL canvas to the 2D canvas
    ctx.drawImage(mapCanvas, 0, 0);

    // Annotate the 2D canvas
    annotateCanvas(tempCanvas, ctx);

    // Capture the annotated canvas
    return tempCanvas.toDataURL("image/png");
  }

  // Expose captureSnapshot to parent via ref
  useEffect(() => {
    if (snapshotRef) {
      snapshotRef.current = captureSnapshot;
      return () => { snapshotRef.current = null; };
    }
  }, [snapshotRef]);

  // Cleanup edge markers on unmount
  useEffect(() => {
    return () => {
      edgeMarkersRef.current.forEach((marker) => marker.remove());
      edgeMarkersRef.current = [];
    };
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-forest-deep mb-1">Measure Your Property</h2>
        <p className="text-sm text-txt-muted" data-testid="map-instructions">{instructionText}</p>
      </div>

      {/* Address Search */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-txt-muted pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search your address..."
          value={address}
          onChange={(e) => searchAddress(e.target.value)}
          className="form-input !pl-12"
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border border-border rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="px-4 py-3 hover:bg-lawn-pale/50 cursor-pointer text-sm text-txt-primary transition-colors first:rounded-t-xl last:rounded-b-xl"
                onClick={() => selectAddress(s.center, s.place_name)}
              >
                {s.place_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Drawing Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => startDrawing("lawn")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
            drawingMode === "lawn"
              ? "bg-forest-mid text-white shadow-md"
              : "bg-lawn-pale text-forest-mid hover:bg-lawn-pale/80 hover:shadow-sm"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          Draw Lawn
        </button>
        <button
          type="button"
          onClick={() => startDrawing("garden")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
            drawingMode === "garden"
              ? "bg-garden-warm text-white shadow-md"
              : "bg-garden-pale text-earth-light hover:bg-garden-pale/80 hover:shadow-sm"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22c4.97 0 9-4.03 9-9-4.97 0-9 4.03-9 9zM5.6 10.25c0 1.38 1.12 2.5 2.5 2.5.53 0 1.01-.16 1.42-.44l-.02.19c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5l-.02-.19c.4.28.89.44 1.42.44 1.38 0 2.5-1.12 2.5-2.5 0-1-.59-1.85-1.43-2.25.84-.4 1.43-1.25 1.43-2.25 0-1.38-1.12-2.5-2.5-2.5-.53 0-1.01.16-1.42.44l.02-.19C14.5 2.12 13.38 1 12 1S9.5 2.12 9.5 3.5l.02.19c-.4-.28-.89-.44-1.42-.44-1.38 0-2.5 1.12-2.5 2.5 0 1 .59 1.85 1.43 2.25-.84.4-1.43 1.25-1.43 2.25zM12 5.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5S9.5 9.38 9.5 8s1.12-2.5 2.5-2.5zM3 13c0 4.97 4.03 9 9 9 0-4.97-4.03-9-9-9z"/>
          </svg>
          Draw Garden
        </button>
      </div>

      {/* Map */}
      <div
        data-testid="map-container"
        ref={mapContainer}
        className="w-full h-96 rounded-2xl border border-border shadow-sm overflow-hidden"
      />

      {/* Area Totals */}
      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-lawn" />
          <span className="text-sm font-medium text-txt-secondary">
            Lawn: <span className="text-forest-mid font-semibold">{totalLawn} m²</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-garden-warm" />
          <span className="text-sm font-medium text-txt-secondary">
            Garden: <span className="text-earth font-semibold">{totalGarden} m²</span>
          </span>
        </div>
      </div>

      {/* Area List */}
      {hasAreas && (
        <ul className="space-y-2" data-testid="area-list">
          {data.lawnAreas.map((area, i) => (
            <li key={area.id} className="flex items-center gap-3 bg-lawn-pale/40 rounded-xl px-4 py-2.5 transition-colors hover:bg-lawn-pale/60">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest-mid bg-lawn-pale px-2.5 py-1 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-lawn" />
                Lawn {i + 1}
              </span>
              <span className="text-sm font-medium text-txt-primary">{area.sqm} m²</span>
              <button
                type="button"
                onClick={() => deleteArea(area.id)}
                className="ml-auto text-txt-muted hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                aria-label={`Delete Lawn ${i + 1}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </li>
          ))}
          {data.gardenAreas.map((area, i) => (
            <li key={area.id} className="flex items-center gap-3 bg-garden-pale/40 rounded-xl px-4 py-2.5 transition-colors hover:bg-garden-pale/60">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-earth bg-garden-pale px-2.5 py-1 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-garden-warm" />
                Garden {i + 1}
              </span>
              <span className="text-sm font-medium text-txt-primary">{area.sqm} m²</span>
              <button
                type="button"
                onClick={() => deleteArea(area.id)}
                className="ml-auto text-txt-muted hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                aria-label={`Delete Garden ${i + 1}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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

    // Compute polygon centroid in pixel coords for outward direction
    const verticesPx = coords.slice(0, -1).map(c => map.project(c as [number, number]));
    const centroidPx = {
      x: verticesPx.reduce((sum, p) => sum + p.x, 0) / verticesPx.length,
      y: verticesPx.reduce((sum, p) => sum + p.y, 0) / verticesPx.length,
    };

    const OUTWARD_OFFSET = 20;

    for (let i = 0; i < coords.length - 1; i++) {
      const dist = calcDistance(coords[i], coords[i + 1]);
      if (dist < 0.5) continue; // Skip tiny edges

      const midLng = (coords[i][0] + coords[i + 1][0]) / 2;
      const midLat = (coords[i][1] + coords[i + 1][1]) / 2;
      const label = formatDistanceLabel(dist);

      // Calculate pixel position
      const midPx = map.project([midLng, midLat] as [number, number]);

      // Compute outward perpendicular normal for this edge
      const aPx = verticesPx[i];
      const bPx = verticesPx[(i + 1) % verticesPx.length];
      let nx = -(bPx.y - aPx.y);
      let ny = bPx.x - aPx.x;
      const nLen = Math.sqrt(nx * nx + ny * ny);
      if (nLen > 0) {
        nx /= nLen;
        ny /= nLen;
      }

      // Flip normal to point away from centroid (outward)
      const toCentroidX = centroidPx.x - midPx.x;
      const toCentroidY = centroidPx.y - midPx.y;
      if (nx * toCentroidX + ny * toCentroidY > 0) {
        nx = -nx;
        ny = -ny;
      }

      // Offset label position outward from the edge midpoint
      const offsetX = midPx.x + nx * OUTWARD_OFFSET;
      const offsetY = midPx.y + ny * OUTWARD_OFFSET;

      // Estimate label dimensions (rough approximation; actual width from measureText may differ)
      const fontSize = LABEL_FONT_SIZE * dpr;
      const estimatedWidth = (label.length * fontSize * LABEL_CHAR_WIDTH_RATIO + LABEL_PADDING_X * 2 * dpr) / dpr;
      const estimatedHeight = (fontSize + LABEL_PADDING_Y * 2 * dpr) / dpr;

      boxes.push({
        id: `${id}-edge-${i}`,
        x: offsetX,
        y: offsetY,
        width: estimatedWidth,
        height: estimatedHeight,
        edgeMidpoint: [midLng, midLat],
        edgeMidpointPx: [midPx.x, midPx.y],
        distance: dist,
        type,
        finalPosition: [offsetX, offsetY],
        needsLeader: true,
        outwardDirection: [nx, ny],
      });
    }
  }

  return boxes;
}

