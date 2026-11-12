const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { Worker } = require("node:worker_threads");
const path = require("node:path");
test("resource admission rejects overlapping jobs and releases once on finish/close", () => {
    const gate = require("../src/middleware/workLimiter");
    const response = () => Object.assign(new EventEmitter(), { code: 200, headers: {},
        set(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; } });
    const first = response(), second = response(), third = response(); let admitted = 0;
    gate({}, first, () => admitted++); gate({}, second, () => admitted++);
    assert.equal(admitted, 1); assert.equal(second.code, 503); assert.equal(second.headers["Retry-After"], "2");
    first.emit("finish"); gate({}, third, () => admitted++); assert.equal(admitted, 2);
    first.emit("close"); const stillBusy = response(); gate({}, stillBusy, () => admitted++);
    assert.equal(stillBusy.code, 503); third.emit("close");
    const fourth = response(); gate({}, fourth, () => admitted++); assert.equal(admitted, 3); fourth.emit("finish");
});
test("benchmark worker measures real algorithms on synthetic fixtures without mutating the source", async () => {
    const dataset = Array.from({ length: 24 }, (_, i) => ({ id: "fixture-" + i, values: [i / 24, (i * 7) % 13] }));
    const before = structuredClone(dataset); let ticks = 0;
    const ticker = setInterval(() => ticks++, 1);
    const worker = new Worker(path.join(__dirname, "../src/services/benchmark.worker.js"), { workerData: { dataset, runs: 2 } });
    try {
        const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Benchmark worker test timed out")), 10000);
            worker.once("message", (data) => { clearTimeout(timeout); resolve(data); });
            worker.once("error", (error) => { clearTimeout(timeout); reject(error); });
        });
        assert.equal(result.status, 200); assert.equal(result.data.datasetSize, 24); assert.equal(result.data.runs, 2);
        for (const stats of Object.values(result.data.results)) {
            assert.ok(parseFloat(stats.averageExecutionTime) > 0); assert.ok(parseFloat(stats.recall) >= 0 && parseFloat(stats.recall) <= 100);
        }
        assert.equal(result.data.results.kdTree.recall, "100.00%");
        assert.ok(ticks > 0); assert.deepEqual(dataset, before);
    } finally { clearInterval(ticker); await worker.terminate(); }
});

test("disconnect does not admit another job while bounded asynchronous work is still running", async () => {
    const gate = require("../src/middleware/workLimiter");
    const response = () => Object.assign(new EventEmitter(), { set() {}, status(code) { this.code = code; return this; }, json() {} });
    const req = {}, res = response(); let finish;
    gate(req, res, () => {});
    const pending = gate.run(async () => new Promise((resolve) => { finish = resolve; }))(req, res, assert.fail);
    res.emit("close"); const denied = response(); gate({}, denied, () => assert.fail("active work must keep its slot")); assert.equal(denied.code, 503);
    finish(); await pending;
    const accepted = response(); let admitted = false; gate({}, accepted, () => { admitted = true; }); assert.equal(admitted, true); accepted.emit("finish");
});
