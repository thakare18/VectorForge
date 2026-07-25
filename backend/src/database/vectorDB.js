class VectorDB {
    constructor() {
        this.vectors = [];
    }

    insert(vector) {
        this.vectors.push(vector);
    }

    getAll() {
        return this.vectors;
    }

    clear() {
        this.vectors = [];
    }
}

module.exports = VectorDB;