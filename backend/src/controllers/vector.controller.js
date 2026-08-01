const database = require("../database/vector.database");
const sampleData = require("../data/sampleData");
const benchmarkData = require("../data/benchmarkData");

//const database = new VectorDB();


sampleData.forEach((vector) => {
    database.insert(vector);
});

database.buildKDTree();

const getVectors = (req, res) => {
    res.status(200).json({
        success: true,
        count: database.size(),
        data: database.getAll()
    });
};

const insertVector = (req, res) => {

    // UPDATED
    const { id, values, metadata } = req.body;

    // UPDATED
    if (!id || !Array.isArray(values)) {
        return res.status(400).json({
            success: false,
            message: "id and values are required."
        });
    }

    // UPDATED
    database.insert({
        id,
        values,
        metadata: metadata || {}
    });

    res.status(201).json({
        success: true,
        message: "Vector inserted successfully."
    });
};

// UPDATED
const searchVectors = (req, res) => {
    const {
        vector,
        k = 5,
        metric = "cosine",
         // UPDATED
        algorithm = "brute-force"
    } = req.body;

    if (!Array.isArray(vector)) {
        return res.status(400).json({
            success: false,
            message: "Vector must be an array."
        });
    }

    // 
//const startTime = process.hrtime.bigint();
    // UPDATED
    let results;

    // UPDATED
    switch (algorithm) {

        // UPDATED
        case "kd-tree":
            results = database.search(
                vector,
                k,
                metric,
                algorithm
            );
            break;

            case "hnsw":

    results = database.search(
        vector,
        k,
        metric,
        algorithm
    );

    break;

        // UPDATED
        case "brute-force":
        default:
            results = database.search(
                vector,
                k,
                metric,
                algorithm
            );
            break;
    }

    res.status(200).json({
        success: true,

        // UPDATED
        algorithm,

        count: results.length,
        data: results
    });
};

// UPDATED
const benchmarkSearch = (req, res) => {

    // UPDATED
database.clear();

benchmarkData.forEach((vector) => {
    database.insert(vector);
});

database.buildKDTree();

//const queryVector = benchmarkDB.getAll()[0].values;

    const k = 5;

    const queryVector =
    database.getAll()[0].values;

    // Brute Force
    
    

    // UPDATED
const runs = 1000;

// UPDATED
const bruteStart = process.hrtime.bigint();

for (let i = 0; i < runs; i++) {

    database.search(
        queryVector,
        k,
        "cosine",
        "brute-force"
    );

}

const bruteEnd = process.hrtime.bigint();

const hnswStart =
    process.hrtime.bigint();

for (let i = 0; i < runs; i++) {

    database.search(
        queryVector,
        k,
        "cosine",
        "hnsw"
    );

}

const hnswEnd =
    process.hrtime.bigint();

// UPDATED
const kdStart = process.hrtime.bigint();

for (let i = 0; i < runs; i++) {

    database.search(
        queryVector,
        k,
        "cosine",
        "kd-tree"
    );

}

const kdEnd = process.hrtime.bigint();



// UPDATED
const bruteTime = Number(
    bruteEnd - bruteStart
) / 1000000;

// UPDATED
const kdTime = Number(
    kdEnd - kdStart
) / 1000000;

const hnswTime =
    Number(
        hnswEnd - hnswStart
    ) / 1000000;

    const averageHNSWTime =
    hnswTime / runs;

// UPDATED
const averageBruteTime =
    bruteTime / runs;

// UPDATED
const averageKDTime =
    kdTime / runs;

    

    res.status(200).json({

        success: true,

        datasetSize: database.size(),

        results: {

            bruteForce: {

            averageExecutionTime:
`${averageBruteTime.toFixed(6)} ms`

            },

            kdTree: {

               averageExecutionTime:
`${averageKDTime.toFixed(6)} ms`
                   

            },

            hnsw: {

    averageExecutionTime:
        `${averageHNSWTime.toFixed(6)} ms`

}

        },

        runs,

speedImprovement:
`${(averageBruteTime / averageKDTime).toFixed(2)}x`
    });

};

module.exports = {
    getVectors,
    insertVector,
    searchVectors,
    benchmarkSearch
};