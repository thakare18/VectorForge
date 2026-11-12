export const projectTo2D = (vectors) => {
  if (!vectors?.length) return [];

  return vectors.map((vector) => {
    const values = vector.values || vector.embedding || [];
    const x = values[0] ?? 0;
    const y = values[1] ?? values[0] ?? 0;
    return {
      id: vector.id,
      x: x * 400 + 200,
      y: (1 - y) * 300 + 50,
      metadata: vector.metadata || {},
      category:
        vector.metadata?.category ||
        (typeof vector.metadata?.title === "string" ? vector.metadata.title.split(" ")[0] : "default") ||
        "default",
    };
  });
};

export const normalizePoints = (points, width = 560, height = 360, padding = 40) => {
  if (!points.length) return [];

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  return points.map((point) => ({
    ...point,
    px: padding + ((point.x - minX) / rangeX) * (width - padding * 2),
    py: padding + ((point.y - minY) / rangeY) * (height - padding * 2),
  }));
};

export function splitLine(split, projectedPoints, width = 560, height = 360, padding = 40) {
  if (!projectedPoints.length || split.axis > 1) return null;
  const xs = projectedPoints.map((p) => p.x), ys = projectedPoints.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const x = (raw) => padding + ((raw * 400 + 200 - minX) / (maxX - minX || 1)) * (width - 2 * padding);
  const y = (raw) => padding + (((1 - raw) * 300 + 50 - minY) / (maxY - minY || 1)) * (height - 2 * padding);
  const clipX = (value) => Math.max(padding, Math.min(width - padding, value));
  const clipY = (value) => Math.max(padding, Math.min(height - padding, value));
  const xb = split.bounds?.[0] || [null, null], yb = split.bounds?.[1] || [null, null];
  return split.axis === 0
    ? { x1: x(split.value), x2: x(split.value), y1: yb[1] == null ? padding : clipY(y(yb[1])), y2: yb[0] == null ? height - padding : clipY(y(yb[0])) }
    : { y1: y(split.value), y2: y(split.value), x1: xb[0] == null ? padding : clipX(x(xb[0])), x2: xb[1] == null ? width - padding : clipX(x(xb[1])) };
}
