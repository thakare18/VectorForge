const { test } = require("node:test");
const assert = require("node:assert/strict");
const VectorDB = require("../src/database/vector.database");
const { cosineSimilarity, euclideanDistance, manhattanDistance } = require("../src/algorithms/distance");
const { distanceBetween } = require("../src/algorithms/hnsw/utils");
test("metric examples and invalid inputs", () => {
    assert.equal(euclideanDistance([0, 0], [3, 4]), 5);
    assert.equal(manhattanDistance([0, 0], [3, 4]), 7);
    assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
    assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1);
    assert.equal(cosineSimilarity([0, 0], [1, 0]), 0);
    assert.equal(distanceBetween([0, 0], { values: [3, 4] }), 5);
    for (const bad of [[], [NaN], [Infinity], ["1"], [null], new Array(5000).fill(1)]) assert.throws(() => euclideanDistance(bad, [1]));
    assert.throws(() => cosineSimilarity([1], [1, 2]));
});
const fixture = Array.from({ length: 24 }, (_, i) => ({ id: "v" + String(i).padStart(2, "0"), values: [(i * 17) % 29 - 14, (i * 7) % 23 - 11, i % 5 - 2] }));
for (const metric of ["cosine", "euclidean", "manhattan"]) {
    test(metric + ": KD exactly matches BF, HNSW uses real distances and scores on deterministic fixture", () => {
        const db = new VectorDB({ random: () => 0.9 });
        fixture.forEach((v) => db.insert(v));
        for (const q of [[2, 3, 1], [-4, 2, 0], [0, 0, 0]]) {
            const bf = db.search(q, 5, metric);
            assert.deepEqual(db.search(q, 5, metric, "kd-tree"), bf);
            const hnsw = db.search(q, 5, metric, "hnsw", true);
            assert.deepEqual(hnsw.results, bf);
            assert.ok(hnsw.trace.distances.some((v) => v.distance > 0));
            assert.equal(hnsw.trace.events.length, hnsw.trace.distances.length);
            for (const event of hnsw.trace.events) assert.equal(event.distance, distanceBetween(q, db.getById(event.id), metric));
        }
    });
}
test("upsert, delete, dimensions, model consistency and defensive copies across all indexes", () => {
    const db = new VectorDB({ random: () => 0.9 });
    db.insert({ id: "a", values: [1, 0] }); db.insert({ id: "b", values: [0, 1] });
    db.search([1, 0], 1, "cosine", "hnsw");
    db.insert({ id: "a", values: [-1, 0] });
    assert.equal(db.size(), 2);
    for (const algorithm of ["brute-force", "kd-tree", "hnsw"]) assert.equal(db.search([1, 0], 1, "cosine", algorithm)[0].id, "b");
    assert.equal(db.delete("b"), true);
    for (const algorithm of ["brute-force", "kd-tree", "hnsw"]) assert.deepEqual(db.search([1, 0], 5, "cosine", algorithm).map((v) => v.id), ["a"]);
    assert.equal(db.delete("missing"), false);
    assert.throws(() => db.insert({ id: "bad", values: [1] })); assert.equal(db.size(), 1);
    assert.throws(() => db.insert({ id: "bad", values: [1, 2], embeddingModel: "different" }));
    db.getAll()[0].values[0] = 99; assert.equal(db.getById("a").values[0], -1);
    db.clear(); assert.equal(db.size(), 0);
});
test("all algorithms reject bad search parameters and handle empty datasets", () => {
    const db = new VectorDB();
    for (const algorithm of ["brute-force", "kd-tree", "hnsw"]) {
        assert.deepEqual(db.search([1, 2], 5, "cosine", algorithm), []);
        for (const k of [0, -1, 1.2, "5", 1001]) assert.throws(() => db.search([1, 2], k, "cosine", algorithm));
        assert.throws(() => db.search([NaN], 2, "cosine", algorithm));
    }
    assert.throws(() => db.search([1], 5, "other")); assert.throws(() => db.search([1], 5, "cosine", "other"));
});
test("HNSW trace records evaluated losing candidates, not just final neighbors; KD split bounds are actual subtrees", () => {
    const db = new VectorDB({ random: () => 0.9 }); fixture.forEach((v) => db.insert(v));
    const h = db.search([2, 3, 1], 1, "euclidean", "hnsw", true);
    assert.ok(h.trace.visitedNodes.length > h.results.length);
    assert.ok(h.trace.hnswEdges.length > 0);
    for (const edge of h.trace.hnswEdges) {
        assert.ok(db.hnswGraph.nodes.get(edge.from).neighbors.get(edge.level).includes(edge.to));
        assert.equal(h.trace.events[edge.step].id, edge.to);
    }
    const kd = db.search([2, 3, 1], 5, "euclidean", "kd-tree", true);
    assert.equal(kd.trace.kdTreeSplits[0].value, db.getKDTree().vector.values[0]);
    assert.ok(kd.trace.kdTreeSplits.slice(1).some((split) => Object.keys(split.bounds).length));
});

test("HNSW upper-level trace keeps the expanded edge origin after greedy improvement", () => {
    const { greedySearchLayer } = require("../src/algorithms/hnsw/utils");
    const nodes = new Map([ ["a", 10], ["b", 1], ["c", 5] ].map(([id, x]) => [id, { vector: { id, values: [x] }, neighbors: new Map([[1, id === "a" ? ["b", "c"] : []]]) }]));
    const events = [], graph = { nodes, metric: "euclidean", observe: (node, distance, from, level) => events.push({ id: node.vector.id, distance, from, level }) };
    assert.equal(greedySearchLayer(graph, [0], nodes.get("a"), 1).vector.id, "b");
    assert.deepEqual(events.map((e) => e.from), [null, "a", "a"]);
    let next = 0;
    const db = new VectorDB({ random: () => next++ % 2 === 0 ? 0.1 : 0.9 });
    fixture.forEach((v) => db.insert(v));
    const output = db.search([2, 3, 1], 5, "euclidean", "hnsw", true);
    assert.ok(output.trace.events.some((e) => e.level > 0));
    for (const edge of output.trace.hnswEdges) assert.ok(db.hnswGraph.nodes.get(edge.from).neighbors.get(edge.level).includes(edge.to));
});
