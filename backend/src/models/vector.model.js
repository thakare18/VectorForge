const mongoose = require("mongoose");

const vectorSchema = new mongoose.Schema(
    {
        vectorId: {
            type: String,
            required: true,
            unique: true,
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

module.exports = mongoose.model("Vector", vectorSchema);