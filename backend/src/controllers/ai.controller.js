const { generateResponse, generateEmbedding, generateAnswer } = require("../services/ai.service");
const { loadVectors } = require("../services/vector.persistence.service");
const bruteForce = require("../algorithms/bruteForce");
const profile = require("../config/embedding");
const { validateValues } = require("../validators/vector.contract");
const input = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 16000;
const fail = (res, error) => res.status(error?.status === 413 ? 413 : 502).json({ success: false,
    message: error?.status === 413 ? "Search dataset exceeds the in-process search budget." : "AI service temporarily unavailable or returned no usable output." });
const usable = (text) => typeof text === "string" && Boolean(text.trim());
const chat = async (req, res) => {
    if (!input(req.body?.prompt)) return res.status(400).json({ success: false, message: "A prompt of up to 16000 characters is required." });
    try {
        const answer = await generateResponse(req.body.prompt.trim(), { signal: AbortSignal.timeout(45000) });
        if (!usable(answer)) return fail(res);
        res.json({ success: true, answer });
    } catch (error) { return fail(res, error); }
};
const embed = async (req, res) => {
    if (!input(req.body?.text)) return res.status(400).json({ success: false, message: "Text of up to 16000 characters is required." });
    try {
        const embedding = await generateEmbedding(req.body.text.trim(), { signal: AbortSignal.timeout(45000) });
        validateValues(embedding, profile.dimensions);
        res.json({ success: true, dimensions: embedding.length, embeddingModel: profile.model, profile: profile.profile, embedding });
    } catch (error) { return fail(res, error); }
};
const ragChat = async (req, res) => {
    const threshold = req.body?.similarityThreshold ?? 0.6;
    if (!input(req.body?.question) || typeof threshold !== "number" || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
        return res.status(400).json({ success: false, message: "A question and a numeric similarityThreshold from 0 to 1 are required." });
    }
    try {
        const signal = AbortSignal.timeout(45000), question = req.body.question.trim();
        const query = await generateEmbedding(question, { signal }); validateValues(query, profile.dimensions);
        const records = await loadVectors(req.user._id);
        const compatible = records.filter((v) => v.values.length === profile.dimensions && v.embeddingModel === profile.model && (!v.profile || v.profile === profile.profile));
        const excludedVectors = records.length - compatible.length;
        if (records.length && !compatible.length) return res.status(409).json({ success: false,
            message: "No compatible document embeddings. Verify legacy model metadata or re-upload documents; existing data has been preserved.", excludedVectors });
        const results = bruteForce.search(compatible, query, 5, "cosine").filter((v) => v.score >= threshold && typeof v.metadata?.text === "string");
        const common = { success: true, similarityThreshold: threshold, excludedVectors, embeddingModel: profile.model };
        if (!results.length) return res.json({ ...common, retrievedChunks: 0, sources: [], answer: "I couldn't find the answer in the uploaded document." });
        const context = results.map((v) => v.metadata.text).join("\n\n").slice(0, 20000);
        const answer = await generateAnswer(context, question, { signal });
        if (!usable(answer)) return fail(res);
        res.json({ ...common, retrievedChunks: results.length, sources: results.map((v) => ({ id: v.id, score: Number(v.score.toFixed(4)) })), answer });
    } catch (error) { return fail(res, error); }
};
module.exports = { chat, embed, ragChat };
