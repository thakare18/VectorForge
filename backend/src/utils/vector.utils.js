const vectorMagnitude = (vector) => {
    let sum = 0;

    for (const value of vector) {
        sum += value * value;
    }

    return Math.sqrt(sum);
};

const dotProduct = (vectorA, vectorB) => {
    let result = 0;

    for (let i = 0; i < vectorA.length; i++) {
        result += vectorA[i] * vectorB[i];
    }

    return result;
};

const normalizeVector = (vector) => {
    const magnitude = vectorMagnitude(vector);

    if (magnitude === 0) {
        return [...vector];
    }

    return vector.map((value) => value / magnitude);
};

module.exports = {
    vectorMagnitude,
    dotProduct,
    normalizeVector
};