const {
    euclideanDistance
} = require("../distance");

const {
    createNode
} = require("./HNSWNode");

// const {
//     findNearestNeighbors,
//     efSearch
// } = require("./utils");

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

const {
    findNearestNeighbors,
    efSearch
} = require("./utils");

const greedySearch = (
    graph,
    queryVector,
    k = 5,
    ef = 10
) => {

    if (graph.entryPoint === null) {

        return [];

    }

    const neighbors =
        findNearestNeighbors(
            graph,
            queryVector,
            ef
        );

    const candidates =
        efSearch(
            neighbors,
            ef
        );

    return candidates
        .slice(0, k)
        .map(
            candidate => candidate.node.vector
        );

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