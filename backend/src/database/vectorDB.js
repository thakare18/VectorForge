const bruteForce = require("../algorithms/bruteForce");

const {
    buildKDTree
} = require("../algorithms/kdTree");

class VectorDB {
    constructor() {
        this.vectors = [];

        
        this.kdTree = null;
    }

    insert(vector) {
        this.vectors.push(vector);

        // UPDATED
        this.buildKDTree();
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
    }

    size() {
        return this.vectors.length;
    }

     search(queryVector, k = 5, metric = "cosine") {
        return bruteForce.search(
            this.vectors,
            queryVector,
            k,
            metric
        );
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

module.exports = VectorDB;