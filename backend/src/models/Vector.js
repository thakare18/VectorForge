class Vector {
    constructor(id, values, metadata = {}) {
        this.id = id;
        this.values = values;
        this.metadata = metadata;
    }
}

module.exports = Vector;