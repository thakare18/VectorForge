const {
    euclideanDistance
} = require("./distance");

class KDNode {
    constructor(vector, axis) {
        this.vector = vector;
        this.axis = axis;
        this.left = null;
        this.right = null;
    }
}

const getAxis = (depth, dimensions) => {
    return depth % dimensions;
};

const sortVectors = (vectors, axis) => {
    return [...vectors].sort((a, b) => {
        return a.values[axis] - b.values[axis];
    });
};

const buildKDTree = (vectors, depth = 0) => {

    if (!vectors || vectors.length === 0) {
        return null;
    }

    const dimensions = vectors[0].values.length;

    const axis = getAxis(depth, dimensions);

    const sortedVectors = sortVectors(vectors, axis);

    const medianIndex = Math.floor(sortedVectors.length / 2);

    const node = new KDNode(
        sortedVectors[medianIndex],
        axis
    );

    node.left = buildKDTree(
        sortedVectors.slice(0, medianIndex),
        depth + 1
    );

    node.right = buildKDTree(
        sortedVectors.slice(medianIndex + 1),
        depth + 1
    );

    return node;
};

const printKDTree = (node, level = 0) => {

    if (!node) {
        return;
    }

    console.log(
        `${" ".repeat(level * 4)}${node.vector.id} (Axis ${node.axis})`
    );

    printKDTree(node.left, level + 1);

    printKDTree(node.right, level + 1);
};


const nearestNeighbor = (
    node,
    queryVector,
    bestNode = null,
    bestDistance = Infinity
) => {

    
    if (!node) {
        return {
            bestNode,
            bestDistance
        };
    }

    
    const currentDistance = euclideanDistance(
        queryVector,
        node.vector.values
    );

    
    if (currentDistance < bestDistance) {
        bestDistance = currentDistance;
        bestNode = node;
    }

    const axis = node.axis;

    let nextBranch = null;

    if (queryVector[axis] < node.vector.values[axis]) {
        nextBranch = node.left;
    } else {
        nextBranch = node.right;
    }

    // UPDATED
    return nearestNeighbor(
        nextBranch,
        queryVector,
        bestNode,
        bestDistance
    );
};

module.exports = {
    KDNode,
    buildKDTree,
    printKDTree,
    nearestNeighbor
};