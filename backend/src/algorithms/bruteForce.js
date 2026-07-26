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

const search = (vectors, queryVector, k = 5, metric = "cosine") => {
    const results = vectors.map((vector) => ({
        ...vector,
        score: calculateScore(queryVector, vector.values, metric)
    }));

    if (metric === "cosine") {
        results.sort((a, b) => b.score - a.score);
    } else {
        results.sort((a, b) => a.score - b.score);
    }

    return results.slice(0, k);
};

module.exports = {
    search
};