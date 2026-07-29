const {
    createNode
} = require("./HNSWNode");

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

module.exports = {

    createGraph,

    addNode,

    getNode,

    hasNode,

    getEntryPoint,

    getMaxLevel,

    size

};