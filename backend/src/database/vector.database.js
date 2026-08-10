const {
    createGraph,
    insert,
    greedySearch
} = require("../algorithms/hnsw/HNSWGraph");

const bruteForce = require("../algorithms/bruteForce");

// UPDATED
const {
    buildKDTree,
    search
} = require("../algorithms/kdTree");

class VectorDB {
    constructor() {
        this.vectors = [];

        
        this.kdTree = null;

        this.hnswGraph = createGraph();
    }

   insert(vector) {

    this.vectors.push(vector);

    insert(
        this.hnswGraph,
        vector
    );

    return vector;

}

    getAll() {
        return this.vectors;
    }

    getById(id) {
        return this.vectors.find((vector) => vector.id === id);
    }

    delete(id) {
        const index = this.vectors.findIndex((vector) => vector.id === id);

        if (index === -1) {
            return false;
        }

        this.vectors.splice(index, 1);

        // UPDATED
        this.buildKDTree();

        return true;
    }

    clear() {
        this.vectors = [];
        // UPDATED
        this.kdTree = null;

        this.hnswGraph =
    createGraph();
    }

    size() {
        return this.vectors.length;
    }

     // UPDATED
search(
    queryVector,
    k = 5,
    metric = "cosine",
    algorithm = "brute-force",
    withTrace = false
) {

    const startTime = process.hrtime.bigint();

    let output;

    if (algorithm === "kd-tree") {

        if (!this.kdTree) {
            this.buildKDTree();
        }

        output = search(
            this.kdTree,
            queryVector,
            k,
            withTrace
        );

    } else if (algorithm === "hnsw") {

        output = greedySearch(
            this.hnswGraph,
            queryVector,
            k,
            this.hnswGraph.efSearch,
            withTrace
        );

    } else {

        output = bruteForce.search(
            this.vectors,
            queryVector,
            k,
            metric,
            withTrace
        );

    }

    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1e6;

    if (!withTrace) {
        return output;
    }

    const results = output.results;
    const trace = output.trace || {};
    trace.executionTime = `${executionTime.toFixed(4)} ms`;

    return { results, trace };
}

     // UPDATED
    buildKDTree() {
        this.kdTree = buildKDTree(this.vectors);
    }

    // UPDATED
    getKDTree() {
        return this.kdTree;
    }
}


module.exports = new VectorDB();