const { test } = require("node:test");
const assert = require("node:assert/strict");
Object.assign(process.env, {
    NODE_ENV: "production", MAIL_PROVIDER: "brevo", BREVO_API_KEY: "synthetic-key", MAIL_FROM: "sender@example.test",
    FRONTEND_URL: "https://frontend.test", BACKEND_URL: "https://backend.test",
    JWT_SECRET: "synthetic-secret-with-more-than-thirty-two-bytes", GEMINI_API_KEY: "synthetic",
    MONGODB_URI: "mongodb://127.0.0.1/never-connect", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", GOOGLE_CALLBACK_URL: "",
    GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: "", GITHUB_CALLBACK_URL: ""
});
require("mongoose").connect = () => { throw new Error("No database connections in this test"); };
require("nodemailer").createTransport = () => { throw new Error("No SMTP in HTTPS mode"); };
const calls = [];
let failure, finish;
global.fetch = async (url, options) => {
    assert.equal(url, "https://api.brevo.com/v3/smtp/email");
    calls.push(JSON.parse(options.body));
    if (finish) await finish;
    if (failure) throw new Error("private-provider-payload-with-token");
    return { ok: true, json: async () => ({ messageId: "synthetic" }) };
};
const User = require("../src/models/User");
const { forgotPassword } = require("../src/controllers/auth.controller");
const { hash } = require("../src/security/auth");

test("production forgot-password sends HTTPS frontend link through HTTPS provider with hash-only persistence", async () => {
    calls.length = 0; failure = false;
    let stored, acknowledged = false, release;
    finish = new Promise((resolve) => { release = resolve; });
    User.findOneAndUpdate = async (query, update) => {
        assert.equal(acknowledged, true);
        assert.deepEqual(query, { email: "owner@example.test" });
        stored = update.$set;
        return { email: "owner@example.test" };
    };
    const pending = forgotPassword({ body: { email: "owner@example.test", frontendUrl: "http://attacker.test" }, headers: { host: "attacker.test" } }, {
        json: (data) => { acknowledged = true; assert.equal(data.success, true); assert.doesNotMatch(JSON.stringify(data), /token|owner@example/); }
    });
    try {
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(calls.length, 1);
        const url = new URL(calls[0].textContent.match(/https[^\s]+/)[0]);
        assert.equal(url.origin, "https://frontend.test"); assert.equal(url.pathname, "/reset-password");
        const token = url.searchParams.get("token"); assert.match(token, /^[a-f0-9]{64}$/);
        assert.equal(stored.resetPasswordTokenHash, hash(token)); assert.equal(stored.resetPasswordToken, null);
        assert.ok(stored.resetPasswordExpires > new Date());
        assert.doesNotMatch(JSON.stringify(calls[0]), /localhost|attacker.test|synthetic-key/);
    } finally { release(); finish = null; await pending; }
});

test("forgot-password preserves public account privacy but logs safe mail versus persistence failure categories", async () => {
    failure = true;
    const logs = [], responses = [], warn = console.warn;
    console.warn = (message) => logs.push(message);
    try {
        for (const scenario of ["absent", "mail_failure", "db_failure"]) {
            User.findOneAndUpdate = async () => {
                if (scenario === "db_failure") throw new Error("private-database-details");
                return scenario === "absent" ? null : { email: "owner@example.test" };
            };
            await forgotPassword({ body: { email: "owner@example.test" } }, { json: (data) => responses.push(data) });
        }
        assert.deepEqual(responses[0], responses[1]); assert.deepEqual(responses[1], responses[2]);
        assert.deepEqual(logs, ["Password-reset processing failed: email_api_delivery_unconfirmed.", "Password-reset processing failed: reset_persistence."]);
        assert.doesNotMatch(logs.join(" "), /private-|owner@example|synthetic-key/);
    } finally { console.warn = warn; }
});
