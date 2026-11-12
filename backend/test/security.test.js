const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
Object.assign(process.env, {
    NODE_ENV: "test", GEMINI_API_KEY: "synthetic-test", MONGODB_URI: "mongodb://127.0.0.1/never-connect",
    JWT_SECRET: "synthetic-test-secret-not-a-real-key-000000", FRONTEND_URL: "http://frontend.test",
    GOOGLE_CLIENT_ID: "synthetic-google", GOOGLE_CLIENT_SECRET: "synthetic-google-secret",
    GOOGLE_CALLBACK_URL: "http://backend.test/api/auth/google/callback",
    GITHUB_CLIENT_ID: "synthetic-github", GITHUB_CLIENT_SECRET: "synthetic-github-secret",
    GITHUB_CALLBACK_URL: "http://backend.test/api/auth/github/callback", TRUST_PROXY_HOPS: "0",
    SMTP_HOST: "smtp.invalid", SMTP_PORT: "465", SMTP_USER: "test@example.test", SMTP_PASSWORD: "synthetic"
});
const mongoose = require("mongoose");
mongoose.connect = () => { throw new Error("Tests must never connect to a database"); };
const User = require("../src/models/User"), Grant = require("../src/models/AuthGrant"), Rate = require("../src/models/RateBucket");
const documentRecords = [];
const embedding = () => [1, ...new Array(3071).fill(0)];
const users = [], grants = new Map(), buckets = new Map(), mails = [], vectorRecords = [];
let googlePayload, providerResponses, aiCalls, dbDown, queryCount, receivedContext, mailWait, mailFailure;
const get = (value, key) => key.split(".").reduce((o, part) => o?.[part], value);
const matches = (doc, query) => Object.entries(query).every(([key, value]) => {
    if (key === "$or") return value.some((q) => matches(doc, q));
    const actual = get(doc, key);
    if (value && typeof value === "object" && !(value instanceof Date)) {
        if ("$gt" in value) return actual != null && new Date(actual) > value.$gt;
        if ("$type" in value) return typeof actual === value.$type;
        if ("$exists" in value) return (actual !== undefined) === value.$exists;
    }
    return String(actual) === String(value);
});
const update = (doc, change) => {
    for (const [key, value] of Object.entries(change.$set || {})) {
        const parts = key.split("."); let target = doc;
        while (parts.length > 1) { const part = parts.shift(); target = target[part] ||= {}; }
        target[parts[0]] = value;
    }
    for (const [key, value] of Object.entries(change.$inc || {})) doc[key] = (doc[key] || 0) + value;
    return doc;
};
User.findOne = async (q) => { queryCount++; return users.find((u) => matches(u, q)) || null; };
User.findById = async (id) => { if (dbDown) throw new Error("synthetic DB failure"); return users.find((u) => String(u._id) === String(id)) || null; };
User.findOneAndUpdate = async (q, change) => {
    queryCount++;
    const user = users.find((u) => matches(u, q));
    return user ? update(user, change) : null;
};
User.create = async (data) => {
    if (users.some((u) => u.email === data.email)) throw Object.assign(new Error("duplicate"), { code: 11000 });
    const user = { _id: crypto.randomBytes(12).toString("hex"), tokenVersion: 0, emailVerified: false, ...data };
    users.push(user); return user;
};
Grant.create = async (data) => { grants.set(data._id, structuredClone(data)); return data; };
Grant.findOne = async (q) => { const grant = Array.from(grants.values()).find((g) => matches(g, q)); return grant ? structuredClone(grant) : null; };
Grant.findOneAndDelete = async (q) => {
    const grant = grants.get(q._id);
    if (!grant || !matches(grant, q)) return null;
    grants.delete(q._id); return grant;
};
Rate.findOneAndUpdate = async (q, change) => {
    if (dbDown) throw new Error("synthetic DB failure");
    let bucket = buckets.get(q._id);
    if (!bucket) { bucket = { count: 0, ...change.$setOnInsert }; buckets.set(q._id, bucket); }
    bucket.count += change.$inc.count;
    return { ...bucket };
};
require("nodemailer").createTransport = () => ({ sendMail: async (mail) => { mails.push(mail); if (mailFailure) throw new Error("Synthetic SMTP failure"); if (mailWait) await mailWait; return { accepted: [mail.to], rejected: [] }; } });
const { OAuth2Client } = require("google-auth-library");
OAuth2Client.prototype.getToken = async ({ codeVerifier }) => { assert.match(codeVerifier, /^[a-f0-9]{64}$/); return { tokens: { id_token: "synthetic" } }; };
OAuth2Client.prototype.verifyIdToken = async () => ({ getPayload: () => googlePayload });
const aiPath = require.resolve("../src/services/ai.service");
require.cache[aiPath] = { id: aiPath, filename: aiPath, loaded: true, exports: {
    generateResponse: async () => { aiCalls++; return "Synthetic answer"; },
    generateEmbedding: async () => { aiCalls++; return embedding(); },
    generateAnswer: async (context) => { aiCalls++; receivedContext = context; return "Scoped answer"; }
}};
const Vector = require("../src/models/vector.model");
const cursorQuery = (rows) => ({ sort() { return this; }, maxTimeMS() { return this; }, lean() { return this; }, async *cursor() { yield* rows; } });
Vector.find = (query) => cursorQuery(vectorRecords.filter((v) => matches(v, query)));
const Document = require("../src/models/Document");
Document.find = (query) => cursorQuery(documentRecords.filter((v) => matches(v, query)));
Document.findOne = (query) => ({ lean: async () => documentRecords.find((v) => matches(v, query)) || null });
Document.findOneAndUpdate = async (query, update) => {
    let doc = documentRecords.find((v) => matches(v, query));
    if (!doc && update.$setOnInsert) { doc = structuredClone(update.$setOnInsert); documentRecords.push(doc); }
    return doc || null;
};
Vector.deleteOne = async (query) => {
    const index = vectorRecords.findIndex((v) => matches(v, query));
    if (index < 0) return { deletedCount: 0 };
    vectorRecords.splice(index, 1); return { deletedCount: 1 };
};
Vector.findOneAndUpdate = async (query, data, options = {}) => {
    let vector = vectorRecords.find((v) => matches(v, query));
    if (!vector && !options.upsert) return null;
    if (vector) Object.assign(vector, data.$set); else { vector = data.$set; vectorRecords.push(vector); }
    return vector;
};
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
    if (String(url).startsWith("http://127.0.0.1:")) return originalFetch(url, options);
    assert.ok(String(url).startsWith("https://github.com/") || String(url).startsWith("https://api.github.com/"));
    const item = providerResponses.shift();
    if (!item) throw new Error("Unexpected external request blocked");
    return { ok: item.status >= 200 && item.status < 300, json: async () => item.data };
};
// Parser and filesystem mocked: no uploaded file or production PDF is touched.
let parsedText = "Synthetic document", removedPaths = [], pdfSignature = "%PDF-", parserFailure = false;
const pdfService = require("../src/services/pdf.service");
pdfService.extractText = async () => { if (parserFailure) throw new Error("Synthetic parser failure with private text"); return parsedText; };
const fsPromises = require("node:fs/promises");
const originalOpen = fsPromises.open, originalUnlink = fsPromises.unlink;
fsPromises.open = async (filename, ...args) => filename === "synthetic-pdf"
    ? { read: async (buffer) => Buffer.from(pdfSignature).copy(buffer), close: async () => {} }
    : originalOpen(filename, ...args);
