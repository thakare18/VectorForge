const mongoose = require("mongoose");
const schema = new mongoose.Schema({
    documentId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    fingerprint: String,
    fileName: String,
    embeddingModel: { type: String, required: true },
    dimensions: { type: Number, required: true },
    profile: { type: String, required: true },
    chunks: [{ _id: false, id: String, values: [Number], metadata: mongoose.Schema.Types.Mixed }]
}, { timestamps: true });
schema.index({ userId: 1, documentId: 1 }, { unique: true });
schema.index({ userId: 1, fingerprint: 1 }, { unique: true, partialFilterExpression: { fingerprint: { $type: "string" } } });
module.exports = mongoose.model("Document", schema);
