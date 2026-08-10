const {
    cosineSimilarity,
    euclideanDistance,
    manhattanDistance
} = require("./distance");

const calculateScore = (queryVector, targetVector, metric) => {
    switch (metric) {
        case "euclidean":
            return euclideanDistance(queryVector, targetVector);
        case "manhattan":
            return manhattanDistance(queryVector, targetVector);
        case "cosine":
        default:
            return cosineSimilarity(queryVector, targetVector);
    }
};

const search = (vectors, queryVector, k = 5, metric = "cosine", withTrace = false) => {
    const visitedNodes = [];
    const distances = [];

    const results = vectors.map((vector) => {
        const score = calculateScore(queryVector, vector.values, metric);
        if (withTrace) {
            visitedNodes.push(vector.id);
            distances.push({ id: vector.id, distance: score });
        }
        return { ...vector, score };
    });

    if (metric === "cosine") {
        results.sort((a, b) => b.score - a.score);
    } else {
        results.sort((a, b) => a.score - b.score);
    }

    const topK = results.slice(0, k);

    if (!withTrace) {
        return topK;
    }

    return {
        results: topK,
        trace: {
            visitedNodes,
            searchPath: visitedNodes,
            distances,
            executionTime: null
        }
    };
};

module.exports = { search };
