const { validateValues, METRICS, invalid } = require("../validators/vector.contract");
function pair(a, b) { const first = validateValues(a); return [first, validateValues(b, first.length)]; }
const cosineSimilarity = (a, b) => {
    [a, b] = pair(a, b);
    let dot = 0, aa = 0, bb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; }
    if (!aa || !bb) return 0; // Retains the existing zero-vector convention.
    return Math.max(-1, Math.min(1, (dot / Math.sqrt(aa)) / Math.sqrt(bb)));
};
const euclideanDistance = (a, b) => {
    [a, b] = pair(a, b); let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
};
const manhattanDistance = (a, b) => {
    [a, b] = pair(a, b); let sum = 0;
    for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
    return sum;
};
const metricDistance = (a, b, metric = "euclidean") => {
    if (!METRICS.includes(metric)) throw invalid("Unsupported metric.");
    return metric === "cosine" ? 1 - cosineSimilarity(a, b) :
        metric === "manhattan" ? manhattanDistance(a, b) : euclideanDistance(a, b);
};
const scored = (vector, distance, metric) => ({ ...vector, distance, score: metric === "cosine" ? 1 - distance : distance, metric,
    scoreDirection: metric === "cosine" ? "higher-is-better" : "lower-is-better" });
const compare = (a, b) => a.distance - b.distance || String(a.id ?? a.node?.vector.id).localeCompare(String(b.id ?? b.node?.vector.id));
module.exports = { cosineSimilarity, euclideanDistance, manhattanDistance, metricDistance, scored, compare };
