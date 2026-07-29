const {
    euclideanDistance
} = require("../distance");

const {
    createNode
} = require("./HNSWNode");

const {
    generateRandomLevel
} = require("./utils");

const createGraph = () => {

    return {

        nodes: new Map(),

        entryPoint: null,

        maxLevel: 0

    };

};

const addNode = (
    graph,
    vector,
    level
) => {

    const node = createNode(
        vector,
        level
    );

    graph.nodes.set(
        vector.id,
        node
    );

    if (graph.entryPoint === null) {

        graph.entryPoint = node;

        graph.maxLevel = level;

    }

    if (level > graph.maxLevel) {

        graph.maxLevel = level;

        graph.entryPoint = node;

    }

    return node;

};

const getNode = (
    graph,
    id
) => {

    return graph.nodes.get(id);

};

const hasNode = (
    graph,
    id
) => {

    return graph.nodes.has(id);

};

const getEntryPoint = (graph) => {

    return graph.entryPoint;

};

const getMaxLevel = (graph) => {

    return graph.maxLevel;

};

const size = (graph) => {

    return graph.nodes.size;


};

const insert = (
    graph,
    vector
) => {

    const level =
        generateRandomLevel();

    const node =
        createNode(
            vector,
            level
        );

    addNode(
        graph,
        vector,
        level
    );

    return node;

};

const greedySearch = (
    graph,
    queryVector
) => {

    if (
        graph.entryPoint === null
    ) {

        return null;

    }

    let currentNode =
        graph.entryPoint;

    let improved = true;

    while (improved) {

        improved = false;

        const neighbors =
            currentNode.neighbors.get(0) || [];

        let bestDistance =
            euclideanDistance(
                queryVector,
                currentNode.vector.values
            );

        for (const neighborId of neighbors) {

            const neighbor =
                graph.nodes.get(neighborId);

            const distance =
                euclideanDistance(
                    queryVector,
                    neighbor.vector.values
                );

            if (
                distance < bestDistance
            ) {

                currentNode =
                    neighbor;

                bestDistance =
                    distance;

                improved = true;

            }

        }

    }

    return currentNode;

};



module.exports = {

    createGraph,

    addNode,

    getNode,

    hasNode,

    getEntryPoint,

    getMaxLevel,

    size,

    insert,

    greedySearch

};