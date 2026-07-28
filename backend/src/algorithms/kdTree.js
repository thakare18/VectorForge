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
    return [...vectors].sort((first, second) => {
        return first.values[axis] - second.values[axis];
    });
};

// UPDATED
const createNode = (vectors, depth) => {

    // UPDATED
    if (vectors.length === 0) {
        return null;
    }

    // UPDATED
    const dimensions = vectors[0].values.length;

    // UPDATED
    const axis = getAxis(depth, dimensions);

    // UPDATED
    const sortedVectors = sortVectors(
        vectors,
        axis
    );

    // UPDATED
    const medianIndex = Math.floor(
        sortedVectors.length / 2
    );

    
    const node = new KDNode(
        sortedVectors[medianIndex],
        axis
    );

    
    node.left = createNode(
        sortedVectors.slice(0, medianIndex),
        depth + 1
    );

    
    node.right = createNode(
        sortedVectors.slice(medianIndex + 1),
        depth + 1
    );

    
    return node;
};

// UPDATED
const buildKDTree = (vectors) => {

    
    if (!vectors || vectors.length === 0) {
        return null;
    }

    
    return createNode(vectors, 0);
};

// UPDATED
const search = (
    root,
    queryVector
) => {

    if (!root) {
        return null;
    }

    return {
        root,
        queryVector
    };
};


// UPDATED
const updateBest = (
    currentNode,
    queryVector,
    best
) => {

    const dx = currentNode.vector.values[0] - queryVector[0];
    const dy = currentNode.vector.values[1] - queryVector[1];

    const distance = Math.sqrt(
        (dx * dx) + (dy * dy)
    );

    if (
        best === null ||
        distance < best.distance
    ) {
        return {
            node: currentNode,
            distance
        };
    }

    return best;
};

// UPDATED
const shouldVisitOpposite = (
    queryVector,
    currentNode,
    bestDistance
) => {

    const axis = currentNode.axis;

    const axisDistance = Math.abs(
        queryVector[axis] -
        currentNode.vector.values[axis]
    );

    return axisDistance < bestDistance;
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

module.exports = {
    KDNode,

    
    createNode,

    getAxis,

    sortVectors,

    buildKDTree,

    search,

    updateBest,

    shouldVisitOpposite,

    printKDTree,
};