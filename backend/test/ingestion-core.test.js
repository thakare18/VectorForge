const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
mongoose.connect = () => { throw new Error("No test database connections"); };
const profile = require("../src/config/embedding");
const Vector = require("../src/models/vector.model"), Document = require("../src/models/Document");
const rows = [], docs = []; let embeddingCalls = 0, failEmbeddingAt = 0, failWrite = false, uncertainWrite = false, wrongDimension = false, answer = "Grounded answer", contextSeen;
const embedding = () => [1, ...new Array(profile.dimensions - 1).fill(0)];
const get = (record, key) => key.split(".").reduce((v, part) => v?.[part], record);
const match = (record, query) => Object.entries(query).every(([key, value]) => key === "chunks.id" ? record.chunks.some((chunk) => chunk.id === value) : String(get(record, key)) === String(value));
const query = (values) => ({ sort() { return this; }, maxTimeMS() { return this; }, lean() { return this; }, async *cursor() { yield* values; } });
Vector.find = (filter) => query(rows.filter((row) => match(row, filter)));
Vector.findOneAndUpdate = async (filter, update, options = {}) => {
    if (failWrite) throw new Error("Synthetic database failure");
    let row = rows.find((item) => match(item, filter));
    if (!row && !options.upsert) return null;
    if (!row) { row = {}; rows.push(row); } Object.assign(row, structuredClone(update.$set)); return row;
};
Vector.deleteOne = async (filter) => { const index = rows.findIndex((r) => match(r, filter)); if (index < 0) return { deletedCount: 0 }; rows.splice(index, 1); return { deletedCount: 1 }; };
Vector.deleteMany = async (filter) => { for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i], filter)) rows.splice(i, 1); };
Document.find = (filter) => query(docs.filter((doc) => match(doc, filter)));
Document.findOne = (filter) => ({ lean: async () => docs.find((doc) => match(doc, filter)) || null });
Document.findOneAndUpdate = async (filter, update) => {
    if (failWrite) throw new Error("Synthetic database failure");
    let doc = docs.find((item) => match(item, filter));
    if (!doc && update.$setOnInsert) { doc = structuredClone(update.$setOnInsert); doc.createdAt = new Date(); docs.push(doc); }
    if (doc && update.$pull) { doc.chunks = doc.chunks.filter((c) => c.id !== update.$pull.chunks.id); delete doc.fingerprint; }
    if (uncertainWrite) { uncertainWrite = false; throw new Error("Synthetic lost write acknowledgment"); }
    return doc || null;
};
Document.deleteMany = async (filter) => { for (let i = docs.length - 1; i >= 0; i--) if (match(docs[i], filter)) docs.splice(i, 1); };
const aiPath = require.resolve("../src/services/ai.service");
require.cache[aiPath] = { id: aiPath, filename: aiPath, loaded: true, exports: {
    generateEmbedding: async () => { embeddingCalls++; if (embeddingCalls === failEmbeddingAt) throw new Error("Synthetic provider failure"); return wrongDimension ? [1, 0] : embedding(); },
    generateAnswer: async (context) => { contextSeen = context; return answer; },
    generateResponse: async () => answer
}};
const persistence = require("../src/services/vector.persistence.service");
const { ingestDocument } = require("../src/services/document.ingestion.service");
const { createChunks } = require("../src/services/pdf.service");
const ai = require("../src/controllers/ai.controller");
const vectors = require("../src/controllers/vector.controller");
function response() { return { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } }; }
beforeEach(() => {
    rows.length = 0; docs.length = 0; embeddingCalls = 0; failEmbeddingAt = 0; failWrite = false; uncertainWrite = false; wrongDimension = false; answer = "Grounded answer"; contextSeen = null;
});
const upload = (options = {}) => ingestDocument({ userId: "alice", text: "synthetic evidence ".repeat(50), fileName: "fixture.pdf", ...options });