fsPromises.unlink = async (filename) => { if (filename === "synthetic-pdf") { removedPaths.push(filename); return; } return originalUnlink(filename); };
const app = require("../src/app");
const { hash, signToken } = require("../src/security/auth");
const bcrypt = require("bcryptjs"), jwt = require("jsonwebtoken");
let server, base;
before(async () => { server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); }); base = "http://127.0.0.1:" + server.address().port; });
after(async () => { global.fetch = originalFetch; fsPromises.open = originalOpen; fsPromises.unlink = originalUnlink; await new Promise((resolve) => server.close(resolve)); });
beforeEach(() => {
    mailFailure = false; mailWait = null;
    users.length = 0; grants.clear(); buckets.clear(); mails.length = 0; vectorRecords.length = 0; documentRecords.length = 0;
    parsedText = "Synthetic document"; parserFailure = false; removedPaths = []; pdfSignature = "%PDF-"; aiCalls = 0; dbDown = false; queryCount = 0; receivedContext = "";
    googlePayload = { sub: "google-123", email: "owner@example.test", email_verified: true, name: "Owner" };
    providerResponses = [
        { status: 200, data: { access_token: "synthetic" } },
        { status: 200, data: { id: 123, login: "owner" } },
        { status: 200, data: [{ email: "owner@example.test", primary: true, verified: true }] }
    ];
});
async function request(path, body, headers = {}, method) {
    const response = await fetch(base + path, { method: method || (body === undefined ? "GET" : "POST"),
        headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
        body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
    const raw = await response.text();
    let data; try { data = JSON.parse(raw); } catch { data = raw; }
    return { status: response.status, data, headers: response.headers };
}
async function localUser(extra = {}) {
    return User.create({ name: "Synthetic", email: "owner@example.test", provider: "local", password: await bcrypt.hash("TestPass123", 4), ...extra });
}
async function begin(provider = "google", verifier = "a".repeat(64)) {
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    const response = await request("/api/auth/" + provider + "?challenge=" + challenge);
    assert.equal(response.status, 302);
    const url = new URL(response.headers.get("location"));
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    const cookie = response.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/i); assert.match(cookie, /SameSite=Lax/i);
    return { state: url.searchParams.get("state"), cookie: cookie.split(";")[0], verifier };
}
async function callback(provider, flow, query = "") {
    return request(`/api/auth/${provider}/callback?code=synthetic-code&state=${flow.state}${query}`, undefined, { Cookie: flow.cookie });
}
const failureRedirect = (r) => { assert.equal(r.status, 302); assert.equal(r.headers.get("location"), "http://frontend.test/oauth/callback?error=authentication_failed"); };

test("reset rejects missing, malformed, object and array tokens before any User query", async () => {
    for (const token of [undefined, "", "x", "g".repeat(64), { $ne: null }, ["a".repeat(64)]]) {
        assert.equal((await request("/api/auth/reset-password", { token, password: "TestPass123" })).status, 400);
    }
    assert.equal(queryCount, 0);
});
test("reset token hash at rest, account binding, expiry, one-time use and JWT revocation", async () => {
    const user = await localUser();
    const other = await User.create({ email: "other@example.test", password: "unchanged" });
    const oldJWT = signToken(user);
    const sent = await request("/api/auth/forgot-password", { email: user.email });
    assert.equal(sent.status, 200);
    const token = new URL(mails[0].text.match(/http[^\s]+/)[0]).searchParams.get("token");
    assert.equal(user.resetPasswordToken, null);
    assert.equal(user.resetPasswordTokenHash, hash(token)); assert.notEqual(user.resetPasswordTokenHash, token);
    user.resetPasswordExpires = new Date(Date.now() - 1);
    assert.equal((await request("/api/auth/reset-password", { token, password: "NewPass123" })).status, 400);
    user.resetPasswordExpires = new Date(Date.now() + 60000);
    assert.equal((await request("/api/auth/reset-password", { token, password: "NewPass123", userId: other._id })).status, 200);
    assert.ok(await bcrypt.compare("NewPass123", user.password));
    assert.equal(other.password, "unchanged"); assert.equal(user.tokenVersion, 1); assert.equal(user.resetPasswordTokenHash, null);
    assert.equal((await request("/api/auth/reset-password", { token, password: "Again123" })).status, 400);
    assert.equal((await request("/api/auth/me", undefined, { Authorization: "Bearer " + oldJWT })).status, 401);
    assert.equal((await request("/api/auth/login", { email: user.email, password: "NewPass123" })).status, 200);
});
test("concurrent resets have exactly one winner", async () => {
    const token = "b".repeat(64);
    const user = await localUser({ resetPasswordTokenHash: hash(token), resetPasswordExpires: new Date(Date.now() + 60000) });
    const results = await Promise.all(["FirstPass123", "SecondPass123"].map((password) => request("/api/auth/reset-password", { token, password })));
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
    assert.equal(user.tokenVersion, 1);
    const winner = results[0].status === 200 ? "FirstPass123" : "SecondPass123";
    assert.ok(await bcrypt.compare(winner, user.password));
});
test("legacy plaintext reset tokens cannot be consumed", async () => {
    const token = "b".repeat(64);
    await localUser({ resetPasswordToken: token, resetPasswordExpires: new Date(Date.now() + 60000) });
    assert.equal((await request("/api/auth/reset-password", { token, password: "NewPass123" })).status, 400);
});
test("forgot-password has identical responses for local, OAuth and unknown accounts", async () => {
    await localUser();
    await User.create({ email: "oauth@example.test", provider: "google", password: null });
    const results = await Promise.all(["owner@example.test", "oauth@example.test", "unknown@example.test"].map((email) => request("/api/auth/forgot-password", { email })));
    assert.deepEqual(results.map((r) => [r.status, r.data]), Array(3).fill([200, results[0].data]));
});
test("registration requires email proof; pending registration cannot block OAuth; verification and login succeed", async () => {
    const r = await request("/api/auth/register", { name: "Owner", email: "owner@example.test", password: "TestPass123" });
    assert.equal(r.status, 202); assert.equal(r.data.token, undefined); assert.equal(users.length, 0);
    const token = new URL(mails[0].text.match(/http[^\s]+/)[0]).searchParams.get("verification");
    assert.equal((await request("/api/auth/verify-email", { token })).status, 200);
    assert.equal(users.length, 1); assert.equal(users[0].emailVerified, true);
    assert.equal((await request("/api/auth/login", { email: "owner@example.test", password: "TestPass123" })).status, 200);
    assert.equal((await request("/api/auth/verify-email", { token })).status, 400);
    const duplicate = await request("/api/auth/register", { name: "Owner", email: "owner@example.test", password: "TestPass123" });
    assert.equal(duplicate.status, r.status); assert.deepEqual(duplicate.data, r.data);
});
test("pending unverified registration never reserves an OAuth email", async () => {
    await request("/api/auth/register", { name: "Impostor", email: "owner@example.test", password: "TestPass123" });
    const result = await callback("google", await begin());
    assert.ok(new URL(result.headers.get("location")).searchParams.has("code"));
    assert.equal(users[0].provider, "google"); assert.equal(users[0].password, null);
});
test("authentication input rejects objects, wrong email, oversize password and preserves legacy password login", async () => {
    for (const data of [{ email: { $ne: null }, password: "TestPass123" }, { email: "bad", password: "TestPass123" }, { email: "a@b.test", password: {} }, { email: "a@b.test", password: "a".repeat(73) }]) {
        assert.equal((await request("/api/auth/login", data)).status, 400);
    }
    const user = await localUser({ password: await bcrypt.hash("old123", 4) });
    assert.equal((await request("/api/auth/login", { email: user.email, password: "old123" })).status, 200);
});
test("login does not reveal account existence or provider", async () => {
    await localUser(); await User.create({ email: "oauth@example.test", provider: "google", password: null });
    const results = await Promise.all(["owner@example.test", "oauth@example.test", "absent@example.test"].map((email) => request("/api/auth/login", { email, password: "Incorrect123" })));
    assert.deepEqual(results.map((r) => [r.status, r.data]), Array(3).fill([401, results[0].data]));
});
for (const provider of ["google", "github"]) {
    test(provider + " rejects missing, mismatched, expired, cross-provider and replayed state", async () => {
        failureRedirect(await request(`/api/auth/${provider}/callback?code=x`));
        const flow = await begin(provider);
        failureRedirect(await callback(provider, { ...flow, cookie: flow.cookie.replace(/=.*/, "=" + "f".repeat(64)) }));
        const grant = grants.get(hash(flow.state)); grant.expiresAt = new Date(Date.now() - 1);
        failureRedirect(await callback(provider, flow));
        const fresh = await begin(provider);
        failureRedirect(await callback(provider === "google" ? "github" : "google", fresh));
        const success = await callback(provider, fresh);
        assert.ok(new URL(success.headers.get("location")).searchParams.has("code"));
        failureRedirect(await callback(provider, fresh));
    });
    test(provider + " legitimate login exchanges a browser-bound single-use code and never exposes JWT in URL", async () => {
        const flow = await begin(provider);
        const response = await callback(provider, flow);
        const url = new URL(response.headers.get("location"));
        assert.equal(url.searchParams.has("token"), false);
        const code = url.searchParams.get("code"); assert.match(code, /^[a-f0-9]{64}$/);
        assert.equal((await request("/api/auth/exchange", { code, verifier: "c".repeat(64) })).status, 400);
        const result = await request("/api/auth/exchange", { code, verifier: flow.verifier });
        assert.equal(result.status, 200); assert.ok(result.data.token); assert.equal(result.data.user.provider, provider);
        assert.equal((await request("/api/auth/me", undefined, { Authorization: "Bearer " + result.data.token })).status, 200);
        assert.equal((await request("/api/auth/exchange", { code, verifier: flow.verifier })).status, 400);
    });
    test(provider + " cancellation redirects safely and consumes state", async () => {
        const flow = await begin(provider);
        failureRedirect(await callback(provider, flow, "&error=access_denied"));
        assert.equal(grants.has(hash(flow.state)), false);
    });
}
test("Google rejects unverified email, missing sub and malformed profile", async () => {
    for (const payload of [{ ...googlePayload, email_verified: false }, { ...googlePayload, sub: undefined }, null]) {
        googlePayload = payload; failureRedirect(await callback("google", await begin()));
    }
    assert.equal(users.length, 0);
});
test("GitHub checks status at all three upstream requests and requires valid ID and verified email", async () => {
    const good = structuredClone(providerResponses);
    const cases = [
        [{ status: 503, data: {} }],
        [good[0], { status: 503, data: { message: "upstream failure" } }],
        [good[0], { status: 200, data: { login: "owner" } }],
        [good[0], { status: 200, data: { id: "undefined", login: "owner" } }],
        [good[0], good[1], { status: 403, data: {} }],
        [good[0], good[1], { status: 200, data: {} }],
        [good[0], good[1], { status: 200, data: [{ email: "owner@example.test", primary: true, verified: false }] }]
    ];
    for (const responses of cases) {
        providerResponses = structuredClone(responses);
        failureRedirect(await callback("github", await begin("github")));
    }
    assert.equal(users.length, 0);
});
test("legacy unverified local accounts are not linked; reset email proof permits safe linking without deleting local login", async () => {
    const user = await localUser();
    failureRedirect(await callback("google", await begin()));
    assert.equal(user.provider, "local"); assert.equal(user.oauthIdentities, undefined);
    user.emailVerified = true;
    const result = await callback("google", await begin());
    assert.ok(new URL(result.headers.get("location")).searchParams.has("code"));
    assert.equal(user.oauthIdentities.google, "google-123"); assert.equal(user.provider, "local");
    assert.equal((await request("/api/auth/login", { email: user.email, password: "TestPass123" })).status, 200);
});
test("expired exchange and pre-reset exchange grants cannot issue a session", async () => {
    const flow = await begin(); const result = await callback("google", flow);
    const code = new URL(result.headers.get("location")).searchParams.get("code");
    grants.get(hash(code)).expiresAt = new Date(Date.now() - 1);
    assert.equal((await request("/api/auth/exchange", { code, verifier: flow.verifier })).status, 400);
    const nextFlow = await begin(); const next = await callback("google", nextFlow);
    const nextCode = new URL(next.headers.get("location")).searchParams.get("code");
    users[0].tokenVersion++;
    assert.equal((await request("/api/auth/exchange", { code: nextCode, verifier: nextFlow.verifier })).status, 400);
});
test("JWT rejects missing, malformed, expired, wrong audience/issuer/algorithm, legacy claims and accepts valid token", async () => {
    const user = await localUser(); const secret = process.env.JWT_SECRET;
    const claims = jwt.decode(signToken(user)); assert.equal(claims.exp - claims.iat, 24 * 60 * 60);
    const make = (options = {}, claims = { userId: user._id, ver: 0 }) => jwt.sign(claims, secret, { issuer: "vectorforge", audience: "vectorforge-web", ...options });
    const tokens = ["", "bad", make({ expiresIn: -1 }), make({ audience: "other" }), make({ issuer: "other" }), make({ algorithm: "HS384" }), make({}, { userId: user._id })];
    for (const token of tokens) assert.equal((await request("/api/auth/me", undefined, token ? { Authorization: "Bearer " + token } : {})).status, 401);
    assert.equal((await request("/api/auth/me", undefined, { Authorization: "Bearer " + signToken(user) })).status, 200);
});
test("actual authentication routes enforce independent limits before controllers; spoofed forwarded IP cannot evade local limits", async () => {
    for (const [path, max] of [["login", 15], ["register", 5], ["forgot-password", 5], ["reset-password", 10], ["exchange", 20]]) {
        for (let i = 0; i < max; i++) assert.equal((await request("/api/auth/" + path, {}, { "X-Forwarded-For": "192.0.2." + i })).status, 400);
        const denied = await request("/api/auth/" + path, {});
        assert.equal(denied.status, 429); assert.ok(Number(denied.headers.get("retry-after")) > 0);
    }
});
test("OAuth initiation and callback limits are applied to actual routes", async () => {
    for (const [path, max] of [["google", 20], ["google/callback", 30]]) {
        for (let i = 0; i < max; i++) assert.equal((await request("/api/auth/" + path)).status, 302);
        assert.equal((await request("/api/auth/" + path)).status, 429);
    }
});
test("rate counters shared across middleware instances, concurrent increments and fail-closed store failure", async () => {
    const { limit } = require("../src/middleware/rateLimiter");
    const a = limit("shared-test", 3), b = limit("shared-test", 3);
    const statuses = [];
    const call = (middleware) => middleware({ ip: "127.0.0.1" }, { set() {}, status(code) { statuses.push(code); return this; }, json() {} }, () => statuses.push(200));
    await Promise.all([call(a), call(b), call(a), call(b)]);
    assert.deepEqual(statuses.sort(), [200, 200, 200, 429]);
    dbDown = true; assert.equal((await request("/api/auth/login", {})).status, 503);
});
test("AI rejects unauthenticated requests before quota use; authenticated requests remain functional", async () => {
    for (const route of ["chat", "embed", "rag"]) assert.equal((await request("/api/ai/" + route, { prompt: "hi", text: "hi", question: "hi" })).status, 401);
    assert.equal(aiCalls, 0);
    const user = await localUser();
    assert.equal((await request("/api/ai/chat", { prompt: "hi" }, { Authorization: "Bearer " + signToken(user) })).status, 200);
    assert.equal((await request("/api/ai/embed", { text: {} }, { Authorization: "Bearer " + signToken(user) })).status, 400);
    assert.equal(aiCalls, 1);
});
test("RAG ignores attacker-supplied userId and retrieves only authenticated owner's persisted documents", async () => {
    const alice = await localUser(); const bob = await User.create({ email: "bob@example.test" });
    vectorRecords.push({ vectorId: "alice-private", userId: alice._id, values: embedding(), embeddingModel: "gemini-embedding-001", metadata: { text: "Alice private document" } },
        { vectorId: "bob-private", userId: bob._id, values: embedding(), embeddingModel: "gemini-embedding-001", metadata: { text: "Bob private document" } });
    const result = await request("/api/ai/rag", { question: "test", userId: bob._id }, { Authorization: "Bearer " + signToken(alice) });
    assert.equal(result.status, 200); assert.deepEqual(result.data.sources.map((s) => s.id), ["alice-private"]);
    assert.equal(receivedContext, "Alice private document");
    const deniedDelete = await request("/api/vectors/bob-private", undefined, { Authorization: "Bearer " + signToken(alice) }, "DELETE");
    assert.equal(deniedDelete.status, 404); assert.ok(vectorRecords.some((v) => v.vectorId === "bob-private"));
});
test("public health, CORS allowlist, safe JSON errors and security headers", async () => {
    const health = await request("/"); assert.equal(health.status, 200);
    assert.equal(health.headers.get("x-content-type-options"), "nosniff"); assert.equal(health.headers.get("referrer-policy"), "no-referrer");
    assert.equal((await request("/api/auth/me", undefined, { Origin: "https://evil.example" })).status, 403);
    const allowed = await request("/api/auth/me", undefined, { Origin: process.env.FRONTEND_URL });
    assert.equal(allowed.headers.get("access-control-allow-origin"), process.env.FRONTEND_URL);
    const bad = await originalFetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    assert.equal(bad.status, 400); assert.deepEqual(await bad.json(), { success: false, message: "Invalid request." });
});
test("authentication DB outages are 503, not invalid-session 401", async () => {
    const auth = require("../src/middleware/auth.middleware"), user = await localUser();
    dbDown = true; let status;
    await auth({ headers: { authorization: "Bearer " + signToken(user) } }, { status(code) { status = code; return this; }, json() {} }, () => assert.fail("must not authorize"));
    assert.equal(status, 503);
});

test("concurrent exchange requests issue exactly one JWT", async () => {
    const flow = await begin();
    const result = await callback("google", flow);
    const code = new URL(result.headers.get("location")).searchParams.get("code");
    const responses = await Promise.all([request("/api/auth/exchange", { code, verifier: flow.verifier }), request("/api/auth/exchange", { code, verifier: flow.verifier })]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 400]);
});
test("production OAuth state cookie is Secure, HttpOnly, host-only and Lax", async () => {
    process.env.NODE_ENV = "production";
    try {
        const response = await request("/api/auth/google?challenge=" + "a".repeat(43));
        const cookie = response.headers.get("set-cookie");
        assert.match(cookie, /^__Host-vf_oauth_google=/); assert.match(cookie, /; Secure/); assert.match(cookie, /; HttpOnly/); assert.match(cookie, /SameSite=Lax/); assert.doesNotMatch(cookie, /Domain=/);
    } finally { process.env.NODE_ENV = "test"; }
});
test("PDF rejects unauthenticated requests and wrong MIME before parsing or spending quota", async () => {
    assert.equal((await request("/api/pdf/upload", {})).status, 401);
    const user = await localUser();
    const form = new FormData(); form.append("pdf", new Blob(["not pdf"], { type: "text/plain" }), "file.txt");
    const result = await originalFetch(base + "/api/pdf/upload", { method: "POST", headers: { Authorization: "Bearer " + signToken(user) }, body: form });
    assert.equal(result.status, 400); assert.equal(aiCalls, 0);
});
test("PDF ownership comes from authentication; temporary files are cleaned on success and invalid content", async () => {
    const upload = require("../src/controllers/pdf.controller").uploadPDF;
    const user = await localUser();
    let status = 200, data;
    const res = { status(code) { status = code; return this; }, json(value) { data = value; return this; } };
    await upload({ file: { path: "synthetic-pdf" }, user, body: { userId: "another-user" } }, res);
    assert.equal(status, 200); assert.equal(data.totalChunks, 1);
    assert.equal(documentRecords[0].userId, user._id); assert.equal(removedPaths.length, 1);
    parsedText = "";
    await upload({ file: { path: "synthetic-pdf" }, user }, res);
    assert.equal(status, 400); assert.equal(removedPaths.length, 2); assert.equal(aiCalls, 1);
});
test("AI user limit is shared across paid endpoints", async () => {
    const user = await localUser(); const headers = { Authorization: "Bearer " + signToken(user) };
    for (let i = 0; i < 30; i++) assert.equal((await request("/api/ai/chat", { prompt: "test" }, headers)).status, 200);
    assert.equal((await request("/api/ai/embed", { text: "test" }, headers)).status, 429);
    assert.equal(aiCalls, 30);
});

