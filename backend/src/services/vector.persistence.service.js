const Vector = require("../models/vector.model");

const saveVector = async (vector, userId) => {
    return Vector.findOneAndUpdate(
        {
            vectorId: vector.id,
            userId
        },
        {
            vectorId: vector.id,
            userId,
            values: vector.values,
            metadata: vector.metadata || {}
        },
        {
            upsert: true,
            returnDocument: "after"
        }
    );
};

const loadVectors = async (userId) => {
    return Vector.find({
        userId
    }).lean();
};

const deleteVector = async (id, userId) => {
    return Vector.deleteOne({
        vectorId: id,
        userId
    });
};

const clearVectors = async (userId) => {
    return Vector.deleteMany({
        userId
    });
};

module.exports = {
    saveVector,
    loadVectors,
    deleteVector,
    clearVectors
};