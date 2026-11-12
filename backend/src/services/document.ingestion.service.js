const crypto = require("crypto");
const profile = require("../config/embedding");
const { generateEmbedding } = require("./ai.service");
const { createChunks } = require("./pdf.service");
const { findDocument, saveDocument } = require("./vector.persistence.service");
const { validateValues, invalid } = require("../validators/vector.contract");
async function ingestDocument({ userId, text, fileName = "Document.pdf", signal }) {
    if (typeof text !== "string" || !text.trim()) throw invalid("PDF contains no extractable text. Scanned PDFs require OCR before upload.");
    const normalized = text.replace(/\r\n/g, "\n").trim();
    if (normalized.length > 100000) throw invalid("PDF exceeds the 250-chunk processing budget.");
    const chunks = createChunks(normalized);
    if (!chunks.length || chunks.length > 250) throw invalid("PDF exceeds the 250-chunk processing budget.");
    const fingerprint = crypto.createHash("sha256").update(profile.profile + ":chunk500-overlap100-v1:" + normalized).digest("hex");
    const existing = await findDocument(userId, fingerprint);
    if (existing) return { document: existing, duplicate: true };
    const documentId = crypto.randomUUID(), embedded = [];
    for (let index = 0; index < chunks.length; index++) {
        signal?.throwIfAborted();
        const values = await generateEmbedding(chunks[index], { signal });
        validateValues(values, profile.dimensions);
        embedded.push({ id: `doc:${documentId}:${index + 1}`, values,
            metadata: { text: chunks[index], documentId, chunkIndex: index + 1, fileName: String(fileName).slice(0, 200), embeddingModel: profile.model } });
    }
    signal?.throwIfAborted();
    // One MongoDB document commit: neither partial chunks nor index ghosts can become visible.
    const document = await saveDocument({ userId, documentId, fingerprint, fileName: String(fileName).slice(0, 200),
        embeddingModel: profile.model, dimensions: profile.dimensions, profile: profile.profile, chunks: embedded });
    if (!document) throw new Error("Document commit failed");
    return { document, duplicate: document.documentId !== documentId };
}
module.exports = { ingestDocument };
