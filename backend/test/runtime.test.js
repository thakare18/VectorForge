const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { EventEmitter } = require("node:events");
const { startRuntime, startupFailureMessage } = require("../src/server");
const { healthCheck, readyCheck } = require("../src/controllers/health.controller");
const mongoose = require("mongoose");
const logger = { info() {}, error() {} };
const processMock = () => Object.assign(new EventEmitter(), { exits: [], exit(code) { this.exits.push(code); } });
test("Mongo authentication startup failures are actionable without exposing credentials", async () => {
    const secret = "mongodb+srv://synthetic:private-password@example.invalid/db";
    const error = Object.assign(new Error(secret), { code: 18 });
    const app = express(), p = processMock(), logs = [];
    const runtime = await startRuntime({ app, port: 0, processRef: p, logger: { info() {}, error: (message) => logs.push(message) },
        connect: async () => { throw error; }, disconnect: async () => {} });
    assert.equal(runtime, null); assert.equal(app.locals.ready, false); assert.deepEqual(p.exits, [1]);
    assert.match(logs.join(" "), /Database authentication failed.*MONGODB_URI/);
    assert.doesNotMatch(logs.join(" "), /private-password|example.invalid|mongodb\+srv/);
    assert.match(startupFailureMessage({ cause: { codeName: "AuthenticationFailed" } }), /Database authentication failed/);
    assert.doesNotMatch(startupFailureMessage(new Error(secret)), /private-password/);
});
test("runtime waits for database/indexes, binds exact port, closes HTTP and database on SIGTERM", async () => {
    const app = express(); app.get("/", (req, res) => res.json({ ready: app.locals.ready }));
    const p = processMock(), order = [];
    const runtime = await startRuntime({ app, port: 0, host: "127.0.0.1", processRef: p, logger,
        connect: async () => order.push("connect"), initialize: async () => order.push("indexes"),
        disconnect: async () => order.push("disconnect") });
    assert.deepEqual(order, ["connect", "indexes"]); assert.equal(app.locals.ready, true);
    assert.equal((await fetch("http://127.0.0.1:" + runtime.server.address().port)).status, 200);
    assert.equal(runtime.server.requestTimeout, 60000);
    assert.equal(runtime.server.headersTimeout, 15000);
    p.emit("SIGTERM");
    await runtime.shutdown();
    assert.equal(app.locals.ready, false); assert.equal(app.locals.draining, true);
    assert.deepEqual(order, ["connect", "indexes", "disconnect"]); assert.deepEqual(p.exits, [0]);
    assert.equal(p.listenerCount("SIGTERM"), 0);
});
test("occupied port and unavailable database fail closed without selecting another port", async () => {
    const occupied = express().listen(0, "127.0.0.1");
    await new Promise((resolve) => occupied.once("listening", resolve));
    try {
        for (const failedDB of [false, true]) {
            const app = express(), p = processMock(); let disconnected = 0;
            const runtime = await startRuntime({ app, port: occupied.address().port, host: "127.0.0.1", processRef: p, logger,
                connect: async () => { if (failedDB) throw new Error("sensitive URI"); },
                disconnect: async () => disconnected++ });
            assert.equal(runtime, null); assert.equal(app.locals.ready, false);
            assert.equal(disconnected, 1); assert.deepEqual(p.exits, [1]);
        }
    } finally { await new Promise((resolve) => occupied.close(resolve)); }
});
test("fatal process failures trigger sanitized shutdown and cleanup", async () => {
    for (const event of ["unhandledRejection", "uncaughtException"]) {
        const p = processMock(), app = express(), logs = []; let closed = false;
        const runtime = await startRuntime({ app, port: 0, host: "127.0.0.1", processRef: p,
            connect: async () => {}, disconnect: async () => { closed = true; }, logger: { info: (v) => logs.push(v), error: (v) => logs.push(v) } });
        p.emit(event, new Error("synthetic-password-secret"));
        await runtime.shutdown();
        assert.equal(closed, true); assert.deepEqual(p.exits, [1]);
        assert.doesNotMatch(logs.join(" "), /synthetic-password-secret/);
    }
});
test("readiness distinguishes liveness, startup, database outages and shutdown", async () => {
    const originalState = mongoose.connection.readyState, originalDB = mongoose.connection.db;
    const response = () => ({ code: 200, set() { return this; }, status(v) { this.code = v; return this; }, json(v) { this.data = v; return this; } });
    try {
        const req = { app: { locals: { ready: false } } };
        const live = response(); healthCheck(req, live); assert.equal(live.code, 200);
        let res = response(); await readyCheck(req, res); assert.equal(res.code, 503);
        req.app.locals.ready = true; mongoose.connection.readyState = 1; mongoose.connection.db = { command: async () => ({ ok: 1 }) };
        res = response(); await readyCheck(req, res); assert.equal(res.code, 200);
        mongoose.connection.db.command = async () => { throw new Error("private connection detail"); };
        res = response(); await readyCheck(req, res); assert.equal(res.code, 503); assert.doesNotMatch(JSON.stringify(res.data), /private/);
        req.app.locals.draining = true;
        res = response(); await readyCheck(req, res); assert.equal(res.code, 503);
    } finally { mongoose.connection.readyState = originalState; mongoose.connection.db = originalDB; }
});
