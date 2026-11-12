const Vector = require("../models/vector.model");
const Document = require("../models/Document");
const { validateVector, validateValues, metadata, invalid } = require("../validators/vector.contract");
const { calculateObjectSize } = require("mongoose").mongo.BSON;
const MAX_VECTORS = 10000, MAX_COMPONENTS = 2000000;
const tooLarge = () => Object.assign(new Error("Search snapshot exceeds the supported in-process limit. Narrow the model/dimension selection or use a larger external index."), { status: 413 });
const modelName = (value) => typeof value === "string" && value.length > 0 && value.length <= 100 ? value : null;
const validRecord = (record) => {
    if (typeof record.id !== "string" || !record.id.trim() || record.id.length > 200) throw invalid("Invalid stored vector ID.");
    validateValues(record.values);
};

async function* records(userId) {
    // Cursors bound memory; no cross-request mutable cache survives writes or restarts.
    for await (const v of Vector.find({ userId }).sort({ _id: 1 }).maxTimeMS(10000).lean().cursor()) {
        yield { id: v.vectorId, values: v.values, metadata: metadata(v.metadata, false),
            embeddingModel: modelName(v.embeddingModel) || modelName(v.metadata?.embeddingModel), createdAt: v.createdAt };
    }
    for await (const doc of Document.find({ userId }).sort({ _id: 1 }).maxTimeMS(10000).lean().cursor()) {
        for (const chunk of doc.chunks || []) yield { ...chunk, metadata: metadata(chunk.metadata, false),
            embeddingModel: modelName(doc.embeddingModel), profile: doc.profile, createdAt: doc.createdAt };
    }
}
async function loadVectors(userId, options = {}) {
    const result = []; let components = 0, mismatched = 0, scanned = 0;
    for await (const record of records(userId)) {
        if (++scanned > 100000) throw tooLarge();
        try { validRecord(record); } catch { continue; } // Quarantine malformed legacy rows; never delete them.
        if (options.dimensions !== undefined && record.values.length !== options.dimensions) { mismatched++; continue; }
        if (options.embeddingModel !== undefined && record.embeddingModel !== options.embeddingModel) continue;
        if (result.length >= MAX_VECTORS || components + record.values.length > MAX_COMPONENTS) throw tooLarge();
        components += record.values.length; result.push(record);
    }
    if (!result.length && mismatched) throw invalid("Query dimensions do not match any stored vector in this selection.");
    return result;
}
async function listVectors(userId, { offset = 0, limit = 100 } = {}) {
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 500) throw invalid("Invalid pagination.");
    let scanned = 0, pageComponents = 0, pageFull = false;
    const data = [], models = new Set(), recent = new Map();
    let totalVectors = 0, totalChunks = 0, invalidVectors = 0;
    for await (const record of records(userId)) {
        if (++scanned > 100000) throw tooLarge();
        try { validRecord(record); } catch { invalidVectors++; continue; }
        if (totalVectors >= offset && !pageFull) {
            if (data.length >= limit || pageComponents + record.values.length > 100000) pageFull = true;
            else { data.push(record); pageComponents += record.values.length; }
        }
        totalVectors++;
        models.add(record.embeddingModel || "unknown (legacy)");
        if (record.metadata.documentId) {
            totalChunks++;
            const key = record.metadata.documentId;
            const entry = recent.get(key) || { documentId: key, name: record.metadata.fileName || "Legacy document", chunks: 0, uploadedAt: record.createdAt };
            entry.chunks++; recent.set(key, entry);
        }
    }
    return { data, statistics: { totalVectors, totalChunks, totalDocuments: recent.size, invalidVectors,
        embeddingModel: [...models].join(", ") || "No embeddings", embeddingModels: [...models], searchAlgorithm: "Brute Force", similarityMetric: "Cosine Similarity" },
        recentUploads: [...recent.values()].sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)).slice(0, 10),
        pagination: { offset, limit, total: totalVectors, hasMore: offset + data.length < totalVectors } };
}
async function saveVector(input, userId) {
    const v = validateVector(input);
    const profile = require("../config/embedding");
    if (v.embeddingModel === profile.model) validateValues(v.values, profile.dimensions);
    const values = { vectorId: v.id, userId, values: v.values, metadata: v.metadata, embeddingModel: v.embeddingModel, dimensions: v.values.length };
    if (v.id.startsWith("doc:")) {
        // Preserve updates to old manual IDs, but never shadow a new document chunk.
        const existing = await Vector.findOneAndUpdate({ vectorId: v.id, userId }, { $set: values }, { returnDocument: "after", runValidators: true });
        if (existing) return existing;
        throw Object.assign(new Error("Document chunks are immutable. Upload a new document instead."), { status: 409 });
    }
    try {
        return await Vector.findOneAndUpdate({ vectorId: v.id, userId }, { $set: values }, { upsert: true, returnDocument: "after", runValidators: true });
    } catch (error) {
        if (error.code !== 11000) throw error;
        return Vector.findOneAndUpdate({ vectorId: v.id, userId }, { $set: values }, { returnDocument: "after", runValidators: true });
    }
}
const findDocument = (userId, fingerprint) => Document.findOne({ userId, fingerprint }).lean();
async function saveDocument(payload) {
    if (new Set(payload.chunks.map((chunk) => chunk.id)).size !== payload.chunks.length) throw invalid("Duplicate document chunk IDs.");
    if (!payload.chunks.length || payload.chunks.length > 250) throw invalid("Invalid document chunk count.");
    for (const chunk of payload.chunks) { validateValues(chunk.values, payload.dimensions); metadata(chunk.metadata); }
    // Keep well below MongoDB's 16 MiB document limit, including schema overhead.
    if (calculateObjectSize(payload) > 12 * 1024 * 1024) throw Object.assign(new Error("Embedded document is too large."), { status: 413 });
    try {
        return await Document.findOneAndUpdate({ userId: payload.userId, fingerprint: payload.fingerprint },
            { $setOnInsert: payload }, { upsert: true, returnDocument: "after", runValidators: true });
    } catch (error) {
        if (error.code !== 11000) throw error;
        return findDocument(payload.userId, payload.fingerprint);
    }
}
async function deleteVector(id, userId) {
    const legacy = await Vector.deleteOne({ vectorId: id, userId });
    if (legacy.deletedCount) return legacy;
    if (id.startsWith("doc:")) {
        const doc = await Document.findOneAndUpdate({ userId, "chunks.id": id },
            { $pull: { chunks: { id } }, $unset: { fingerprint: "" } }, { returnDocument: "after" });
        return { deletedCount: doc ? 1 : 0 };
    }
    return legacy;
}
async function clearVectors(userId) {
    await Vector.deleteMany({ userId });
    await Document.deleteMany({ userId });
}
module.exports = { saveVector, loadVectors, listVectors, deleteVector, clearVectors, saveDocument, findDocument, MAX_VECTORS, MAX_COMPONENTS };
