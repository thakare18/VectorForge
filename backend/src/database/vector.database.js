const { createGraph, insert, greedySearch } = require("../algorithms/hnsw/HNSWGraph");
const bruteForce = require("../algorithms/bruteForce");
const kd = require("../algorithms/kdTree");
const { validateVector, validateSearch, validateValues, valuesOf, invalid } = require("../validators/vector.contract");
class VectorDB {
    constructor(options = {}) { this.options = options; this.clear(); }
    insert(input) {
        const vector = validateVector(input);
        if (this.dimensions !== null) validateValues(vector.values, this.dimensions);
        if (this.model !== null && vector.embeddingModel !== this.model) throw invalid("Embedding model does not match this index.");
        if (this.vectors.length && this.model === null && vector.embeddingModel !== null) throw invalid("Cannot mix untagged and model-tagged vectors.");
        this.dimensions = vector.values.length; this.model = vector.embeddingModel;
        const index = this.vectors.findIndex((v) => v.id === vector.id);
        if (index < 0) this.vectors.push(vector); else this.vectors[index] = vector;
        this.invalidate();
        return structuredClone(vector);
    }
    invalidate() { this.kdTree = null; this.graphs = new Map(); this.hnswGraph = null; }
    getAll() { return structuredClone(this.vectors); }
    getById(id) { const v = this.vectors.find((item) => item.id === id); return v ? structuredClone(v) : undefined; }
    delete(id) {
        const index = this.vectors.findIndex((v) => v.id === id);
        if (index < 0) return false;
        this.vectors.splice(index, 1); this.invalidate();
        if (!this.vectors.length) { this.dimensions = null; this.model = null; }
        return true;
    }
    clear() { this.vectors = []; this.dimensions = null; this.model = null; this.invalidate(); }
    size() { return this.vectors.length; }
    search(query, k = 5, metric = "cosine", algorithm = "brute-force", withTrace = false) {
        validateSearch(query, k, metric, algorithm, withTrace);
        query = valuesOf(query);
        if (this.dimensions !== null) validateValues(query, this.dimensions);
        const start = process.hrtime.bigint(); let output;
        if (algorithm === "kd-tree") {
            if (!this.kdTree) this.buildKDTree();
            output = kd.search(this.kdTree, query, k, withTrace, metric);
        } else if (algorithm === "hnsw") {
            if (!this.graphs.has(metric)) {
                const graph = createGraph({ metric, random: this.options.random });
                this.vectors.forEach((v) => insert(graph, v));
                this.graphs.set(metric, graph);
            }
            this.hnswGraph = this.graphs.get(metric);
            output = greedySearch(this.hnswGraph, query, k, this.hnswGraph.efSearch, withTrace);
        } else output = bruteForce.search(this.vectors, query, k, metric, withTrace);
        if (withTrace) output.trace.executionTime = `${(Number(process.hrtime.bigint() - start) / 1e6).toFixed(4)} ms`;
        return structuredClone(output);
    }
    buildKDTree() { this.kdTree = kd.buildKDTree(this.vectors); }
    getKDTree() { return this.kdTree; }
}
module.exports = VectorDB;
