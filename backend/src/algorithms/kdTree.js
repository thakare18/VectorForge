class KDNode {
    constructor(vector, axis) {
        this.vector = vector;
        this.axis = axis;
        this.left = null;
        this.right = null;
    }
}

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

module.exports = {
    KDNode,
    buildKDTree
};