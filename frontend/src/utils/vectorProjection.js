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
        vector.metadata?.title?.split(" ")[0] ||
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
