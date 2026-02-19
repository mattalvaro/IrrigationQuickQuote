export interface LabelBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  edgeMidpoint: [number, number];
  edgeMidpointPx: [number, number];
  distance: number;
  type: 'lawn' | 'garden';
  finalPosition?: [number, number];
  needsLeader?: boolean;
  outwardDirection?: [number, number];
}

// Label rendering constants
export const LABEL_FONT_SIZE = 11;
export const LABEL_PADDING_X = 6;
export const LABEL_PADDING_Y = 3;
export const LABEL_CHAR_WIDTH_RATIO = 0.6;

export function formatDistanceLabel(dist: number): string {
  return dist < 10 ? `${dist.toFixed(1)}m` : `${Math.round(dist)}m`;
}

type BoundingBox = Pick<LabelBox, 'x' | 'y' | 'width' | 'height'>;

export function boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  const padding = 8;
  return !(
    a.x + a.width / 2 + padding < b.x - b.width / 2 ||
    a.x - a.width / 2 - padding > b.x + b.width / 2 ||
    a.y + a.height / 2 + padding < b.y - b.height / 2 ||
    a.y - a.height / 2 - padding > b.y + b.height / 2
  );
}

export function positionLabelsWithGrid(
  boxes: LabelBox[],
  canvasWidth: number,
  canvasHeight: number
): LabelBox[] {
  const sortedBoxes = [...boxes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'lawn' ? -1 : 1;
    return b.distance - a.distance;
  });

  const positioned: LabelBox[] = [];
  const offset = 40;

  const directions: Array<[number, number]> = [
    [0, -offset],
    [offset, -offset],
    [offset, 0],
    [offset, offset],
    [0, offset],
    [-offset, offset],
    [-offset, 0],
    [-offset, -offset]
  ];

  for (const box of sortedBoxes) {
    let placed = false;
    // Use the pre-set position (may already be offset outward from midpoint)
    const origX = box.x;
    const origY = box.y;
    box.finalPosition = [origX, origY];

    if (!positioned.some(p => boxesOverlap(box, p))) {
      positioned.push(box);
      continue;
    }

    // Sort directions so outward-facing ones are tried first
    const sortedDirections = box.outwardDirection
      ? [...directions].sort((a, b) => {
          const dotA = a[0] * box.outwardDirection![0] + a[1] * box.outwardDirection![1];
          const dotB = b[0] * box.outwardDirection![0] + b[1] * box.outwardDirection![1];
          return dotB - dotA; // Higher dot product = more aligned with outward
        })
      : directions;

    for (const [dx, dy] of sortedDirections) {
      box.x = origX + dx;
      box.y = origY + dy;
      box.finalPosition = [box.x, box.y];
      box.needsLeader = true;

      const left = box.x - box.width / 2;
      const right = box.x + box.width / 2;
      const top = box.y - box.height / 2;
      const bottom = box.y + box.height / 2;

      if (left < 0 || right > canvasWidth || top < 0 || bottom > canvasHeight) {
        continue;
      }

      if (!positioned.some(p => boxesOverlap(box, p))) {
        positioned.push(box);
        placed = true;
        break;
      }
    }

    if (!placed) {
      const overlapping = positioned.filter(p => boxesOverlap(box, p));

      if (overlapping.length >= 3) {
        const cluster = [...overlapping, box];
        const centroidX = cluster.reduce((sum, b) => sum + b.edgeMidpointPx![0], 0) / cluster.length;
        const centroidY = cluster.reduce((sum, b) => sum + b.edgeMidpointPx![1], 0) / cluster.length;
        radialSpreadCluster(cluster, [centroidX, centroidY], canvasWidth, canvasHeight);
        positioned.push(box);
        placed = true;
      }
    }

    if (!placed) {
      box.x = origX;
      box.y = origY;
      box.finalPosition = [origX, origY];
      positioned.push(box);
    }
  }

  return positioned;
}

export function radialSpreadCluster(
  cluster: LabelBox[],
  centroid: [number, number],
  canvasWidth: number,
  canvasHeight: number
): void {
  const clusterSize = cluster.length;
  const radius = 60 + clusterSize * 10;
  const angleStep = (2 * Math.PI) / clusterSize;

  cluster.forEach((box, index) => {
    const angle = index * angleStep;
    let x = centroid[0] + radius * Math.cos(angle);
    let y = centroid[1] + radius * Math.sin(angle);

    const halfW = box.width / 2;
    const halfH = box.height / 2;
    x = Math.max(halfW, Math.min(canvasWidth - halfW, x));
    y = Math.max(halfH, Math.min(canvasHeight - halfH, y));

    box.x = x;
    box.y = y;
    box.finalPosition = [x, y];
    box.needsLeader = true;
  });
}
