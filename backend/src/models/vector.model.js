const mongoose = require("mongoose");

const vectorSchema = new mongoose.Schema(
    {
        vectorId: {
            type: String,
            required: true,
            index: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        values: {
            type: [Number],
            required: true
        },

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

vectorSchema.index(
    { userId: 1, vectorId: 1 },
    { unique: true }
);

module.exports = mongoose.model("Vector", vectorSchema);