const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const crypto = require("node:crypto");
const { testUri, embedding } = require("../helpers/mongo-guard");
const uri = testUri(); // Never uses MONGODB_URI or dotenv for selecting a test database.
Object.assign(process.env, { NODE_ENV: "test", MONGODB_URI: uri, GEMINI_API_KEY: "synthetic", JWT_SECRET: "synthetic-secret-test-only-more-than-32-bytes",
    FRONTEND_URL: "http://frontend.test", BACKEND_URL: "", TRUST_PROXY_HOPS: "0",
    GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", GOOGLE_CALLBACK_URL: "", GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: "", GITHUB_CALLBACK_URL: "",
    SMTP_HOST: "smtp.invalid", SMTP_PORT: "465", SMTP_USER: "synthetic@example.test", SMTP_PASSWORD: "synthetic" });
const mongoose = require("mongoose");
const User = require("../../src/models/User"), Document = require("../../src/models/Document"), Vector = require("../../src/models/vector.model");
const Grant = require("../../src/models/AuthGrant"), Rate = require("../../src/models/RateBucket");
const mails = []; let receivedContext;
require("nodemailer").createTransport = () => ({ sendMail: async (mail) => { mails.push(mail); return { accepted: [mail.to], rejected: [] }; } });
const aiPath = require.resolve("../../src/services/ai.service");
require.cache[aiPath] = { id: aiPath, filename: aiPath, loaded: true, exports: {
    generateEmbedding: async () => embedding(), generateResponse: async () => "Synthetic answer",
    generateAnswer: async (context) => { receivedContext = context; return "Synthetic grounded answer"; }
} };
const persistence = require("../../src/services/vector.persistence.service");
const { ingestDocument } = require("../../src/services/document.ingestion.service");
const { signToken, hash } = require("../../src/security/auth");
const { makePDF } = require("../helpers/pdf-fixture");
const app = require("../../src/app");
const alice = new mongoose.Types.ObjectId(), bob = new mongoose.Types.ObjectId();
let server, base;
before(async () => {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, retryWrites: false, autoIndex: true });
    await Promise.all([User, Document, Vector, Grant, Rate].map((m) => m.init()));
    app.locals.ready = true;
    server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    base = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
    if (server) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
    // Drop only the explicitly selected, unique disposable database.
    if (mongoose.connection.readyState === 1) {
        assert.match(mongoose.connection.name, /^vf_phase3_[a-f0-9]+$/);
        await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
});
const response = () => ({ code: 200, status(c) { this.code = c; return this; }, json(v) { this.data = v; return this; } });
const child = (owner) => new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(__dirname, "../helpers/ingest-process.js"), String(owner)], { env: process.env, windowsHide: true });
    let output = ""; proc.stdout.on("data", (data) => { output += data; }); proc.stderr.resume();
    proc.once("error", reject); proc.once("exit", (code) => code ? reject(new Error("Child exited " + code)) : resolve(JSON.parse(output.trim())));
});
async function request(route, body, token) {
    const res = await fetch(base + route, { method: body === undefined ? "GET" : "POST",
        headers: { ...(token ? { Authorization: "Bearer " + token } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
        body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, data: await res.json() };
}
test("two independent Node processes ingest one complete document; restart preserves owner data", async () => {
    const results = await Promise.all([child(alice), child(alice)]);
    assert.equal(results[0].documentId, results[1].documentId);
    assert.equal(await Document.countDocuments({ userId: alice }), 1);
    const doc = await Document.findOne({ userId: alice }).lean();
    assert.equal(doc.chunks.length, results[0].chunks);
    assert.ok(doc.chunks.every((c) => c.values.length === 3072));
    assert.equal((await persistence.loadVectors(bob)).length, 0);
    await mongoose.disconnect(); await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, retryWrites: false });
    assert.equal((await persistence.loadVectors(alice)).length, doc.chunks.length);
    assert.equal((await persistence.listVectors(alice)).statistics.totalDocuments, 1);
});
test("real MongoDB write rejection publishes no partial document and retry succeeds", async () => {
    const admin = mongoose.connection.db.admin();
    await admin.command({ configureFailPoint: "failCommand", mode: { times: 1 }, data: { failCommands: ["findAndModify"], errorCode: 11600 } });
    try {
        await assert.rejects(ingestDocument({ userId: bob, text: "Synthetic write rejection evidence", fileName: "failure.pdf" }));
        assert.equal(await Document.countDocuments({ userId: bob }), 0);
    } finally { await admin.command({ configureFailPoint: "failCommand", mode: "off" }); }
    await ingestDocument({ userId: bob, text: "Synthetic write rejection evidence", fileName: "failure.pdf" });
    assert.equal(await Document.countDocuments({ userId: bob }), 1);
});
test("uncertain acknowledgment over a real committed MongoDB write is idempotent", async () => {
    const original = Document.findOneAndUpdate; let once = true;
    Document.findOneAndUpdate = async function (...args) {
        const saved = await original.apply(this, args);
        if (once) { once = false; throw new Error("Synthetic lost acknowledgment"); } return saved;
    };
    try { await assert.rejects(ingestDocument({ userId: bob, text: "Uncertain synthetic acknowledgment", fileName: "uncertain.pdf" })); }
    finally { Document.findOneAndUpdate = original; }
    const retried = await ingestDocument({ userId: bob, text: "Uncertain synthetic acknowledgment", fileName: "uncertain.pdf" });
    assert.equal(retried.duplicate, true);
    assert.equal(await Document.countDocuments({ userId: bob, fingerprint: retried.document.fingerprint }), 1);
});
test("real MongoDB reset consumption, token revocation, grants and distributed rate increments are atomic", async () => {
    const token = crypto.randomBytes(32).toString("hex");
    const user = await User.create({ email: "reset@example.test", password: "synthetic-old-hash", resetPasswordTokenHash: hash(token), resetPasswordExpires: new Date(Date.now() + 60000) });
    const oldJWT = signToken(user), auth = require("../../src/controllers/auth.controller");
    const a = response(), b = response();
    await Promise.all([auth.resetPassword({ body: { token, password: "SyntheticPass123" } }, a), auth.resetPassword({ body: { token, password: "SyntheticPass123" } }, b)]);
    assert.deepEqual([a.code, b.code].sort(), [200, 400]);
    assert.equal((await User.findById(user._id)).tokenVersion, 1);
    assert.equal((await request("/api/auth/me", undefined, oldJWT)).status, 401);
    const id = hash("synthetic-grant"); await Grant.create({ _id: id, kind: "oauth-exchange", expiresAt: new Date(Date.now() + 60000) });
    const grants = await Promise.all([Grant.findOneAndDelete({ _id: id }), Grant.findOneAndDelete({ _id: id })]); assert.equal(grants.filter(Boolean).length, 1);
    const { limit } = require("../../src/middleware/rateLimiter"); const codes = [];
    await Promise.all(Array.from({ length: 8 }, () => {
        const res = { set() {}, status(code) { codes.push(code); return this; }, json() {} };
        return limit("integration-shared", 3)({ ip: "127.0.0.1" }, res, () => codes.push(200));
    }));
    assert.equal(codes.filter((c) => c === 200).length, 3); assert.equal(codes.filter((c) => c === 429).length, 5);
});
test("HTTP registration, verification, login, real PDF parse/persistence, mocked RAG and ownership work together", async () => {
    const registered = await request("/api/auth/register", { name: "Synthetic E2E", email: "journey@example.test", password: "SyntheticPass123" }); assert.equal(registered.status, 202);
    for (let attempt = 0; attempt < 50 && !mails.length; attempt++) await new Promise((r) => setTimeout(r, 20));
    assert.equal(mails.length, 1);
    const verifyToken = new URL(mails[0].text.match(/http[^\s]+/)[0]).searchParams.get("verification");
    assert.equal((await request("/api/auth/verify-email", { token: verifyToken })).status, 200);
    const login = await request("/api/auth/login", { email: "journey@example.test", password: "SyntheticPass123" }); assert.equal(login.status, 200);
    const token = login.data.token;
    const form = new FormData(); form.append("pdf", new Blob([makePDF("Synthetic journey evidence only")], { type: "application/pdf" }), "fixture.pdf");
    const uploaded = await fetch(base + "/api/pdf/upload", { method: "POST", headers: { Authorization: "Bearer " + token }, body: form });
    assert.equal(uploaded.status, 200); const result = await uploaded.json(); assert.equal(result.totalChunks, 1);
    const page = await request("/api/vectors", undefined, token); assert.equal(page.data.statistics.totalDocuments, 1);
    const rag = await request("/api/ai/rag", { question: "What evidence?", userId: String(bob) }, token);
    assert.equal(rag.status, 200); assert.equal(rag.data.retrievedChunks, 1); assert.match(receivedContext, /Synthetic journey evidence only/);
    assert.doesNotMatch(receivedContext, /write rejection/);
    for (const algorithm of ["brute-force", "kd-tree", "hnsw"]) {
        const result = await request("/api/vectors/search", { vector: embedding(), embeddingModel: "gemini-embedding-001", algorithm, metric: "cosine", k: 1 }, token);
        assert.equal(result.status, 200); assert.equal(result.data.count, 1);
    }
    const other = await User.create({ email: "other-journey@example.test" });
    const denied = await fetch(base + "/api/vectors/" + encodeURIComponent(rag.data.sources[0].id), { method: "DELETE", headers: { Authorization: "Bearer " + signToken(other) } });
    assert.equal(denied.status, 404);
    const removed = await fetch(base + "/api/vectors/" + encodeURIComponent(rag.data.sources[0].id), { method: "DELETE", headers: { Authorization: "Bearer " + token } });
    assert.equal(removed.status, 200); assert.equal((await request("/api/vectors", undefined, token)).data.statistics.totalChunks, 0);
    assert.equal((await request("/health")).status, 200); assert.equal((await request("/ready")).status, 200);
});
test("read-only inventory reports missing provenance and duplicates without changing synthetic records", async () => {
    // Separate legacy collection in this disposable database has its unique index deliberately removed for fixture setup.
    await Vector.collection.dropIndex("userId_1_vectorId_1");
    await Vector.collection.insertMany([{ userId: alice, vectorId: "duplicate", values: [1, 2], metadata: { documentId: "old" } },
        { userId: alice, vectorId: "duplicate", values: [1, 2], metadata: { documentId: "old" } }]);
    const before = await Vector.collection.countDocuments();
    const result = await require("../../src/scripts/inventoryLegacy").inventory(mongoose.connection.db);
    assert.equal(result.vectors.missingModel, 2); assert.equal(result.vectors.duplicateGroups, 1);
    assert.equal(result.vectors.missingProfile, 2); assert.equal(result.vectors.incompatibleDimensions, 2);
    assert.equal(await Vector.collection.countDocuments(), before);
});
