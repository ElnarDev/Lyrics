function restoreNormalBounds(normalBounds, compactBounds, workArea) {
  const maxX = workArea.x + Math.max(0, workArea.width - normalBounds.width);
  const maxY = workArea.y + Math.max(0, workArea.height - normalBounds.height);
  return {
    x: Math.min(Math.max(compactBounds.x, workArea.x), maxX),
    y: Math.min(Math.max(compactBounds.y, workArea.y), maxY),
    width: normalBounds.width,
    height: normalBounds.height,
  };
}

module.exports = { restoreNormalBounds };
