const { test } = require("node:test");
const assert = require("node:assert/strict");
const { healthUrl, ping } = require("../../scripts/render-keepalive.cjs");

test("keep-alive accepts only a public Render origin and never invokes fetch for invalid configuration", async () => {
    assert.equal(healthUrl("https://synthetic-app.onrender.com"), "https://synthetic-app.onrender.com/health");
    for (const url of [undefined, "", "http://synthetic.onrender.com", "https://localhost", "https://onrender.com",
        "https://synthetic.onrender.com.evil.test", "https://user:password@synthetic.onrender.com",
        "https://synthetic.onrender.com:1234", "https://synthetic.onrender.com/api/ai/chat",
        "https://synthetic.onrender.com?secret=synthetic", "https://synthetic.onrender.com/#fragment"]) {
        await assert.rejects(ping(url, { fetchImpl: () => assert.fail("Must not issue request") }), /RENDER_BACKEND_URL/);
    }
});

test("keep-alive makes one credential-free GET to health and verifies the actual application", async () => {
    let calls = 0;
    const result = await ping("https://synthetic.onrender.com", { fetchImpl: async (url, options) => {
        calls++;
        assert.equal(url, "https://synthetic.onrender.com/health");
        assert.equal(options.method, "GET"); assert.equal(options.redirect, "error");
        assert.equal(options.body, undefined); assert.equal(options.headers.Authorization, undefined);
        assert.equal(options.headers.Cookie, undefined); assert.ok(options.signal instanceof AbortSignal);
        return { status: 200, json: async () => ({ success: true, project: "VectorForge" }) };
    } });
    assert.deepEqual(result, { healthy: true }); assert.equal(calls, 1);
});

test("keep-alive rejects unhealthy responses, redirects, wake-up HTML and network errors without retrying", async () => {
    const responses = [
        ...[301, 401, 404, 429, 503].map(status => ({ status })),
        { status: 200, json: async () => ({ success: false, project: "VectorForge" }) },
        { status: 200, json: async () => ({ success: true, project: "Other" }) },
        { status: 200, json: async () => { throw new Error("Private upstream HTML"); } },
        new Error("Private network diagnostics")
    ];
    for (const response of responses) {
        let calls = 0;
        await assert.rejects(ping("https://synthetic.onrender.com", { fetchImpl: async () => {
            calls++; if (response instanceof Error) throw response; return response;
        } }), (error) => { assert.match(error.message, /Health check failed/); assert.doesNotMatch(error.message, /Private/); return true; });
        assert.equal(calls, 1);
    }
});

test("keep-alive bounds both connection and response-body waits and aborts stalled work", async () => {
    for (const bodyHang of [false, true]) {
        let signal;
        await assert.rejects(ping("https://synthetic.onrender.com", { timeoutMs: 20, fetchImpl: async (_, options) => {
            signal = options.signal;
            if (bodyHang) return { status: 200, json: () => new Promise(() => {}) };
            return new Promise(() => {});
        } }), /timed out/);
        assert.equal(signal.aborted, true);
    }
});
