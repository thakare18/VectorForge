const { metricDistance, scored, compare } = require("./distance");
const { validateSearch } = require("../validators/vector.contract");
const search = (vectors, query, k = 5, metric = "cosine", withTrace = false) => {
    validateSearch(query, k, metric, "brute-force", withTrace);
    const evaluated = vectors.map((v) => scored(v, metricDistance(query, v.values, metric), metric));
    const results = [...evaluated].sort(compare).slice(0, k);
    return withTrace ? { results, trace: { visitedNodes: evaluated.map((v) => v.id), searchPath: evaluated.map((v) => v.id),
        distances: evaluated.map((v) => ({ id: v.id, distance: v.distance })) } } : results;
};
module.exports = { search };
