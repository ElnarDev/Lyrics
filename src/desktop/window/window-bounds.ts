export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function fitWindowBounds(bounds: Bounds, workArea: Bounds): Bounds {
  const width = Math.min(bounds.width, workArea.width);
  const height = Math.min(bounds.height, workArea.height);
  const maxX = workArea.x + workArea.width - width;
  const maxY = workArea.y + workArea.height - height;
  return {
    x: Math.min(Math.max(bounds.x, workArea.x), maxX),
    y: Math.min(Math.max(bounds.y, workArea.y), maxY),
    width,
    height,
  };
}

export function restoreNormalBounds(normalBounds: Bounds, compactBounds: Bounds, workArea: Bounds): Bounds {
  return fitWindowBounds({ ...normalBounds, x: compactBounds.x, y: compactBounds.y }, workArea);
}

export function resizeWindowBounds(bounds: Bounds, side: "left" | "right", dx: number, dy: number,
  workArea: Bounds, minHeight: number): Bounds {
  const width = Math.max(360, Math.round(bounds.width + (side === "left" ? -dx : dx)));
  const height = Math.max(minHeight, Math.round(bounds.height + dy));
  const x = side === "left" ? bounds.x + bounds.width - width : bounds.x;
  return fitWindowBounds({ x, y: bounds.y, width, height }, workArea);
}

export function keepWindowReachable(bounds: Bounds, workAreas: Bounds[]): Bounds {
  const roundedBounds = { ...bounds, x: Math.round(bounds.x), y: Math.round(bounds.y) };
  if (!workAreas.length) return roundedBounds;
  let closest: Bounds | undefined;
  let shortestDistance = Infinity;
  for (const area of workAreas) {
    const visibleWidth = Math.min(80, roundedBounds.width, area.width);
    const visibleHeight = Math.min(40, roundedBounds.height, area.height);
    const minX = area.x - roundedBounds.width + visibleWidth;
    const maxX = area.x + area.width - visibleWidth;
    const minY = area.y;
    const maxY = area.y + area.height - visibleHeight;
    const x = Math.min(Math.max(roundedBounds.x, minX), maxX);
    const y = Math.min(Math.max(roundedBounds.y, minY), maxY);
    if (x === roundedBounds.x && y === roundedBounds.y) return roundedBounds;
    const distance = (x - roundedBounds.x) ** 2 + (y - roundedBounds.y) ** 2;
    if (distance < shortestDistance) {
      shortestDistance = distance;
      closest = { ...roundedBounds, x, y };
    }
  }
  return closest!;
}
