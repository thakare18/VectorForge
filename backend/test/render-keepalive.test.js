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

test("keep-alive still fails after bounded retries and never exposes response bodies or network details", async () => {
    const responses = [
        ...[301, 401, 404].map(status => [{ status }, 1]),
        ...[429, 503].map(status => [{ status }, 3]),
        [{ status: 200, json: async () => ({ success: false, project: "VectorForge" }) }, 1],
        [{ status: 200, json: async () => ({ success: true, project: "Other" }) }, 1],
        [{ status: 200, json: async () => { throw new Error("Private upstream HTML"); } }, 3],
        [new Error("Private network diagnostics"), 3]
    ];
    for (const [response, expectedCalls] of responses) {
        let calls = 0;
        await assert.rejects(ping("https://synthetic.onrender.com", { retryDelayMs: 1, fetchImpl: async () => {
            calls++; if (response instanceof Error) throw response; return response;
        } }), (error) => { assert.match(error.message, /Health check failed/); assert.doesNotMatch(error.message, /Private/); return true; });
        assert.equal(calls, expectedCalls);
    }
});

test("keep-alive recovers from transient HTTP errors, network errors and wake-up HTML", async () => {
    const failures = [
        ...[408, 429, 500, 502, 503, 504].map(status => ({ status })),
        new Error("private connection details"),
        { status: 200, json: async () => { throw new SyntaxError("private HTML"); } }
    ];
    for (const failure of failures) {
        let calls = 0;
        const logs = [];
        const result = await ping("https://synthetic.onrender.com", {
            retryDelayMs: 1, onRetry: message => logs.push(message),
            fetchImpl: async () => {
                if (++calls < 3) {
                    if (failure instanceof Error) throw failure;
                    return failure;
                }
                return { status: 200, json: async () => ({ success: true, project: "VectorForge" }) };
            }
        });
        assert.deepEqual(result, { healthy: true });
        assert.equal(calls, 3); assert.equal(logs.length, 2);
        assert.doesNotMatch(logs.join(" "), /private/);
    }
});

test("permanent HTTP failures retain safe status diagnostics and cancel unused response bodies", async () => {
    for (const status of [301, 400, 401, 403, 404]) {
        let calls = 0, cancelled = 0;
        await assert.rejects(ping("https://synthetic.onrender.com", { fetchImpl: async () => {
            calls++;
            return { status, body: { cancel: async () => { cancelled++; } } };
        } }), new RegExp(`HTTP ${status}`));
        assert.equal(calls, 1); assert.equal(cancelled, 1);
    }
});

test("the overall deadline also cancels retry backoff without issuing late requests", async () => {
    let calls = 0;
    await assert.rejects(ping("https://synthetic.onrender.com", {
        timeoutMs: 20, retryDelayMs: 1000,
        fetchImpl: async () => { calls++; return { status: 503 }; }
    }), /timed out/);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(calls, 1);
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
