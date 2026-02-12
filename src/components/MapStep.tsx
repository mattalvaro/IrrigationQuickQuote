"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Map as MapboxMap, NavigationControl, IControl } from "mapbox-gl";
import { WizardData } from "@/lib/types";

/* global mapboxgl, MapboxDraw */
declare const mapboxgl: typeof import("mapbox-gl").default;
declare const MapboxDraw: typeof import("@mapbox/mapbox-gl-draw").default;

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
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<
    Array<{ place_name: string; center: [number, number] }>
  >([]);

  const featureTypes = useRef<Map<string, "lawn" | "garden">>(new Map());
  const drawingModeRef = useRef<DrawingMode>(null);

  // Keep the ref in sync with state so event handlers see the latest value
  useEffect(() => {
    drawingModeRef.current = drawingMode;
  }, [drawingMode]);

  const totalLawn = data.lawnAreas.reduce((sum, a) => sum + a.sqm, 0);
  const totalGarden = data.gardenAreas.reduce((sum, a) => sum + a.sqm, 0);

  const updateAreas = useCallback(() => {
    if (!drawRef.current) return;
    const allFeatures = drawRef.current.getAll();
    const lawnAreas: { id: string; sqm: number }[] = [];
    const gardenAreas: { id: string; sqm: number }[] = [];

    for (const feature of allFeatures.features) {
      const id = feature.id as string;
      // Calculate area using turf formula inline (avoid npm import issues)
      const sqm = Math.round(calcArea(feature));
      const type = featureTypes.current.get(id);

      if (type === "lawn") lawnAreas.push({ id, sqm });
      else if (type === "garden") gardenAreas.push({ id, sqm });
    }

    onUpdate({ lawnAreas, gardenAreas });
  }, [onUpdate]);

  const [scriptReady, setScriptReady] = useState(false);

  // Poll for CDN scripts to be available
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
      center: [133.7751, -25.2744], // Australia center
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
    mapRef.current?.flyTo({ center, zoom: 19 });
  }

  function startDrawing(mode: DrawingMode) {
    setDrawingMode(mode);
    if (drawRef.current) {
      drawRef.current.changeMode("draw_polygon");
    }
  }

  function captureSnapshot(): string | null {
    if (!mapRef.current) return null;
    return mapRef.current.getCanvas().toDataURL("image/png");
  }

  // Expose snapshot capture for parent to call before navigating
  useEffect(() => {
    const handleBeforeNext = () => {
      const snapshot = captureSnapshot();
      if (snapshot) onUpdate({ mapSnapshot: snapshot });
    };
    window.addEventListener("wizard:beforeNext", handleBeforeNext);
    return () => window.removeEventListener("wizard:beforeNext", handleBeforeNext);
  }, [onUpdate]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Measure Your Property</h2>

      <div className="relative">
        <input
          type="text"
          placeholder="Enter your address..."
          value={address}
          onChange={(e) => searchAddress(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={() => {
                  selectAddress(s.center, s.place_name);
                }}
              >
                {s.place_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => startDrawing("lawn")}
          className={`px-3 py-2 rounded text-sm font-medium ${
            drawingMode === "lawn"
              ? "bg-green-600 text-white"
              : "bg-green-100 text-green-800 hover:bg-green-200"
          }`}
        >
          Draw Lawn
        </button>
        <button
          type="button"
          onClick={() => startDrawing("garden")}
          className={`px-3 py-2 rounded text-sm font-medium ${
            drawingMode === "garden"
              ? "bg-orange-600 text-white"
              : "bg-orange-100 text-orange-800 hover:bg-orange-200"
          }`}
        >
          Draw Garden
        </button>
      </div>

      <div
        data-testid="map-container"
        ref={mapContainer}
        className="w-full h-96 rounded border border-gray-300"
      />

      <div className="flex gap-6 text-sm">
        <p>
          <span className="font-medium">Total Lawn:</span>{" "}
          <span className="text-green-700">{totalLawn} m²</span>
        </p>
        <p>
          <span className="font-medium">Total Garden:</span>{" "}
          <span className="text-orange-700">{totalGarden} m²</span>
        </p>
      </div>
    </div>
  );
}

/**
 * Calculate the area of a GeoJSON polygon in square meters.
 * Simplified spherical excess formula (replaces @turf/area npm dependency).
 */
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
