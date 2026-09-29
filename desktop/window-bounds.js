function fitWindowBounds(bounds, workArea) {
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

function restoreNormalBounds(normalBounds, compactBounds, workArea) {
  return fitWindowBounds({ ...normalBounds, x: compactBounds.x, y: compactBounds.y }, workArea);
}

function resizeWindowBounds(bounds, side, dx, dy, workArea, minHeight) {
  const width = Math.max(360, Math.round(bounds.width + (side === "left" ? -dx : dx)));
  const height = Math.max(minHeight, Math.round(bounds.height + dy));
  const x = side === "left" ? bounds.x + bounds.width - width : bounds.x;
  return fitWindowBounds({ x, y: bounds.y, width, height }, workArea);
}

function keepWindowReachable(bounds, workAreas) {
  const roundedBounds = { ...bounds, x: Math.round(bounds.x), y: Math.round(bounds.y) };
  if (!workAreas.length) return roundedBounds;
  let closest;
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
  return closest;
}

module.exports = { fitWindowBounds, restoreNormalBounds, resizeWindowBounds, keepWindowReachable };
