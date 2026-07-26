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
    const vector = req.body;

    database.insert(vector);

    res.status(201).json({
        success: true,
        message: "Vector inserted successfully.",
        data: vector
    });
};

// UPDATED
const searchVectors = (req, res) => {
    const {
        vector,
        k = 5,
        metric = "cosine"
    } = req.body;

    if (!Array.isArray(vector)) {
        return res.status(400).json({
            success: false,
            message: "Vector must be an array."
        });
    }

    const results = database.search(vector, k, metric);

    res.status(200).json({
        success: true,
        count: results.length,
        data: results
    });
};

module.exports = {
    getVectors,
    insertVector,
    searchVectors
};