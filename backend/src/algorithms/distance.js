const {
    dotProduct,
    vectorMagnitude
} = require("../utils/vector.utils");

const cosineSimilarity = (vectorA, vectorB) => {
    const magnitudeA = vectorMagnitude(vectorA);
    const magnitudeB = vectorMagnitude(vectorB);

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }

    return dotProduct(vectorA, vectorB) / (magnitudeA * magnitudeB);
};

const euclideanDistance = (vectorA, vectorB) => {
    let sum = 0;

    for (let i = 0; i < vectorA.length; i++) {
        const difference = vectorA[i] - vectorB[i];
        sum += difference * difference;
    }

    return Math.sqrt(sum);
};

const manhattanDistance = (vectorA, vectorB) => {
    let distance = 0;

    for (let i = 0; i < vectorA.length; i++) {
        distance += Math.abs(vectorA[i] - vectorB[i]);
    }

    return distance;
};

module.exports = {
    cosineSimilarity,
    euclideanDistance,
    manhattanDistance
};