test("chunking bounds and empty/scanned PDFs reject before paid embeddings", async () => {
    assert.deepEqual(createChunks("abcdef", 4, 1), ["abcd", "def"]);
    for (const args of [["x", 0, 0], ["x", 5, 5], ["x", 5, -1]]) assert.throws(() => createChunks(...args));
    for (const text of ["", " \n ", "x".repeat(100001)]) await assert.rejects(upload({ text }));
    assert.equal(embeddingCalls, 0); assert.equal(docs.length, 0);
});
test("embedding failure and wrong model dimensions never publish partial chunks", async () => {
    failEmbeddingAt = 2;
    await assert.rejects(upload());
    assert.equal(docs.length, 0); assert.equal((await persistence.loadVectors("alice")).length, 0);
    failEmbeddingAt = 0; wrongDimension = true;
    await assert.rejects(upload());
    assert.equal(docs.length, 0);
});
test("database failure produces no ghosts; successful retry publishes one complete document", async () => {
    failWrite = true; await assert.rejects(upload());
    assert.equal((await persistence.loadVectors("alice")).length, 0);
    failWrite = false; const result = await upload();
    assert.equal(result.document.chunks.length, 3); assert.equal(docs.length, 1);
    assert.equal((await persistence.loadVectors("alice")).length, 3);
});
test("retry after lost acknowledgment and concurrent duplicate uploads is idempotent", async () => {
    uncertainWrite = true; await assert.rejects(upload());
    assert.equal(docs.length, 1); assert.equal(docs[0].chunks.length, 3);
    const calls = embeddingCalls; const retried = await upload();
    assert.equal(retried.duplicate, true); assert.equal(embeddingCalls, calls);
    docs.length = 0;
    const concurrent = await Promise.all([upload(), upload()]);
    assert.equal(docs.length, 1); assert.equal(concurrent[0].document.documentId, concurrent[1].document.documentId);
    assert.equal((await persistence.loadVectors("alice")).length, 3);
});
test("document deduplication and retrieval are owner-scoped", async () => {
    const a = await upload(), b = await upload({ userId: "bob", text: "Bob private text" });
    assert.notEqual(a.document.documentId, b.document.documentId);
    const alice = await persistence.loadVectors("alice"); assert.equal(alice.length, 3);
    assert.ok(alice.every((v) => !v.metadata.text.includes("Bob")));
    assert.equal((await persistence.deleteVector(b.document.chunks[0].id, "alice")).deletedCount, 0);
    assert.equal((await persistence.loadVectors("bob")).length, 1);
});
test("fresh Mongo snapshots reflect inserts, updates, external changes, deletes, clear and restart", async () => {
    await persistence.saveVector({ id: "a", values: [1, 0] }, "alice");
    assert.equal((await persistence.loadVectors("alice"))[0].values[0], 1);
    await persistence.saveVector({ id: "a", values: [2, 0] }, "alice");
    assert.equal(rows.length, 1); assert.equal((await persistence.loadVectors("alice"))[0].values[0], 2);
    rows[0].values[0] = 3;
    delete require.cache[require.resolve("../src/services/vector.persistence.service")];
    const restarted = require("../src/services/vector.persistence.service");
    assert.equal((await restarted.loadVectors("alice"))[0].values[0], 3);
    await persistence.deleteVector("a", "alice"); assert.equal((await persistence.loadVectors("alice")).length, 0);
    await upload(); await upload({ userId: "bob" }); await persistence.clearVectors("alice");
    assert.equal((await persistence.loadVectors("alice")).length, 0); assert.equal((await persistence.loadVectors("bob")).length, 3);
});
test("failed upsert does not contaminate search and duplicate ID keeps one record", async () => {
    failWrite = true;
    const res = response(); await vectors.insertVector({ user: { _id: "alice" }, body: { id: "ghost", values: [1, 0] } }, res);
    assert.equal(res.code, 503); assert.equal(rows.length, 0);
    failWrite = false;
    for (let i = 0; i < 2; i++) await persistence.saveVector({ id: "one", values: [i + 1, 0] }, "alice");
    const found = response(); await vectors.searchVectors({ user: { _id: "alice" }, body: { vector: [1, 0], algorithm: "hnsw" } }, found);
    assert.equal(found.code, 200); assert.equal(found.data.count, 1); assert.equal(found.data.data[0].id, "one");
});
test("metadata schema rejects unsafe new inputs and sanitizes existing legacy values", async () => {
    for (const metadata of [{ text: {} }, { title: [] }, { nested: {} }, { text: "a".repeat(20001) }]) await assert.rejects(persistence.saveVector({ id: "bad", values: [1], metadata }, "alice"));
    rows.push({ userId: "alice", vectorId: "legacy", values: [1], metadata: { text: {}, title: 123, category: ["bad"], other: "safe" } });
    const result = await persistence.listVectors("alice");
    assert.deepEqual(result.data[0].metadata, { other: "safe" });
    rows.push({ userId: "alice", vectorId: "malformed", values: [NaN], metadata: {} });
    const counted = await persistence.listVectors("alice");
    assert.equal(counted.statistics.invalidVectors, 1); assert.equal(rows.length, 2);
});
test("pagination preserves contiguous results and truthful document/chunk/model statistics", async () => {
    await persistence.saveVector({ id: "manual", values: [1, 0] }, "alice");
    const uploaded = await upload();
    const page = await persistence.listVectors("alice", { offset: 0, limit: 2 });
    assert.equal(page.statistics.totalVectors, 4); assert.equal(page.statistics.totalChunks, 3); assert.equal(page.statistics.totalDocuments, 1);
    assert.equal(page.recentUploads[0].name, "fixture.pdf"); assert.equal(page.pagination.hasMore, true);
    const next = await persistence.listVectors("alice", { offset: 2, limit: 2 });
    assert.equal(new Set([...page.data, ...next.data].map((v) => v.id)).size, 4);
    assert.equal(next.pagination.hasMore, false);
    await persistence.deleteVector(uploaded.document.chunks[0].id, "alice");
    assert.equal((await persistence.listVectors("alice")).statistics.totalChunks, 2);
    assert.equal(docs[0].fingerprint, undefined);
    await assert.rejects(persistence.listVectors("alice", { limit: 501 }));
});
test("response component budget is paginated without gaps and search memory limit fails explicitly", async () => {
    for (let i = 0; i < 40; i++) rows.push({ userId: "alice", vectorId: String(i), values: embedding(), metadata: {} });
    const first = await persistence.listVectors("alice", { limit: 100 });
    assert.equal(first.data.length, 32);
    const second = await persistence.listVectors("alice", { limit: 100, offset: first.data.length });
    assert.equal(second.data.length, 8);
    assert.deepEqual([...first.data, ...second.data].map((v) => v.id), rows.map((v) => v.vectorId));
    for (let i = 40; i < 660; i++) rows.push({ userId: "alice", vectorId: String(i), values: embedding(), metadata: {} });
    await assert.rejects(persistence.loadVectors("alice"), (error) => error.status === 413);
});
test("search API validates parameters, dimensions and mixed embedding spaces", async () => {
    await persistence.saveVector({ id: "a", values: [1, 0], embeddingModel: "model-a" }, "alice");
    await persistence.saveVector({ id: "b", values: [0, 1], embeddingModel: "model-b" }, "alice");
    for (const body of [{ vector: [1, 0], k: 0 }, { vector: [1, 0], metric: "unknown" }, { vector: [1, 0], includeTrace: "false" }, { vector: [1] }]) {
        const res = response(); await vectors.searchVectors({ user: { _id: "alice" }, body }, res); assert.equal(res.code, 400);
    }
    const mixed = response(); await vectors.searchVectors({ user: { _id: "alice" }, body: { vector: [1, 0] } }, mixed); assert.equal(mixed.code, 409);
    const selected = response(); await vectors.searchVectors({ user: { _id: "alice" }, body: { vector: [1, 0], embeddingModel: "model-a" } }, selected);
    assert.equal(selected.data.count, 1); assert.equal(selected.data.data[0].id, "a");
});
test("PDF-to-RAG pipeline retrieves fresh persisted owner chunks with the unchanged 0.60 threshold", async () => {
    await upload({ text: "Alice evidence only" }); await upload({ userId: "bob", text: "Bob private evidence" });
    const res = response(); await ai.ragChat({ user: { _id: "alice" }, body: { question: "What evidence?", userId: "bob" } }, res);
    assert.equal(res.code, 200); assert.equal(res.data.answer, "Grounded answer");
    assert.equal(contextSeen, "Alice evidence only"); assert.equal(res.data.similarityThreshold, 0.6);
    assert.equal(res.data.retrievedChunks, 1); assert.ok(res.data.sources[0].id.startsWith("doc:"));
});
test("RAG handles empty retrieval, unknown provenance, empty output and explicit thresholds truthfully", async () => {
    let res = response(); await ai.ragChat({ user: { _id: "alice" }, body: { question: "Empty?" } }, res);
    assert.equal(res.data.retrievedChunks, 0);
    rows.push({ userId: "alice", vectorId: "legacy", values: embedding(), metadata: { text: "Unknown provenance" } });
    res = response(); await ai.ragChat({ user: { _id: "alice" }, body: { question: "Legacy?" } }, res); assert.equal(res.code, 409); assert.equal(rows.length, 1);
    rows.length = 0;
    const values = embedding(); values[0] = 0.7; values[1] = Math.sqrt(1 - 0.49);
    rows.push({ userId: "alice", vectorId: "known", values, embeddingModel: profile.model, metadata: { text: "Known evidence" } });
    res = response(); await ai.ragChat({ user: { _id: "alice" }, body: { question: "Strict?", similarityThreshold: 0.8 } }, res); assert.equal(res.data.retrievedChunks, 0);
    answer = ""; res = response(); await ai.ragChat({ user: { _id: "alice" }, body: { question: "Default?" } }, res); assert.equal(res.code, 502); assert.equal(res.data.success, false);
    res = response(); await ai.ragChat({ user: { _id: "alice" }, body: { question: "Bad?", similarityThreshold: { $gt: 0 } } }, res); assert.equal(res.code, 400);
});