test("PDF signature and chunk budget are enforced before Gemini; cleanup runs on every rejection", async () => {
    const upload = require("../src/controllers/pdf.controller").uploadPDF;
    const user = await localUser(); let status;
    const res = { status(code) { status = code; return this; }, json() { return this; } };
    pdfSignature = "MZbad";
    await upload({ file: { path: "synthetic-pdf" }, user }, res);
    assert.equal(status, 400); assert.equal(aiCalls, 0);
    pdfSignature = "%PDF-"; parsedText = "a".repeat(101000);
    await upload({ file: { path: "synthetic-pdf" }, user }, res);
    assert.equal(status, 400); assert.equal(aiCalls, 0); assert.equal(removedPaths.length, 2);
});
test("PDF multipart parser configuration has a 10 MiB file limit and rejects extra files/fields", () => {
    const vm = require("node:vm"), fs = require("node:fs");
    let options;
    vm.runInNewContext(fs.readFileSync(require.resolve("../src/routes/pdf.routes"), "utf8"), {
        module: { exports: {} }, require(name) {
            if (name === "multer") { const factory = (config) => { options = config; return { single: () => () => {} }; }; factory.diskStorage = (config) => config; return factory; }
            return require(require.resolve(name, { paths: [require("node:path").dirname(require.resolve("../src/routes/pdf.routes"))] }));
        }
    });
    assert.equal(options.limits.fileSize, 10 * 1024 * 1024); assert.equal(options.limits.files, 1); assert.equal(options.limits.fields, 0);
});
test("Mongoose preserves the exact atomic reset predicate and version increment without a database", () => {
    const query = new mongoose.Query({}, {}, User, User.collection);
    query.findOneAndUpdate({ resetPasswordTokenHash: hash("a".repeat(64)), resetPasswordExpires: { $gt: new Date() }, password: { $type: "string" } },
        { $set: { resetPasswordTokenHash: null, password: "synthetic hash" }, $inc: { tokenVersion: 1 } });
    const filter = query.cast(User);
    assert.equal(typeof filter.resetPasswordTokenHash, "string"); assert.equal(filter.password.$type, "string");
    assert.equal(query._castUpdate(query.getUpdate()).$inc.tokenVersion, 1);
});

