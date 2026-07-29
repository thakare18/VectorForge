// UPDATED

const HNSWNode = require("./HNSWNode");

class HNSWGraph {

    constructor() {

        // All nodes
        this.nodes = new Map();

        // Highest layer
        this.maxLevel = 0;

        // Entry point
        this.entryPoint = null;

    }

    // UPDATED
    addNode(node) {

        this.nodes.set(
            node.vector.id,
            node
        );

        if (
            this.entryPoint === null
        ) {

            this.entryPoint = node;

            this.maxLevel = node.level;

        }

        if (
            node.level >
            this.maxLevel
        ) {

            this.maxLevel = node.level;

            this.entryPoint = node;

        }

    }

    // UPDATED
    getNode(id) {

        return this.nodes.get(id);

    }

    // UPDATED
    size() {

        return this.nodes.size;

    }

}

module.exports = HNSWGraph;