const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const env = {
    ...process.env, NODE_ENV: "production", GEMINI_API_KEY: "synthetic", MONGODB_URI: "mongodb://127.0.0.1/never-connect",
    JWT_SECRET: "synthetic-secret-with-more-than-thirty-two-bytes", FRONTEND_URL: "https://frontend.test",
    BACKEND_URL: "https://backend.test", SMTP_HOST: "smtp.invalid", SMTP_PORT: "465", SMTP_USER: "synthetic@example.test", SMTP_PASSWORD: "synthetic",
    GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", GOOGLE_CALLBACK_URL: "",
    GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: "", GITHUB_CALLBACK_URL: ""
};
function check(overrides) {
    return spawnSync(process.execPath, ["-e", "require('./src/config/env')"], {
        cwd: require("node:path").join(__dirname, ".."), env: { ...env, ...overrides }, encoding: "utf8"
    });
}
test("production configuration accepts a strong secret and HTTPS frontend with disabled unconfigured providers", () => {
    assert.equal(check({}).status, 0);
});
test("startup rejects weak JWT secret, invalid frontend origin, partial OAuth credentials and HTTP callbacks", () => {
    for (const overrides of [
        { JWT_SECRET: "weak" }, { FRONTEND_URL: "http://frontend.test" }, { FRONTEND_URL: "https://frontend.test/path" },
        { GOOGLE_CLIENT_ID: "synthetic-only" },
        { GITHUB_CLIENT_ID: "synthetic", GITHUB_CLIENT_SECRET: "synthetic", GITHUB_CALLBACK_URL: "http://backend.test/api/auth/github/callback" }
    ]) assert.notEqual(check(overrides).status, 0);
});

test("production rejects missing mail/backend/AI configuration and mismatched callback origins or paths", () => {
    for (const overrides of [{ BACKEND_URL: "" }, { FRONTEND_URL: "https://localhost" }, { SMTP_PASSWORD: "" }, { SMTP_PORT: "not-a-port" }, { GEMINI_API_KEY: "" }, { MONGODB_URI: "not-a-uri" },
        { GOOGLE_CLIENT_ID: "synthetic", GOOGLE_CLIENT_SECRET: "synthetic", GOOGLE_CALLBACK_URL: "https://backend.test/wrong" },
        { GOOGLE_CLIENT_ID: "synthetic", GOOGLE_CLIENT_SECRET: "synthetic", GOOGLE_CALLBACK_URL: "https://other.test/api/auth/google/callback" }]) assert.notEqual(check(overrides).status, 0);
    const result = check({ PORT: "synthetic-sensitive-invalid-port" }); assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout + result.stderr, /synthetic-sensitive-invalid-port/);
});

test("production mail requires TLS on submission ports and implicit TLS on 465", () => {
    for (const port of ["465", "587"]) {
        const code = "require('nodemailer').createTransport = o => { console.log(JSON.stringify({secure:o.secure,requireTLS:o.requireTLS,connectionTimeout:o.connectionTimeout,socketTimeout:o.socketTimeout})); return {}; }; require('./src/controllers/auth.controller');";
        const result = spawnSync(process.execPath, ["-e", code], {
            cwd: require("node:path").join(__dirname, ".."), env: { ...env, SMTP_PORT: port }, encoding: "utf8"
        });
        assert.equal(result.status, 0);
        const options = JSON.parse(result.stdout);
        assert.equal(options.secure, port === "465");
        assert.equal(options.requireTLS, port !== "465");
        assert.equal(options.connectionTimeout, 10000); assert.equal(options.socketTimeout, 15000);
    }
});
