import { playbackFrame } from "../../utils/workflows";
import { CATEGORY_COLORS } from "../../utils/constants";
import { normalizePoints, projectTo2D, splitLine } from "../../utils/vectorProjection";

function getCategoryColor(category) {
  if (!category) return CATEGORY_COLORS.default;
  const key = Object.keys(CATEGORY_COLORS).find(
    (k) => k.toLowerCase() === String(category).toLowerCase()
  );
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.default;
}

export default function VectorCanvas({
  vectors = [],
  queryVector = null,
  results = [],
  trace = null,
  step = 0,
  width = 560,
  height = 360,
}) {
  const projectedVectors = projectTo2D(trace?.points || vectors);
  const projectedQuery = queryVector
    ? projectTo2D([{ id: "query", values: queryVector }])[0]
    : null;
  const normalized = normalizePoints(
    projectedQuery ? [...projectedVectors, projectedQuery] : projectedVectors,
    width,
    height
  );
  const points = projectedQuery
    ? normalized.slice(0, projectedVectors.length)
    : normalized;
  const queryPoint = projectedQuery
    ? normalized.at(-1)
    : null;
  const pointMap = new Map(points.map((point) => [point.id, point]));
  const allProjected = projectedQuery ? [...projectedVectors, projectedQuery] : projectedVectors;
  const resultIds = new Set(results.map((r) => r.id));
  const frame = playbackFrame(trace, step);
  const { activeId, pathIds, visited } = frame;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />

        {frame.splits.map((split, i) => {
          const line = splitLine(split, allProjected, width, height);
          return line ? <line key={"split-" + i} {...line} stroke="rgba(204,255,0,0.25)" strokeDasharray="4 4" /> : null;
        })}

        {frame.edges.map((edge, i) => {
          const from = pointMap.get(edge.from);
          const to = pointMap.get(edge.to);
          if (!from || !to) return null;

          return (
            <line
              key={`edge-${i}`}
              x1={from.px}
              y1={from.py}
              x2={to.px}
              y2={to.py}
              stroke="rgba(0,229,255,0.28)"
              strokeWidth="1.5"
              className="flow-line"
            />
          );
        })}

        {!trace?.hnswEdges && pathIds.length > 1 &&
          pathIds.slice(0, -1).map((id, i) => {
            const from = points.find((p) => p.id === pathIds[i]);
            const to = points.find((p) => p.id === pathIds[i + 1]);
            if (!from || !to) return null;
            return (
              <line
                key={`path-${i}`}
                x1={from.px}
                y1={from.py}
                x2={to.px}
                y2={to.py}
                stroke="#ccff00"
                strokeWidth="2"
                opacity="0.6"
              />
            );
          })}

        {points.map((point) => {
          const isResult = resultIds.has(point.id);
          const isActive = point.id === activeId;
          const isVisited = visited.has(point.id);
          const color = getCategoryColor(point.category);

          return (
            <g key={point.id}>
              {(isActive || isResult) && (
                <circle
                  cx={point.px}
                  cy={point.py}
                  r={isResult ? 16 : 12}
                  fill="none"
                  stroke={isResult ? "#ccff00" : "#00e5ff"}
                  strokeWidth="2"
                  opacity="0.5"
                />
              )}
              <circle
                cx={point.px}
                cy={point.py}
                r={isActive ? 7 : 5}
                fill={color}
                opacity={isVisited || isResult ? 1 : 0.7}
                className={isActive ? "node-active" : ""}
              />
              <text
                x={point.px}
                y={point.py - 10}
                textAnchor="middle"
                fill="rgba(255,255,255,0.5)"
                fontSize="9"
                fontFamily="JetBrains Mono"
              >
                {point.id}
              </text>
            </g>
          );
        })}

        {queryPoint && (
          <g>
            <polygon
              points={`${queryPoint.px},${queryPoint.py - 10} ${queryPoint.px + 8},${queryPoint.py + 6} ${queryPoint.px - 8},${queryPoint.py + 6}`}
              fill="#ffffff"
              stroke="#ccff00"
              strokeWidth="1.5"
            />
            <text
              x={queryPoint.px}
              y={queryPoint.py + 20}
              textAnchor="middle"
              fill="#ccff00"
              fontSize="10"
              fontFamily="JetBrains Mono"
            >
              query
            </text>
          </g>
        )}
      </svg>

      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
        {Object.entries(CATEGORY_COLORS)
          .filter(([k]) => k !== "default")
          .slice(0, 5)
          .map(([cat, color]) => (
            <span
              key={cat}
              className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10px] text-gray-400"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: color }}
              />
              {cat}
            </span>
          ))}
      </div>
    </div>
  );
}
