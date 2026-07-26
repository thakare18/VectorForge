const VectorDB = require("../database/vectorDB");
const sampleData = require("../data/sampleData");

const database = new VectorDB();

// UPDATED
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

module.exports = {
    getVectors,
    insertVector
};