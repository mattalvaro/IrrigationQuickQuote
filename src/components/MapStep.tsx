"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Map as MapboxMap, NavigationControl, IControl } from "mapbox-gl";
import { WizardData } from "@/lib/types";

/* global mapboxgl, MapboxDraw */
declare const mapboxgl: typeof import("mapbox-gl").default;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const MapboxDraw: any;

type DrawingMode = "lawn" | "garden" | null;

interface MapStepProps {
  data: WizardData;
  onUpdate: (partial: Partial<WizardData>) => void;
}

export function MapStep({ data, onUpdate }: MapStepProps) {
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

    const allFeatures = draw.getAll();

    for (const feature of allFeatures.features) {
      const id = feature.id as string;
      const type = featureTypes.current.get(id);
      if (!type || !feature.geometry || feature.geometry.type !== "Polygon") continue;

      const coords = feature.geometry.coordinates[0] as [number, number][];
      if (!coords || coords.length < 4) continue;

      const color = type === "lawn" ? "#22c55e" : "#d97706";

      for (let i = 0; i < coords.length - 1; i++) {
        const dist = calcDistanceLocal(coords[i], coords[i + 1]);
        if (dist < 0.5) continue; // Skip tiny edges

        const midLng = (coords[i][0] + coords[i + 1][0]) / 2;
        const midLat = (coords[i][1] + coords[i + 1][1]) / 2;

        const label = dist < 10 ? `${dist.toFixed(1)}m` : `${Math.round(dist)}m`;

        // Create HTML element for the marker
        const el = document.createElement("div");
        el.className = "edge-label";
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
        el.textContent = label;

        // Create and add marker
        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([midLng, midLat])
          .addTo(map);

        edgeMarkersRef.current.push(marker);
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

  async function searchAddress(query: string) {
    setAddress(query);
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
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

  function annotateCanvas() {
    const map = mapRef.current;
    const draw = drawRef.current;
    if (!map || !draw) return;

    const canvas = map.getCanvas();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const allFeatures = draw.getAll();
    const dpr = window.devicePixelRatio || 1;

    for (const feature of allFeatures.features) {
      const id = feature.id as string;
      const type = featureTypes.current.get(id);
      if (!type || !feature.geometry || feature.geometry.type !== "Polygon") continue;

      const coords = feature.geometry.coordinates[0] as [number, number][];
      if (!coords || coords.length < 4) continue;

      const color = type === "lawn" ? "#22c55e" : "#d97706";

      for (let i = 0; i < coords.length - 1; i++) {
        const dist = calcDistanceLocal(coords[i], coords[i + 1]);
        if (dist < 0.5) continue;

        const pxA = map.project(coords[i] as [number, number]);
        const pxB = map.project(coords[i + 1] as [number, number]);
        const midX = ((pxA.x + pxB.x) / 2) * dpr;
        const midY = ((pxA.y + pxB.y) / 2) * dpr;

        const label = dist < 10 ? `${dist.toFixed(1)}m` : `${Math.round(dist)}m`;

        const fontSize = 11 * dpr;
        ctx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
        const textWidth = ctx.measureText(label).width;
        const padX = 4 * dpr;
        const padY = 3 * dpr;
        const pillW = textWidth + padX * 2;
        const pillH = fontSize + padY * 2;
        const radius = 4 * dpr;

        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.beginPath();
        ctx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, radius);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, midX, midY);
      }
    }
  }

  function captureSnapshot(): string | null {
    if (!mapRef.current) return null;
    annotateCanvas();
    return mapRef.current.getCanvas().toDataURL("image/png");
  }

  useEffect(() => {
    const handleBeforeNext = () => {
      const snapshot = captureSnapshot();
      if (snapshot) onUpdate({ mapSnapshot: snapshot });
    };
    window.addEventListener("wizard:beforeNext", handleBeforeNext);
    return () => window.removeEventListener("wizard:beforeNext", handleBeforeNext);
  }, [onUpdate]);

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
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted pointer-events-none">
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
          className="form-input pl-10"
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

function calcArea(feature: { geometry?: { type?: string; coordinates?: number[][][] } }): number {
  if (!feature.geometry || feature.geometry.type !== "Polygon" || !feature.geometry.coordinates) {
    return 0;
  }
  const coords = feature.geometry.coordinates[0];
  if (!coords || coords.length < 4) return 0;

  const RAD = Math.PI / 180;
  const EARTH_RADIUS = 6371008.8;

  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];
    total += (lng2 - lng1) * RAD * (2 + Math.sin(lat1 * RAD) + Math.sin(lat2 * RAD));
  }
  total = Math.abs(total * EARTH_RADIUS * EARTH_RADIUS / 2);
  return total;
}

function calcDistanceLocal(a: [number, number], b: [number, number]): number {
  const RAD = Math.PI / 180;
  const EARTH_RADIUS = 6371008.8;
  const dLat = (b[1] - a[1]) * RAD;
  const dLng = (b[0] - a[0]) * RAD;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * sinLng * sinLng;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}
