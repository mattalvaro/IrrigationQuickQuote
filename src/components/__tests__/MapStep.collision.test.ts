// src/components/__tests__/MapStep.collision.test.ts
import { describe, test, expect } from 'vitest';
import { boxesOverlap } from '../MapStep';

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
