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

const createGraph = () => {

    return {

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
                            neighbor.vector
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

    if (
        graph.nodes.has(vector.id)
    ) {

        return graph.nodes.get(
            vector.id
        );

    }

    const level =
        generateRandomLevel();

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

const greedySearch = (
    graph,
    queryVector,
    k = 5,
    ef = graph.efSearch,
    withTrace = false
) => {

    if (
        graph.entryPoint === null
    ) {

        return withTrace
            ? { results: [], trace: { visitedNodes: [], searchPath: [], hnswEdges: [] } }
            : [];

    }

    const visitedNodes = [];
    const searchPath = [];
    const hnswEdges = [];
    const distances = [];

    const recordVisit = (node) => {
        const id = node.vector.id;
        if (!visitedNodes.includes(id)) {
            visitedNodes.push(id);
        }
        searchPath.push(id);
        distances.push({
            id,
            distance: distanceBetween(queryVector, node.vector)
        });
    };

    let current =
        graph.entryPoint;

    recordVisit(current);

    for (
        let level =
            graph.maxLevel;

        level > 0;

        level--
    ) {

        const prev = current;
        current =
            greedySearchLayer(
                graph,
                queryVector,
                current,
                level
            );

        if (current !== prev) {
            hnswEdges.push({
                from: prev.vector.id,
                to: current.vector.id,
                level
            });
            recordVisit(current);
        }

    }

    const layerResults =
        searchLayer(
            graph,
            queryVector,
            current,
            0,
            Math.max(
                ef,
                k
            )
        );

    for (const item of layerResults) {
        recordVisit(item.node);
    }

    const results = layerResults
        .sort(
            (first, second) =>
                first.distance -
                second.distance
        )
        .slice(
            0,
            k
        )
        .map(
            result =>
                result.node.vector
        );

    if (!withTrace) {
        return results;
    }

    return {
        results,
        trace: {
            visitedNodes,
            searchPath,
            hnswEdges,
            distances
        }
    };

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