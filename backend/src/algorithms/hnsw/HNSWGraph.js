const { validateValues, validateSearch } = require("../../validators/vector.contract");
const { scored, compare } = require("../distance");
const {
    createNode,
    addNeighbor,
    getNeighbors
} = require("./HNSWNode");

const {
    generateRandomLevel,
    DEFAULT_M,
    DEFAULT_EF_CONSTRUCTION,
    DEFAULT_EF_SEARCH,
    greedySearchLayer,
    searchLayer,
    searchLayerForInsertion,
    selectNeighbors,
    distanceBetween
} = require("./utils");

const createGraph = (options = {}) => {

    return {

        metric: options.metric || "euclidean",
        random: options.random || Math.random,
        dimensions: undefined,
        nodes: new Map(),

        entryPoint: null,

        maxLevel: 0,

        M: DEFAULT_M,

        efConstruction:
            DEFAULT_EF_CONSTRUCTION,

        efSearch:
            DEFAULT_EF_SEARCH

    };

};

const addNode = (
    graph,
    vector,
    level
) => {

    const node =
        createNode(
            vector,
            level
        );

    graph.nodes.set(
        vector.id,
        node
    );

    if (
        graph.entryPoint === null
    ) {

        graph.entryPoint = node;

        graph.maxLevel = level;

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

const getEntryPoint = (
    graph
) => {

    return graph.entryPoint;

};

const getMaxLevel = (
    graph
) => {

    return graph.maxLevel;

};

const size = (
    graph
) => {

    return graph.nodes.size;

};

const pruneNeighbors = (
    graph,
    node,
    level
) => {

    const neighborIds =
        getNeighbors(
            node,
            level
        );

    if (
        neighborIds.length <= graph.M
    ) {

        return;

    }

    const sorted =
        neighborIds
            .map(id => {

                const neighbor =
                    graph.nodes.get(id);

                return {

                    id,

                    distance:
                        distanceBetween(
                            node.vector,
                            neighbor.vector, graph.metric
                        )

                };

            })
            .filter(
                item => item.distance !== Infinity
            )
            .sort(
                (first, second) =>
                    first.distance -
                    second.distance
            );

    const selected =
        sorted
            .slice(
                0,
                graph.M
            )
            .map(
                item => item.id
            );

    node.neighbors.set(
        level,
        selected
    );

};

const connectAtLevel = (
    graph,
    node,
    candidates,
    level
) => {

    const selected =
        selectNeighbors(
            candidates,
            graph.M
        );

    for (
        const candidate of selected
    ) {

        const neighbor =
            candidate.node;

        addNeighbor(
            node,
            level,
            neighbor.vector.id
        );

        addNeighbor(
            neighbor,
            level,
            node.vector.id
        );

        pruneNeighbors(
            graph,
            neighbor,
            level
        );

    }

    pruneNeighbors(
        graph,
        node,
        level
    );

};

const insert = (
    graph,
    vector
) => {

    validateValues(vector.values, graph.dimensions);
    if (graph.nodes.has(vector.id)) throw new Error("Duplicate HNSW ID; update through VectorDB to rebuild indexes.");
    graph.dimensions = vector.values.length;

    const level =
        generateRandomLevel(graph.random);

    const node =
        addNode(
            graph,
            vector,
            level
        );

    if (
        graph.nodes.size === 1
    ) {

        graph.entryPoint = node;

        graph.maxLevel = level;

        return node;

    }

    let current =
        graph.entryPoint;

    for (
        let currentLevel =
            graph.maxLevel;

        currentLevel > level;

        currentLevel--
    ) {

        current =
            greedySearchLayer(
                graph,
                vector,
                current,
                currentLevel
            );

    }

    const lowestLevel =
        Math.min(
            level,
            graph.maxLevel
        );

    for (
        let currentLevel =
            lowestLevel;

        currentLevel >= 0;

        currentLevel--
    ) {

        const candidates =
            searchLayerForInsertion(
                graph,
                vector,
                current,
                currentLevel,
                graph.efConstruction
            );

        connectAtLevel(
            graph,
            node,
            candidates,
            currentLevel
        );

        if (
            candidates.length > 0
        ) {

            current =
                candidates[0].node;

        }

    }

    if (
        level > graph.maxLevel
    ) {

        graph.maxLevel = level;

        graph.entryPoint = node;

    }

    return node;

};

const greedySearch = (graph, queryVector, k = 5, ef = graph.efSearch, withTrace = false) => {
    validateSearch(queryVector, k, graph.metric, "hnsw", withTrace);
    validateValues(queryVector, graph.dimensions);
    const trace = { visitedNodes: [], searchPath: [], hnswEdges: [], distances: [], events: [] };
    const seen = new Set();
    graph.observe = withTrace ? (node, distance, from, level) => {
        const id = node.vector.id;
        if (!seen.has(id)) { seen.add(id); trace.visitedNodes.push(id); }
        trace.searchPath.push(id); trace.distances.push({ id, distance });
        trace.events.push({ id, distance, from, level });
        if (from !== null) trace.hnswEdges.push({ from, to: id, level, step: trace.events.length - 1 });
    } : null;
    try {
        if (!graph.entryPoint) return withTrace ? { results: [], trace } : [];
        let current = graph.entryPoint;
        for (let level = graph.maxLevel; level > 0; level--) current = greedySearchLayer(graph, queryVector, current, level);
        const candidates = searchLayer(graph, queryVector, current, 0, Math.max(ef, k));
        const results = candidates.map((item) => scored(item.node.vector, item.distance, graph.metric)).sort(compare).slice(0, k);
        return withTrace ? { results, trace } : results;
    } finally { graph.observe = null; }
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