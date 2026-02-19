// src/components/__tests__/MapStep.collision.test.ts
import { describe, test, expect } from 'vitest';
import { boxesOverlap, positionLabelsWithGrid, radialSpreadCluster, type LabelBox } from '../MapStep';

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

  test('radialSpreadCluster distributes labels evenly', () => {
    const cluster: LabelBox[] = [
      { id: 'a', x: 500, y: 500, width: 50, height: 20, edgeMidpoint: [0, 0], edgeMidpointPx: [500, 500], distance: 5, type: 'lawn', finalPosition: [500, 500], needsLeader: false },
      { id: 'b', x: 502, y: 501, width: 50, height: 20, edgeMidpoint: [0, 0], edgeMidpointPx: [502, 501], distance: 6, type: 'lawn', finalPosition: [502, 501], needsLeader: false },
      { id: 'c', x: 501, y: 502, width: 50, height: 20, edgeMidpoint: [0, 0], edgeMidpointPx: [501, 502], distance: 7, type: 'lawn', finalPosition: [501, 502], needsLeader: false },
      { id: 'd', x: 503, y: 503, width: 50, height: 20, edgeMidpoint: [0, 0], edgeMidpointPx: [503, 503], distance: 8, type: 'lawn', finalPosition: [503, 503], needsLeader: false },
    ];

    const centroid: [number, number] = [501.5, 501.5];
    radialSpreadCluster(cluster, centroid, 1000, 1000);

    cluster.forEach(box => expect(box.needsLeader).toBe(true));

    const positions = cluster.map(b => `${b.x},${b.y}`);
    expect(new Set(positions).size).toBe(4);

    const distances = cluster.map(box => {
      const dx = box.x - centroid[0];
      const dy = box.y - centroid[1];
      return Math.sqrt(dx * dx + dy * dy);
    });
    const expectedRadius = 60 + 4 * 10;
    distances.forEach(d => expect(d).toBeCloseTo(expectedRadius, 1));
  });

  test('positionLabelsWithGrid biases collision resolution toward outward direction', () => {
    // Two overlapping boxes, second has outwardDirection pointing right (+x)
    const boxes: LabelBox[] = [
      {
        id: 'a',
        x: 300,
        y: 300,
        width: 50,
        height: 20,
        edgeMidpoint: [0, 0],
        edgeMidpointPx: [290, 300],
        distance: 10,
        type: 'lawn',
        needsLeader: true,
        outwardDirection: [1, 0],
      },
      {
        id: 'b',
        x: 305,
        y: 302,
        width: 50,
        height: 20,
        edgeMidpoint: [0, 0],
        edgeMidpointPx: [295, 302],
        distance: 8,
        type: 'lawn',
        needsLeader: true,
        outwardDirection: [1, 0], // outward = right
      },
    ];

    const positioned = positionLabelsWithGrid(boxes, 1000, 1000);
    const movedBox = positioned.find(b => b.id === 'b')!;

    // The moved box should have been displaced to the right (positive x direction)
    // since the outward direction is [1, 0] and that direction is tried first
    expect(movedBox.x).toBeGreaterThan(305);
    expect(movedBox.needsLeader).toBe(true);
  });
});
