const { testUri, embedding } = require("./mongo-guard");
const mongoose = require("mongoose");
const aiPath = require.resolve("../../src/services/ai.service");
require.cache[aiPath] = { id: aiPath, filename: aiPath, loaded: true, exports: { generateEmbedding: async () => embedding() } };
(async () => {
    await mongoose.connect(testUri(), { serverSelectionTimeoutMS: 5000, retryWrites: false });
    const { ingestDocument } = require("../../src/services/document.ingestion.service");
    const result = await ingestDocument({ userId: process.argv[2], text: "Concurrent synthetic evidence ".repeat(25), fileName: "concurrent.pdf" });
    console.log(JSON.stringify({ documentId: result.document.documentId, chunks: result.document.chunks.length }));
})().catch(() => { console.error("Synthetic ingestion child failed"); process.exitCode = 1; }).finally(() => mongoose.disconnect());