test("generic email responses do not wait on account-specific SMTP latency", async () => {
    await localUser();
    let finish;
    mailWait = new Promise((resolve) => { finish = resolve; });
    try {
        const response = await Promise.race([
            request("/api/auth/forgot-password", { email: "owner@example.test" }),
            new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error("Response waited for SMTP")), 2000); timer.unref(); })
        ]);
        assert.equal(response.status, 200); assert.equal(mails.length, 1);
    } finally { finish(); mailWait = null; }
});

test("registration preparation failure returns 503 instead of falsely accepting an email request", async () => {
    const bcrypt = require("bcryptjs"), original = bcrypt.hash;
    bcrypt.hash = async () => { throw new Error("Synthetic hashing failure"); };
    try {
        const result = await request("/api/auth/register", { name: "Synthetic", email: "failure@example.test", password: "SyntheticPass123" });
        assert.equal(result.status, 503); assert.equal(result.data.success, false);
        assert.equal(mails.length, 0); assert.equal(users.length, 0);
    } finally { bcrypt.hash = original; }
});

test("actual multipart requests enforce byte and file counts before paid processing", async () => {
    const { uploadDirectory } = require("../src/services/upload-files.service");
    const before = await fsPromises.readdir(uploadDirectory).catch(() => []);
    const user = await localUser(), headers = { Authorization: "Bearer " + signToken(user) };
    const oversized = new FormData(); oversized.append("pdf", new Blob([Buffer.alloc(10 * 1024 * 1024 + 1)], { type: "application/pdf" }), "synthetic.pdf");
    const tooBig = await originalFetch(base + "/api/pdf/upload", { method: "POST", headers, body: oversized });
    assert.equal(tooBig.status, 413); await tooBig.text();
    const multiple = new FormData();
    for (let i = 0; i < 2; i++) multiple.append("pdf", new Blob(["%PDF-synthetic"], { type: "application/pdf" }), "synthetic-" + i + ".pdf");
    const tooMany = await originalFetch(base + "/api/pdf/upload", { method: "POST", headers, body: multiple });
    assert.equal(tooMany.status, 400); await tooMany.text();
    assert.equal(aiCalls, 0); assert.equal(documentRecords.length, 0);
    assert.deepEqual((await fsPromises.readdir(uploadDirectory)).sort(), before.sort());
});
test("parser failure returns a sanitized error and removes the current temporary file", async () => {
    parserFailure = true;
    const user = await localUser(); let status, data;
    await require("../src/controllers/pdf.controller").uploadPDF({ file: { path: "synthetic-pdf" }, user }, {
        status(code) { status = code; return this; }, json(value) { data = value; return this; }
    });
    assert.equal(status, 503); assert.equal(aiCalls, 0); assert.equal(documentRecords.length, 0);
    assert.equal(removedPaths.length, 1); assert.doesNotMatch(JSON.stringify(data), /private text|stack|Synthetic parser/);
});

