const MAX_LEVEL = 16;

const LEVEL_PROBABILITY = 0.5;

const generateRandomLevel = () => {

    let level = 0;

    while (

        Math.random() < LEVEL_PROBABILITY &&

        level < MAX_LEVEL

    ) {

        level++;

    }

    return level;

};

const {
    euclideanDistance
} = require("../distance");

const findNearestNeighbors = (
    graph,
    queryVector,
    k = 5
) => {

    const neighbors = [];

    graph.nodes.forEach((node) => {

        const distance =
            euclideanDistance(
                queryVector,
                node.vector.values
            );

        neighbors.push({

            node,

            distance

        });

    });

    neighbors.sort(
        (first, second) =>
            first.distance -
            second.distance
    );

    return neighbors.slice(0, k);

};

module.exports = {

    MAX_LEVEL,

    LEVEL_PROBABILITY,

    generateRandomLevel,

    findNearestNeighbors

};