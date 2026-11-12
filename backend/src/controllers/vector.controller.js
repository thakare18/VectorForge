const VectorDB = require("../database/vector.database");

const {
    successResponse,
    errorResponse
} = require("../utils/response");

const {
    saveVector,
    loadVectors,
    deleteVector,
    clearVectors
} = require("../services/vector.persistence.service");

const { listVectors } = require("../services/vector.persistence.service");
const { validateVector, validateSearch, invalid, valuesOf } = require("../validators/vector.contract");
const failure = (res, error) => errorResponse(res, [400, 409, 413].includes(error.status) ? error.status : 503,
    [400, 409, 413].includes(error.status) ? error.message : "Vector storage temporarily unavailable.");
const getVectors = async (req, res) => {
    try {
        const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
        const limit = req.query.limit === undefined ? 100 : Number(req.query.limit);
        if (Array.isArray(req.query.offset) || Array.isArray(req.query.limit)) throw invalid("Invalid pagination.");
        res.json({ success: true, ...await listVectors(req.user._id, { offset, limit }) });
    } catch (error) { return failure(res, error); }
};
const insertVector = async (req, res) => {
    try {
        const vector = validateVector(req.body);
        await saveVector(vector, req.user._id);
        return successResponse(res, 201, "Vector saved successfully.");
    } catch (error) { return failure(res, error); }
};
const deleteVectorById = async (req, res) => {
    try {
        const result = await deleteVector(req.params.id, req.user._id);
        return result.deletedCount ? successResponse(res, 200, "Vector deleted successfully.") : errorResponse(res, 404, "Vector not found.");
    } catch (error) { return failure(res, error); }
};
const clearUserVectors = async (req, res) => {
    try { await clearVectors(req.user._id); return successResponse(res, 200, "All vectors cleared successfully."); }
    catch (error) { return failure(res, error); }
};
const searchVectors = async (req, res) => {
    try {
        const { vector, k = 5, metric = "cosine", algorithm = "brute-force", includeTrace = false, embeddingModel } = req.body || {};
        validateSearch(vector, k, metric, algorithm, includeTrace);
        if (embeddingModel !== undefined && (typeof embeddingModel !== "string" || !embeddingModel || embeddingModel.length > 100)) throw invalid("Invalid embedding model.");
        const records = await loadVectors(req.user._id, { dimensions: valuesOf(vector).length, embeddingModel });
        const models = new Set(records.map((v) => v.embeddingModel));
        if (models.size > 1) throw Object.assign(new Error("Select an embeddingModel; this dimension contains different embedding spaces."), { status: 409 });
        const database = new VectorDB(); records.forEach((v) => database.insert(v));
        const output = database.search(vector, k, metric, algorithm, includeTrace);
        if (includeTrace) {
            output.trace.points = records.map((v) => ({ id: v.id, values: v.values.slice(0, 2),
                metadata: { category: typeof v.metadata.category === "string" ? v.metadata.category.slice(0, 100) : "default" } }));
        }
        const data = includeTrace ? output.results : output;
        res.json({ success: true, algorithm, metric, count: data.length, data,
            ...(includeTrace ? { trace: output.trace } : {}) });
    } catch (error) { return failure(res, error); }
};

const benchmarkSearch = (req, res) => {
    const { Worker } = require("node:worker_threads");
    const worker = new Worker(require("node:path").join(__dirname, "../services/benchmark.worker.js"), {
        resourceLimits: { maxOldGenerationSizeMb: 256 }
    });
    let settled = false;
    const finish = (status, payload) => {
        if (settled) return;
        settled = true; clearTimeout(timer); worker.terminate();
        if (!res.destroyed) res.status(status).json(payload);
    };
    const timer = setTimeout(() => finish(503, { success: false, message: "Benchmark exceeded its 55-second budget." }), 55000);
    worker.once("message", (result) => finish(result.status, result.data));
    worker.once("error", () => finish(503, { success: false, message: "Benchmark failed within resource limits." }));
    worker.once("exit", () => { if (!settled) finish(503, { success: false, message: "Benchmark worker stopped." }); });
    res.once("close", () => { if (!settled) { settled = true; clearTimeout(timer); worker.terminate(); } });
};

module.exports = {
    getVectors,
    insertVector,
    deleteVectorById,
    clearUserVectors,
    searchVectors,
    benchmarkSearch
};
