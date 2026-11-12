import { test } from "node:test";
import assert from "node:assert/strict";
import { harness } from "./helpers/harness.js";
test("canonical backend URL, legacy migration fallback and normalization align auth/general clients", async () => {
  for (const [env, expected] of [
    [{ VITE_API_URL: "https://canonical.test/", VITE_API_BASE_URL: "https://old.test" }, "https://canonical.test"],
    [{ VITE_API_BASE_URL: "https://legacy.test/" }, "https://legacy.test"],
    [{}, "http://localhost:3000"]
  ]) {
    const h = await harness({}, false, env);
    const { DEFAULT_BACKEND_URL } = await h.use("utils/constants.js"); assert.equal(DEFAULT_BACKEND_URL, expected);
    const urls = [];
    h.setAdapter(async (config) => { urls.push(config.baseURL); return { config, status: 200, headers: {}, data: {} }; });
    await (await h.use("services/auth.service.js")).login({ email: "synthetic@example.test", password: "synthetic" });
    await (await h.use("services/vector.service.js")).getVectors();
    assert.deepEqual(urls, [expected, expected]);
  }
  const h = await harness(), { normalizeBackendUrl } = await h.use("utils/backendUrl.js");
  for (const invalid of ["ftp://host.test", "https://user:secret@host.test", "https://host.test/path", "https://host.test?token=x"]) assert.throws(() => normalizeBackendUrl(invalid));
});
test("single-flight upload rejects overlap and permits retry after success or failure", async () => {
  const h = await harness(), { singleFlight } = await h.use("utils/workflows.js");
  let finish, calls = 0;
  const operation = singleFlight(() => { calls++; return new Promise((resolve) => { finish = resolve; }); });
  const first = operation(); await assert.rejects(operation(), /already in progress/); assert.equal(calls, 1);
  finish("done"); assert.equal(await first, "done");
  const second = operation(); finish("retry"); assert.equal(await second, "retry"); assert.equal(calls, 2);
  let failedCalls = 0; const fails = singleFlight(async () => { failedCalls++; throw new Error("failure"); });
  await assert.rejects(fails()); await assert.rejects(fails()); assert.equal(failedCalls, 2);
});
test("clipboard helper awaits actual completion and propagates denied/unavailable clipboard", async () => {
  const { copyText } = await (await harness()).use("utils/workflows.js");
  let finish, copied = false;
  const pending = copyText("answer", { writeText: () => new Promise((resolve) => { finish = resolve; }) }).then(() => { copied = true; });
  await Promise.resolve(); assert.equal(copied, false); finish(); await pending; assert.equal(copied, true);
  await assert.rejects(copyText("answer", {}));
  await assert.rejects(copyText("answer", { writeText: async () => { throw new Error("denied"); } }));
});
test("playback frame obeys only the supplied step including reset, repeat visits, edges and split visibility", async () => {
  const { playbackFrame } = await (await harness()).use("utils/workflows.js");
  const trace = { visitedNodes: ["a", "b"], searchPath: ["a", "b", "a"],
    hnswEdges: [{ from: "a", to: "b", step: 1 }], kdTreeSplits: [{ axis: 0 }, { axis: 1 }] };
  const start = playbackFrame(trace, 0); assert.equal(start.activeId, "a"); assert.equal(start.edges.length, 0); assert.equal(start.splits.length, 1);
  const next = playbackFrame(trace, 1); assert.equal(next.activeId, "b"); assert.equal(next.edges.length, 1);
  assert.equal(playbackFrame(trace, 2).activeId, "a");
  assert.equal(playbackFrame(trace, 0).pathIds.length, 1);
  assert.equal(playbackFrame(trace, 100).activeId, "a");
});
test("KD split lines and point normalization share bounds including an outside query and subtree clipping", async () => {
  const { projectTo2D, normalizePoints, splitLine } = await (await harness()).use("utils/vectorProjection.js");
  const points = projectTo2D([{ id: "a", values: [0, 0] }, { id: "b", values: [1, 1] }, { id: "query", values: [5, -2] }]);
  const normalized = normalizePoints(points);
  const line = splitLine({ axis: 0, value: 1, bounds: {} }, points);
  assert.equal(line.x1, normalized.find((p) => p.id === "b").px); assert.equal(line.x2, line.x1);
  const horizontal = splitLine({ axis: 1, value: 0, bounds: { 0: [0, 1] } }, points);
  assert.equal(horizontal.y1, normalized.find((p) => p.id === "a").py);
  assert.equal(horizontal.x2, normalized.find((p) => p.id === "b").px);
  assert.equal(splitLine({ axis: 2, value: 0 }, points), null);
});
test("RAG threshold, vector pagination and upload idempotency metadata reach existing workflows", async () => {
  const h = await harness(), seen = [];
  h.setAdapter(async (config) => { seen.push(config); return { config, status: 200, headers: {}, data: {} }; });
  await (await h.use("services/ai.service.js")).ragChat("question", 0.8);
  assert.equal(JSON.parse(seen[0].data).similarityThreshold, 0.8);
  await (await h.use("services/vector.service.js")).getVectors({ offset: 32, limit: 100 });
  assert.equal(seen[1].params.offset, 32);
  const { store } = await h.use("store/store.js");
  const { addUpload } = await h.use("store/slices/uploadSlice.js");
  store.dispatch(addUpload({ documentId: "same", totalChunks: 2 })); store.dispatch(addUpload({ documentId: "same", totalChunks: 2 }));
  assert.equal(store.getState().upload.history.length, 1);
});
test("metadata rendering helpers tolerate legacy malformed fields; variable-size pages navigate back correctly", async () => {
  const { metadataText, movePage } = await (await harness()).use("utils/workflows.js");
  for (const value of [undefined, null, {}, [], 12]) assert.equal(metadataText(value, "--"), "--");
  assert.equal(metadataText("text"), "text");
  let state = { offset: 0, history: [] };
  state = movePage(state, "next", 32); state = movePage(state, "next", 32);
  assert.equal(state.offset, 64); state = movePage(state, "previous");
  assert.equal(state.offset, 32); state = movePage(state, "previous"); assert.equal(state.offset, 0);
});

test("dashboard health and persisted statistics fail independently without stale local upload counts", async () => {
  const { dashboardSnapshot } = await (await harness()).use("utils/workflows.js");
  const result = await dashboardSnapshot(async () => ({ data: { success: true } }), async () => { throw new Error("storage unavailable"); });
  assert.equal(result.health.success, true); assert.equal(result.vectors, null); assert.equal(result.error, true);
  const stored = { statistics: { totalDocuments: 2 }, recentUploads: [{ documentId: "server", chunks: 3 }] };
  const next = await dashboardSnapshot(async () => { throw new Error("health unavailable"); }, async () => ({ data: stored }));
  assert.equal(next.health, null); assert.equal(next.vectors.statistics.totalDocuments, 2); assert.equal(next.vectors.recentUploads[0].documentId, "server");
});
