const METRICS = ["cosine", "euclidean", "manhattan"];
const ALGORITHMS = ["brute-force", "kd-tree", "hnsw"];
const invalid = (message) => Object.assign(new Error(message), { status: 400 });
const valuesOf = (input) => Array.isArray(input) ? input : input?.values;
function validateValues(input, dimensions) {
    const values = valuesOf(input);
    if (!Array.isArray(values) || !values.length || values.length > 4096 ||
        !values.every((n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 1e100)) {
        throw invalid("Vectors must contain 1–4096 finite numeric values.");
    }
    if (dimensions !== undefined && values.length !== dimensions) throw invalid("Vector dimensions do not match.");
    return values;
}
function validateSearch(query, k, metric, algorithm = "brute-force", trace = false) {
    validateValues(query);
    if (!Number.isInteger(k) || k < 1 || k > 1000) throw invalid("Top-K must be an integer from 1 to 1000.");
    if (!METRICS.includes(metric)) throw invalid("Unsupported metric.");
    if (!ALGORITHMS.includes(algorithm)) throw invalid("Unsupported algorithm.");
    if (typeof trace !== "boolean") throw invalid("includeTrace must be boolean.");
}
function metadata(input = {}, strict = true) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        if (strict) throw invalid("Metadata must be an object.");
        return {};
    }
    if (strict && Object.keys(input).length > 64) throw invalid("Too many metadata fields.");
    const result = {};
    for (const [key, value] of Object.entries(input).slice(0, 64)) {
        if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key) || ["constructor", "prototype", "__proto__"].includes(key)) {
            if (strict) throw invalid("Invalid metadata key."); else continue;
        }
        if (["text", "title", "category", "documentId", "fileName", "embeddingModel"].includes(key) && typeof value !== "string") {
            if (strict) throw invalid("Metadata text fields must be strings."); else continue;
        }
        if ((typeof value === "string" && value.length <= 20000) ||
            (typeof value === "number" && Number.isFinite(value)) || typeof value === "boolean" || value === null) result[key] = value;
        else if (strict) throw invalid("Metadata values must be bounded scalars.");
    }
    if (Buffer.byteLength(JSON.stringify(result)) > 24000) { if (strict) throw invalid("Metadata is too large."); return {}; }
    return result;
}
function validateVector(vector) {
    if (!vector || typeof vector.id !== "string" || !vector.id.trim() || vector.id.length > 200) throw invalid("Invalid vector ID.");
    const model = vector.embeddingModel || vector.metadata?.embeddingModel || null;
    if (model !== null && (typeof model !== "string" || model.length > 100)) throw invalid("Invalid embedding model.");
    if (vector.embeddingModel && vector.metadata?.embeddingModel && vector.embeddingModel !== vector.metadata.embeddingModel) throw invalid("Conflicting embedding models.");
    return { id: vector.id, values: [...validateValues(vector.values)], metadata: metadata(vector.metadata),
        embeddingModel: vector.embeddingModel || vector.metadata?.embeddingModel || null };
}
module.exports = { METRICS, ALGORITHMS, invalid, valuesOf, validateValues, validateSearch, validateVector, metadata };
