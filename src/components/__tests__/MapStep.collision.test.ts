// src/components/__tests__/MapStep.collision.test.ts
import { describe, test, expect } from 'vitest';
import { boxesOverlap, positionLabelsWithGrid } from '../MapStep';
import type { LabelBox } from '../MapStep';

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

  test('positionLabelsWithGrid finds valid position in 8-grid', () => {
    const boxes: LabelBox[] = [
      {
        id: 'a',
        x: 100,
        y: 100,
        width: 50,
        height: 20,
        edgeMidpoint: [0, 0],
        edgeMidpointPx: [100, 100],
        distance: 10,
        type: 'lawn',
        finalPosition: [100, 100],
        needsLeader: false,
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
        type: 'lawn',
        finalPosition: [105, 102],
        needsLeader: false,
      },
    ];

    // Verify they overlap before positioning
    expect(boxesOverlap(boxes[0], boxes[1])).toBe(true);

    const positioned = positionLabelsWithGrid(boxes, 1000, 1000);

    // After sorting, box 'a' (distance 10) comes first, box 'b' (distance 8) second
    // First positioned box (from 'a') should stay at original position
    const firstBox = positioned.find(b => b.id === 'a');
    expect(firstBox!.x).toBe(100);
    expect(firstBox!.y).toBe(100);
    expect(firstBox!.needsLeader).toBe(false);

    // Second positioned box (from 'b') should be repositioned due to collision
    const secondBox = positioned.find(b => b.id === 'b');
    // Should be moved in at least one direction (x or y)
    expect(secondBox!.x !== 105 || secondBox!.y !== 102).toBe(true);
    expect(secondBox!.needsLeader).toBe(true);
  });
});
