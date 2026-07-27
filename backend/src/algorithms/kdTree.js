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

    if (vectors.length === 0) {
        return null;
    }

    const dimensions = vectors[0].values.length;

    const axis = depth % dimensions;

    const sortedVectors = [...vectors].sort((a, b) => {
        return a.values[axis] - b.values[axis];
    });

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

// UPDATED
const nearestNeighbor = (
    node,
    queryVector,
    depth = 0
) => {

    
    if (!node) {
        return null;
    }

    
    const axis = node.axis;

    // UPDATED
    let nextBranch = null;

    
    let oppositeBranch = null;

    
    if (queryVector[axis] < node.vector.values[axis]) {

        
        nextBranch = node.left;

        
        oppositeBranch = node.right;

    } else {

        // UPDATED
        nextBranch = node.right;

        // UPDATED
        oppositeBranch = node.left;
    }

    
    nearestNeighbor(
        nextBranch,
        queryVector,
        depth + 1 //  means we are going deeper into the tree, so we increment the depth by 1
    );

    // UPDATED
    return node;
};


module.exports = {
    KDNode,
    buildKDTree,
    printKDTree,
    nearestNeighbor
};