test("registration acknowledges SMTP acceptance, rejects DB/SMTP failure and uses identical mail paths for existing addresses", async () => {
    const body = { name: 'Synthetic', email: 'owner@example.test', password: 'TestPass123' };
    const existing = await localUser();
    let finish;
    mailWait = new Promise((resolve) => { finish = resolve; });
    let responded = false;
    const pending = request('/api/auth/register', body).then((r) => { responded = true; return r; });
    try {
        for (let i = 0; i < 200 && !mails.length; i++) await new Promise((resolve) => setTimeout(resolve, 10));
        assert.equal(mails.length, 1); assert.equal(responded, false);
    } finally { finish(); }
    assert.equal((await pending).status, 202);
    mailWait = null; mailFailure = true;
    for (const email of [existing.email, 'new@example.test']) {
        const r = await request('/api/auth/register', { ...body, email });
        assert.equal(r.status, 503); assert.equal(r.data.success, false);
    }
    const create = Grant.create;
    Grant.create = async () => { throw new Error('Synthetic write failure'); };
    try { assert.equal((await request('/api/auth/register', body)).status, 503); }
    finally { Grant.create = create; }
    assert.equal(users.length, 1);
});

test("verified new registration signs in once, survives a failed database write, and never overwrites an existing OAuth account", async () => {
    await request('/api/auth/register', { name: 'Synthetic', email: 'owner@example.test', password: 'TestPass123' });
    const token = new URL(mails[0].text.match(/http[^\s]+/)[0]).searchParams.get('verification');
    const create = User.create;
    User.create = async () => { throw new Error('Synthetic write failure'); };
    try { assert.equal((await request('/api/auth/verify-email', { token })).status, 503); }
    finally { User.create = create; }
    assert.ok(grants.has(hash(token)));
    const results = await Promise.all([request('/api/auth/verify-email', { token }), request('/api/auth/verify-email', { token })]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
    const session = results.find((r) => r.status === 200).data;
    assert.equal(users.length, 1); assert.equal(session.user.id, String(users[0]._id));
    assert.equal((await request('/api/auth/me', undefined, { Authorization: 'Bearer ' + session.token })).status, 200);
    await request('/api/auth/register', { name: 'Other', email: 'owner@example.test', password: 'AnotherPass123' });
    const second = new URL(mails[1].text.match(/http[^\s]+/)[0]).searchParams.get('verification');
    const verified = await request('/api/auth/verify-email', { token: second });
    assert.equal(verified.status, 200); assert.equal(verified.data.token, undefined);
    assert.ok(await bcrypt.compare('TestPass123', users[0].password));
    await User.create({ email: 'oauth@example.test', provider: 'google', providerId: 'another-google', password: null, emailVerified: true });
    await request('/api/auth/register', { name: 'Claimant', email: 'oauth@example.test', password: 'AnotherPass123' });
    const third = new URL(mails[2].text.match(/http[^\s]+/)[0]).searchParams.get('verification');
    assert.equal((await request('/api/auth/verify-email', { token: third })).data.token, undefined);
    assert.equal(users[1].password, null);
});

test("verification resumes its own acknowledged-lost create without reusing a consumed link", async () => {
    await request('/api/auth/register', { name: 'Synthetic', email: 'owner@example.test', password: 'TestPass123' });
    const token = new URL(mails[0].text.match(/http[^\s]+/)[0]).searchParams.get('verification');
    const create = User.create;
    User.create = async (data) => { await create(data); throw new Error('Lost acknowledgment'); };
    try { assert.equal((await request('/api/auth/verify-email', { token })).status, 503); }
    finally { User.create = create; }
    assert.equal(users.length, 1);
    assert.ok((await request('/api/auth/verify-email', { token })).data.token);
    assert.equal((await request('/api/auth/verify-email', { token })).status, 400);
});

test("verified Google and GitHub users link both ways and repeat sign-in preserves one account", async () => {
    for (const first of ['google', 'github']) {
        users.length = 0;
        const second = first === 'google' ? 'github' : 'google';
        for (const provider of [first, second, first, second]) {
            if (provider === 'github') providerResponses = [
                { status: 200, data: { access_token: 'synthetic' } },
                { status: 200, data: { id: 123, login: 'owner' } },
                { status: 200, data: [{ email: 'owner@example.test', verified: true }] }
            ];
            const flow = await begin(provider), result = await callback(provider, flow);
            const code = new URL(result.headers.get('location')).searchParams.get('code');
            assert.ok(code);
            const session = await request('/api/auth/exchange', { code, verifier: flow.verifier });
            assert.equal(session.status, 200); assert.equal(session.data.user.id, String(users[0]._id));
            assert.equal(users.length, 1); assert.equal(users[0].provider, first);
        }
    }
});

test("authoritative Google ownership recovers legacy Gmail and Workspace accounts and revokes unverified credentials", async () => {
    for (const [email, hd] of [['synthetic@gmail.com', undefined], ['synthetic@example.test', 'example.test']]) {
        users.length = 0;
        const user = await localUser({ email, resetPasswordTokenHash: hash('f'.repeat(64)), resetPasswordExpires: new Date(Date.now() + 60000) });
        const oldJWT = signToken(user), id = user._id;
        googlePayload = { sub: 'google-owner', email, email_verified: true, hd };
        const flow = await begin(), result = await callback('google', flow);
        const code = new URL(result.headers.get('location')).searchParams.get('code');
        assert.ok(code); assert.equal(users.length, 1); assert.equal(user._id, id);
        assert.equal(user.password, null); assert.equal(user.emailVerified, true); assert.equal(user.tokenVersion, 1);
        assert.equal(user.resetPasswordTokenHash, null);
        assert.equal((await request('/api/auth/me', undefined, { Authorization: 'Bearer ' + oldJWT })).status, 401);
        assert.equal((await request('/api/auth/login', { email, password: 'TestPass123' })).status, 401);
        const session = await request('/api/auth/exchange', { code, verifier: flow.verifier });
        assert.equal(session.status, 200);
        assert.equal((await request('/api/auth/me', undefined, { Authorization: 'Bearer ' + session.data.token })).status, 200);
        const repeat = await callback('google', await begin());
        assert.ok(new URL(repeat.headers.get('location')).searchParams.get('code')); assert.equal(user.tokenVersion, 1);
    }
});

test("Google recovery refuses unverified claims and conflicting identities; verified local passwords remain usable", async () => {
    const user = await localUser({ email: 'synthetic@gmail.com' });
    googlePayload = { sub: 'google-owner', email: user.email, email_verified: false };
    failureRedirect(await callback('google', await begin()));
    googlePayload.email_verified = true;
    user.oauthIdentities = { github: 'conflicting-legacy-identity' };
    failureRedirect(await callback('google', await begin()));
    assert.ok(await bcrypt.compare('TestPass123', user.password)); assert.equal(user.tokenVersion, 0);
    user.oauthIdentities = {}; user.emailVerified = true;
    assert.ok(new URL((await callback('google', await begin())).headers.get('location')).searchParams.get('code'));
    assert.ok(await bcrypt.compare('TestPass123', user.password));
});

test("concurrent Google first sign-ins resolve the unique-email race without duplicate accounts", async () => {
    const first = await begin(), second = await begin();
    const results = await Promise.all([callback('google', first), callback('google', second)]);
    for (const r of results) assert.ok(new URL(r.headers.get('location')).searchParams.get('code'));
    assert.equal(users.length, 1);
});

test("OAuth failures log only a fixed stage, never provider errors or submitted codes", async () => {
    const warn = console.warn, lines = [];
    console.warn = (line) => lines.push(line);
    try { failureRedirect(await request('/api/auth/google/callback?code=private-code&state=bad')); }
    finally { console.warn = warn; }
    assert.deepEqual(lines, ['OAuth google failed at state.']);
});

test('registration has a bounded SMTP deadline instead of reporting success for a stalled send', { timeout: 15000 }, async () => {
    let finish;
    mailWait = new Promise((resolve) => { finish = resolve; });
    try {
        const started = Date.now();
        const result = await request('/api/auth/register', { name: 'Synthetic', email: 'deadline@example.test', password: 'TestPass123' });
        assert.equal(result.status, 503); assert.equal(result.data.success, false);
        assert.ok(Date.now() - started < 14000);
        assert.equal(users.length, 0);
    } finally { finish(); mailWait = null; }
});

test('Mongoose retains registration retry provenance and atomic legacy-recovery revocation fields', () => {
    const user = new User({ email: 'synthetic@example.test', registrationGrantId: hash('a'.repeat(64)) });
    assert.equal(user.toObject().registrationGrantId, hash('a'.repeat(64)));
    const query = new mongoose.Query({}, {}, User, User.collection);
    query.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(), provider: 'local', email: 'synthetic@gmail.com',
        $or: [{ emailVerified: false }, { emailVerified: { $exists: false } }], password: 'synthetic-hash',
        'oauthIdentities.google': { $exists: false }, 'oauthIdentities.github': { $exists: false } },
        { $set: { password: null, emailVerified: true, 'oauthIdentities.google': 'google-owner', resetPasswordTokenHash: null }, $inc: { tokenVersion: 1 } });
    const filter = query.cast(User), change = query._castUpdate(query.getUpdate());
    assert.equal(filter.$or[1].emailVerified.$exists, false);
    assert.equal(filter.password, 'synthetic-hash'); assert.equal(change.$inc.tokenVersion, 1);
    assert.equal(change.$set.password, null); assert.equal(change.$set['oauthIdentities.google'], 'google-owner');
});

