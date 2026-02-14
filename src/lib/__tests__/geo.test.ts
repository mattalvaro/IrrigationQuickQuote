import { describe, it, expect } from "vitest";
import { calcDistance } from "@/lib/geo";

describe("calcDistance", () => {
  it("returns 0 for identical points", () => {
    expect(calcDistance([0, 0], [0, 0])).toBe(0);
  });

  it("calculates a known distance (Sydney to Melbourne ~714km)", () => {
    const sydney: [number, number] = [151.2093, -33.8688];
    const melbourne: [number, number] = [144.9631, -37.8136];
    const dist = calcDistance(sydney, melbourne);
    expect(dist).toBeGreaterThan(710_000);
    expect(dist).toBeLessThan(720_000);
  });

  it("calculates a short residential edge (~10m)", () => {
    const p1: [number, number] = [115.8600, -31.9500];
    const p2: [number, number] = [115.86012, -31.9500];
    const dist = calcDistance(p1, p2);
    expect(dist).toBeGreaterThan(8);
    expect(dist).toBeLessThan(14);
  });
});
