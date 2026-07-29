const VectorDB = require("../database/vectorDB");
const sampleData = require("../data/sampleData");

const database = new VectorDB();


sampleData.forEach((vector) => {
    database.insert(vector);
});

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

    
const startTime = process.hrtime.bigint();
    // UPDATED
    let results;

    // UPDATED
    switch (algorithm) {

        // UPDATED
        case "kd-tree":
            results = database.search(
                vector,
                k,
                metric
            );
            break;

        // UPDATED
        case "brute-force":
        default:
            results = database.search(
                vector,
                k,
                metric
            );
            break;
    }

    // UPDATED
const endTime = process.hrtime.bigint();

// UPDATED
const executionTime = Number(
    endTime - startTime
) / 1000000;

    res.status(200).json({
        success: true,

        // UPDATED
        algorithm,

        // UPDATED
executionTime: `${executionTime.toFixed(3)} ms`,

        count: results.length,
        data: results
    });
};

module.exports = {
    getVectors,
    insertVector,
    searchVectors
};