test("malformed legacy identifiers and model metadata are quarantined without deleting data", async () => {
    rows.push({ userId: "alice", vectorId: null, values: [1], metadata: {} });
    rows.push({ userId: "alice", vectorId: "safe", values: [1], embeddingModel: {}, metadata: { embeddingModel: [] } });
    const page = await persistence.listVectors("alice");
    assert.equal(page.statistics.invalidVectors, 1); assert.equal(page.data[0].embeddingModel, null);
    assert.equal((await persistence.loadVectors("alice")).length, 1); assert.equal(rows.length, 2);
    rows.push({ userId: "alice", vectorId: "doc:legacy-id", values: [1], metadata: {} });
    await persistence.saveVector({ id: "doc:legacy-id", values: [2] }, "alice");
    assert.equal(rows.at(-1).values[0], 2);
    assert.equal((await persistence.deleteVector("doc:legacy-id", "alice")).deletedCount, 1);
    const doc = await upload();
    await assert.rejects(persistence.saveVector({ id: doc.document.chunks[0].id, values: [1] }, "alice"), (error) => error.status === 409);
});

test("actual Mongoose schema preserves complete atomic document payload and deduplication indexes", async () => {
    const payload = { userId: new mongoose.Types.ObjectId(), documentId: "synthetic-document", fingerprint: "a".repeat(64), fileName: "fixture.pdf", embeddingModel: profile.model, dimensions: profile.dimensions, profile: profile.profile,
        chunks: [{ id: "doc:synthetic-document:1", values: embedding(), metadata: { text: "synthetic", documentId: "synthetic-document" } }] };
    await new Document(payload).validate();
    const q = new mongoose.Query({}, {}, Document, Document.collection);
    q.findOneAndUpdate({ userId: payload.userId, fingerprint: payload.fingerprint }, { $setOnInsert: payload }, { upsert: true, runValidators: true });
    const filter = q.cast(Document), update = q._castUpdate(q.getUpdate());
    assert.equal(String(filter.userId), String(payload.userId)); assert.equal(filter.fingerprint, payload.fingerprint);
    assert.equal(update.$setOnInsert.chunks.length, 1); assert.equal(update.$setOnInsert.chunks[0].values.length, profile.dimensions);
    assert.equal(update.$setOnInsert.profile, profile.profile);
    const indexes = Document.schema.indexes();
    assert.ok(indexes.some(([keys, options]) => keys.userId === 1 && keys.fingerprint === 1 && options.unique && options.partialFilterExpression.fingerprint.$type === "string"));
});
