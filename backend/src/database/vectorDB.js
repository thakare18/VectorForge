const bruteForce = require("../algorithms/bruteForce");

class VectorDB {
    constructor() {
        this.vectors = [];
    }

    insert(vector) {
        this.vectors.push(vector);
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

        return true;
    }

    clear() {
        this.vectors = [];
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
}

module.exports = VectorDB;