test('manual signup normalizes email, gives non-enumerating verification guidance, then supports manual login and reload', async () => {
    await request('/api/auth/register', { name: 'Manual', email: '  manual@example.test  ', password: 'ManualPass123' });
    assert.equal(mails[0].to, 'manual@example.test');
    const waiting = await request('/api/auth/login', { email: ' MANUAL@example.test ', password: 'ManualPass123' });
    assert.equal(waiting.status, 401); assert.match(waiting.data.message, /email verification/);
    const incorrect = await request('/api/auth/login', { email: 'manual@example.test', password: 'WrongPass123' });
    assert.equal(incorrect.status, 401); assert.equal(incorrect.data.code, undefined);
    assert.deepEqual(incorrect.data, waiting.data);
    const token = new URL(mails[0].text.match(/http[^\s]+/)[0]).searchParams.get('verification');
    assert.equal((await request('/api/auth/verify-email', { token })).status, 200);
    const signed = await request('/api/auth/login', { email: 'manual@example.test', password: 'ManualPass123' });
    assert.equal(signed.status, 200);
    assert.equal((await request('/api/auth/me', undefined, { Authorization: 'Bearer ' + signed.data.token })).status, 200);
});

test('manual registration on an OAuth account requires email proof and a freshly chosen password, preserves OAuth identity', async () => {
    const original = await callback('google', await begin());
    assert.ok(new URL(original.headers.get('location')).searchParams.get('code'));
    const owner = users[0], identity = owner.providerId, userId = owner._id;
    await request('/api/auth/register', { name: 'Untrusted name', email: owner.email, password: 'SubmittedBeforeProof123' });
    assert.equal(owner.password, null);
    const verification = new URL(mails[0].text.match(/http[^\s]+/)[0]).searchParams.get('verification');
    const result = await request('/api/auth/verify-email', { token: verification });
    assert.equal(result.status, 200); assert.equal(result.data.token, undefined); assert.match(result.data.passwordSetupToken, /^[a-f0-9]{64}$/);
    assert.equal(owner.password, null); assert.equal(owner.resetPasswordTokenHash, hash(result.data.passwordSetupToken));
    assert.equal((await request('/api/auth/login', { email: owner.email, password: 'SubmittedBeforeProof123' })).status, 401);
    assert.equal((await request('/api/auth/reset-password', { token: result.data.passwordSetupToken, password: 'ChosenAfterProof123' })).status, 200);
    assert.equal((await request('/api/auth/reset-password', { token: result.data.passwordSetupToken, password: 'AnotherPass123' })).status, 400);
    assert.equal((await request('/api/auth/login', { email: owner.email, password: 'ChosenAfterProof123' })).status, 200);
    assert.equal(owner._id, userId); assert.equal(owner.providerId, identity); assert.equal(owner.provider, 'google');
    assert.ok(new URL((await callback('google', await begin())).headers.get('location')).searchParams.get('code'));
    assert.equal(users.length, 1);
});

test('password setup by email supports OAuth-only accounts without changing provider data or accepting expired tokens', async () => {
    const owner = await User.create({ email: 'setup@example.test', provider: 'github', providerId: '321', password: null, emailVerified: true });
    const oldJWT = signToken(owner);
    assert.equal((await request('/api/auth/forgot-password', { email: owner.email })).status, 200);
    const token = new URL(mails[0].text.match(/http[^\s]+/)[0]).searchParams.get('token');
    owner.resetPasswordExpires = new Date(Date.now() - 1);
    assert.equal((await request('/api/auth/reset-password', { token, password: 'NewLocalPass123' })).status, 400);
    owner.resetPasswordExpires = new Date(Date.now() + 60000);
    assert.equal((await request('/api/auth/reset-password', { token, password: 'NewLocalPass123' })).status, 200);
    assert.equal((await request('/api/auth/login', { email: owner.email, password: 'NewLocalPass123' })).status, 200);
    assert.equal((await request('/api/auth/me', undefined, { Authorization: 'Bearer ' + oldJWT })).status, 401);
    assert.equal(owner.provider, 'github'); assert.equal(owner.providerId, '321');
});
