const {
    euclideanDistance
} = require("../distance");

const MAX_LEVEL = 16;

const LEVEL_PROBABILITY = 0.5;

const DEFAULT_M = 8;

const DEFAULT_EF_CONSTRUCTION = 40;

const DEFAULT_EF_SEARCH = 30;

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

class MinHeap {

    constructor() {

        this.items = [];

    }

    push(item) {

        this.items.push(item);

        this.bubbleUp(
            this.items.length - 1
        );

    }

    pop() {

        if (this.items.length === 0) {

            return null;

        }

        if (this.items.length === 1) {

            return this.items.pop();

        }

        const top = this.items[0];

        this.items[0] =
            this.items.pop();

        this.bubbleDown(0);

        return top;

    }

    peek() {

        return this.items[0] || null;

    }

    size() {

        return this.items.length;

    }

    bubbleUp(index) {

        while (index > 0) {

            const parent =
                Math.floor(
                    (index - 1) / 2
                );

            if (
                this.items[parent].distance <=
                this.items[index].distance
            ) {

                break;

            }

            [
                this.items[parent],
                this.items[index]
            ] = [
                this.items[index],
                this.items[parent]
            ];

            index = parent;

        }

    }

    bubbleDown(index) {

        while (true) {

            const left =
                index * 2 + 1;

            const right =
                index * 2 + 2;

            let smallest = index;

            if (
                left < this.items.length &&
                this.items[left].distance <
                this.items[smallest].distance
            ) {

                smallest = left;

            }

            if (
                right < this.items.length &&
                this.items[right].distance <
                this.items[smallest].distance
            ) {

                smallest = right;

            }

            if (smallest === index) {

                break;

            }

            [
                this.items[index],
                this.items[smallest]
            ] = [
                this.items[smallest],
                this.items[index]
            ];

            index = smallest;

        }

    }

}

class MaxHeap {

    constructor() {

        this.items = [];

    }

    push(item) {

        this.items.push(item);

        this.bubbleUp(
            this.items.length - 1
        );

    }

    pop() {

        if (this.items.length === 0) {

            return null;

        }

        if (this.items.length === 1) {

            return this.items.pop();

        }

        const top = this.items[0];

        this.items[0] =
            this.items.pop();

        this.bubbleDown(0);

        return top;

    }

    peek() {

        return this.items[0] || null;

    }

    size() {

        return this.items.length;

    }

    bubbleUp(index) {

        while (index > 0) {

            const parent =
                Math.floor(
                    (index - 1) / 2
                );

            if (
                this.items[parent].distance >=
                this.items[index].distance
            ) {

                break;

            }

            [
                this.items[parent],
                this.items[index]
            ] = [
                this.items[index],
                this.items[parent]
            ];

            index = parent;

        }

    }

    bubbleDown(index) {

        while (true) {

            const left =
                index * 2 + 1;

            const right =
                index * 2 + 2;

            let largest = index;

            if (
                left < this.items.length &&
                this.items[left].distance >
                this.items[largest].distance
            ) {

                largest = left;

            }

            if (
                right < this.items.length &&
                this.items[right].distance >
                this.items[largest].distance
            ) {

                largest = right;

            }

            if (largest === index) {

                break;

            }

            [
                this.items[index],
                this.items[largest]
            ] = [
                this.items[largest],
                this.items[index]
            ];

            index = largest;

        }

    }

}

const distanceBetween = (
    firstVector,
    secondVector
) => {

    return euclideanDistance(
        firstVector.values,
        secondVector.values
    );

};

const greedySearchLayer = (
    graph,
    queryVector,
    entryPoint,
    level
) => {

    let current = entryPoint;

    let currentDistance =
        distanceBetween(
            queryVector,
            current.vector
        );

    let improved = true;

    while (improved) {

        improved = false;

        const neighborIds =
            current.neighbors.get(level) || [];

        for (const neighborId of neighborIds) {

            const neighbor =
                graph.nodes.get(
                    neighborId
                );

            if (!neighbor) {

                continue;

            }

            const distance =
                distanceBetween(
                    queryVector,
                    neighbor.vector
                );

            if (distance < currentDistance) {

                current = neighbor;

                currentDistance = distance;

                improved = true;

            }

        }

    }

    return current;

};

const searchLayer = (
    graph,
    queryVector,
    entryPoint,
    level,
    ef
) => {

    const candidates =
        new MinHeap();

    const results =
        new MaxHeap();

    const visited =
        new Set();

    const entryDistance =
        distanceBetween(
            queryVector,
            entryPoint.vector
        );

    candidates.push({

        node: entryPoint,

        distance: entryDistance

    });

    results.push({

        node: entryPoint,

        distance: entryDistance

    });

    visited.add(
        entryPoint.vector.id
    );

    while (candidates.size() > 0) {

        const current =
            candidates.pop();

        const worstResult =
            results.peek();

        if (
            results.size() >= ef &&
            current.distance >
            worstResult.distance
        ) {

            break;

        }

        const neighborIds =
            current.node.neighbors.get(level) || [];

        for (const neighborId of neighborIds) {

            if (
                visited.has(neighborId)
            ) {

                continue;

            }

            visited.add(neighborId);

            const neighbor =
                graph.nodes.get(
                    neighborId
                );

            if (!neighbor) {

                continue;

            }

            const distance =
                distanceBetween(
                    queryVector,
                    neighbor.vector
                );

            const worstDistance =
                results.peek()
                    ?.distance ?? Infinity;

            if (
                results.size() < ef ||
                distance < worstDistance
            ) {

                candidates.push({

                    node: neighbor,

                    distance

                });

                results.push({

                    node: neighbor,

                    distance

                });

                if (
                    results.size() > ef
                ) {

                    results.pop();

                }

            }

        }

    }

    const output = [];

    while (results.size() > 0) {

        output.push(
            results.pop()
        );

    }

    return output.reverse();

};

const selectNeighbors = (
    candidates,
    maxNeighbors
) => {

    return candidates
        .sort(
            (first, second) =>
                first.distance -
                second.distance
        )
        .slice(
            0,
            maxNeighbors
        );

};

const searchLayerForInsertion = (
    graph,
    queryVector,
    entryPoint,
    level,
    efConstruction
) => {

    return searchLayer(
        graph,
        queryVector,
        entryPoint,
        level,
        efConstruction
    );

};

module.exports = {

    MAX_LEVEL,

    LEVEL_PROBABILITY,

    DEFAULT_M,

    DEFAULT_EF_CONSTRUCTION,

    DEFAULT_EF_SEARCH,

    MinHeap,

    MaxHeap,

    generateRandomLevel,

    distanceBetween,

    greedySearchLayer,

    searchLayer,

    searchLayerForInsertion,

    selectNeighbors

};