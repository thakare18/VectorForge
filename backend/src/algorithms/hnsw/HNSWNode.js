const createNode = (vector, level = 0) => {

    return {

        vector,

        level,

        neighbors: new Map()

    };

};

const addNeighbor = (
    node,
    level,
    neighborId
) => {

    if (!node.neighbors.has(level)) {

        node.neighbors.set(
            level,
            []
        );

    }

    const neighbors =
        node.neighbors.get(level);

    if (!neighbors.includes(neighborId)) {

        neighbors.push(
            neighborId
        );

    }

};

const getNeighbors = (
    node,
    level
) => {

    return node.neighbors.get(level) || [];

};

const removeNeighbor = (
    node,
    level,
    neighborId
) => {

    if (!node.neighbors.has(level)) {

        return;

    }

    const updatedNeighbors =
        node.neighbors
            .get(level)
            .filter(
                id => id !== neighborId
            );

    node.neighbors.set(
        level,
        updatedNeighbors
    );

};

const hasNeighbor = (
    node,
    level,
    neighborId
) => {

    if (!node.neighbors.has(level)) {

        return false;

    }

    return node.neighbors
        .get(level)
        .includes(neighborId);

};

const getLevels = (node) => {

    return Array.from(
        node.neighbors.keys()
    ).sort(
        (a, b) => b - a
    );

};

const connectNodes = (
    firstNode,
    secondNode
) => {

    const maxLevel = Math.min(
        firstNode.level,
        secondNode.level
    );

    for (
        let level = 0;
        level <= maxLevel;
        level++
    ) {

        addNeighbor(
            firstNode,
            level,
            secondNode.vector.id
        );

        addNeighbor(
            secondNode,
            level,
            firstNode.vector.id
        );

    }

};

module.exports = {

    createNode,

    addNeighbor,

    getNeighbors,

    removeNeighbor,

    hasNeighbor,

    getLevels,

    connectNodes

};