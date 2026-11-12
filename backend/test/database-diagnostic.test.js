const { test } = require("node:test");
const assert = require("node:assert/strict");
const { checkDatabase } = require("../src/scripts/checkDatabase");

test("database diagnostic only connects, pings and closes without reading or mutating records", async () => {
    const calls = [], logs = [];
    class Client {
        constructor(uri, options) { assert.equal(uri, "synthetic-uri"); assert.equal(options.serverSelectionTimeoutMS, 5000); }
        async connect() { calls.push("connect"); }
        db() { return { command: async (command) => { assert.deepEqual(command, { ping: 1 }); calls.push("ping"); } }; }
        async close() { calls.push("close"); }
    }
    assert.equal(await checkDatabase("synthetic-uri", { Client, logger: { info: (s) => logs.push(s), error: (s) => logs.push(s) } }), true);
    assert.deepEqual(calls, ["connect", "ping", "close"]);
    assert.match(logs[0], /verified/);
});

test("database diagnostic fails safely for missing, malformed and rejected credentials", async () => {
    for (const mode of ["missing", "parse", "auth"]) {
        const logs = []; let closed = false;
        class Client {
            constructor() { if (mode === "parse") throw new Error("private-uri-secret"); }
            async connect() { throw Object.assign(new Error("private-uri-secret"), { code: 18 }); }
            async close() { closed = true; }
        }
        assert.equal(await checkDatabase(mode === "missing" ? "" : "private-uri-secret", { Client, logger: { info: (s) => logs.push(s), error: (s) => logs.push(s) } }), false);
        assert.doesNotMatch(logs.join(" "), /private-uri-secret/);
        if (mode === "auth") { assert.equal(closed, true); assert.match(logs.join(" "), /authentication failed/); }
    }
});
