const VectorDB = require("../database/vectorDB");

const database = new VectorDB();

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