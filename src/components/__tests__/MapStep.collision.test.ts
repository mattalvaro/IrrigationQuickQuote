// src/components/__tests__/MapStep.collision.test.ts
import { describe, test, expect } from 'vitest';
import { boxesOverlap } from '../MapStep';

describe('Label collision detection', () => {
  test('boxesOverlap detects overlapping labels', () => {
    const a = { x: 100, y: 100, width: 50, height: 20 };
    const b = { x: 110, y: 105, width: 50, height: 20 };

    // These boxes overlap (centers only 10px apart, boxes extend 25px + 8px padding = 33px each)
    expect(boxesOverlap(a, b)).toBe(true);
  });

  test('boxesOverlap allows non-overlapping labels with padding', () => {
    const a = { x: 100, y: 100, width: 50, height: 20 };
    const b = { x: 200, y: 100, width: 50, height: 20 };

    // These boxes don't overlap (100px apart, each extends 25px + 8px padding = 33px)
    expect(boxesOverlap(a, b)).toBe(false);
  });

  test('boxesOverlap detects boxes touching at edges', () => {
    const a = { x: 100, y: 100, width: 50, height: 20 };
    const b = { x: 159, y: 100, width: 50, height: 20 };
    // Boxes are exactly touching with 8px padding gap (100 + 25 + 8 + 8 + 25 = 166)
    // This should NOT overlap
    expect(boxesOverlap(a, b)).toBe(false);
  });

  test('boxesOverlap detects one box inside another', () => {
    const small = { x: 100, y: 100, width: 20, height: 10 };
    const large = { x: 100, y: 100, width: 100, height: 50 };
    expect(boxesOverlap(small, large)).toBe(true);
  });

  test('boxesOverlap handles vertical overlap only', () => {
    const a = { x: 50, y: 100, width: 30, height: 20 };
    const b = { x: 150, y: 100, width: 30, height: 20 };
    // Far apart horizontally, same vertical position
    expect(boxesOverlap(a, b)).toBe(false);
  });
});
