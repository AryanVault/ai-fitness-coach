export function clampPreviewPosition(position: { x: number; y: number }, viewport: { width: number; height: number }, preview: { width: number; height: number }) {
  const gutter = 16;
  const maxX = Math.max(gutter, viewport.width - Math.min(preview.width, viewport.width - gutter * 2) - gutter);
  const maxY = Math.max(gutter, viewport.height - Math.min(preview.height, viewport.height - gutter * 2) - gutter);
  return { x: Math.min(maxX, Math.max(gutter, position.x)), y: Math.min(maxY, Math.max(gutter, position.y)) };
}
