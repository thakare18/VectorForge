const { metricDistance, scored, compare } = require("./distance");
const { validateSearch, validateValues, valuesOf } = require("../validators/vector.contract");
class KDNode {
    constructor(vector, axis) { this.vector = vector; this.axis = axis; this.left = null; this.right = null; }
}
const getAxis = (depth, dimensions) => depth % dimensions;
const sortVectors = (vectors, axis) => [...vectors].sort((a, b) => a.values[axis] - b.values[axis] || a.id.localeCompare(b.id));
function createNode(vectors, depth = 0) {
    if (!vectors.length) return null;
    const axis = getAxis(depth, vectors[0].values.length), sorted = sortVectors(vectors, axis), median = Math.floor(sorted.length / 2);
    const node = new KDNode(sorted[median], axis);
    node.left = createNode(sorted.slice(0, median), depth + 1);
    node.right = createNode(sorted.slice(median + 1), depth + 1);
    return node;
}
function buildKDTree(vectors) {
    if (!vectors?.length) return null;
    vectors.forEach((v) => validateValues(v.values, vectors[0].values.length));
    return createNode(vectors);
}
function search(root, query, k = 5, withTrace = false, metric = "euclidean") {
    validateSearch(query, k, metric, "kd-tree", withTrace);
    query = valuesOf(query);
    if (root) validateValues(query, root.vector.values.length);
    const best = [], visitedNodes = [], kdTreeSplits = [], distances = [];
    function visit(node, bounds = {}) {
        if (!node) return;
        const distance = metricDistance(query, node.vector.values, metric);
        if (withTrace) {
            visitedNodes.push(node.vector.id); distances.push({ id: node.vector.id, distance });
            kdTreeSplits.push({ axis: node.axis, value: node.vector.values[node.axis], nodeId: node.vector.id, bounds });
        }
        best.push(scored(node.vector, distance, metric)); best.sort(compare);
        if (best.length > k) best.pop();
        const axis = node.axis, value = node.vector.values[axis];
        const leftBounds = { ...bounds, [axis]: [bounds[axis]?.[0] ?? null, value] };
        const rightBounds = { ...bounds, [axis]: [value, bounds[axis]?.[1] ?? null] };
        const leftFirst = query[axis] < value;
        visit(leftFirst ? node.left : node.right, leftFirst ? leftBounds : rightBounds);
        const worst = best.length < k ? Infinity : best.at(-1).distance;
        // L1/L2 admit the axis lower bound. Cosine does not; traverse both subtrees exactly.
        if (metric === "cosine" || Math.abs(query[axis] - value) <= worst) {
            visit(leftFirst ? node.right : node.left, leftFirst ? rightBounds : leftBounds);
        }
    }
    visit(root);
    return withTrace ? { results: best, trace: { visitedNodes, searchPath: visitedNodes, kdTreeSplits, distances } } : best;
}
module.exports = { KDNode, getAxis, sortVectors, createNode, buildKDTree, search };
