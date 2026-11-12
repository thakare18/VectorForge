import { test } from "node:test";
import assert from "node:assert/strict";
import { harness } from "./helpers/harness.js";

test("stalled auth transport is aborted, exposes a useful timeout and allows the next attempt", async () => {
  const h = await harness();
  const { default: api, AUTH_TIMEOUT_MS } = await h.use("services/api.js");
  assert.equal(AUTH_TIMEOUT_MS, 15000);
  let aborted = false;
  h.setAdapter((config) => new Promise((resolve, reject) => {
    config.signal.addEventListener("abort", () => { aborted = true; reject({ config, code: "ERR_CANCELED" }); }, { once: true });
  }));
  await assert.rejects(api.post("/api/auth/register", {}, { timeout: 25 }), (error) => error.code === "ETIMEDOUT" && /taking too long/.test(error.message));
  assert.equal(aborted, true);
  h.setAdapter(async (config) => ({ config, status: 202, headers: {}, data: { success: true, message: "Check email if eligible" } }));
  assert.equal((await api.post("/api/auth/register", {})).status, 202);
});

test("public sign-in requests ignore old credentials and do not invalidate another stored session", async () => {
  const h = await harness({ vf_auth: { token: "old-session", user: { id: "old-user" } } });
  const { default: api } = await h.use("services/api.js");
  h.setAdapter(async (config) => {
    assert.equal(config.headers.Authorization, undefined);
    throw { config, response: { status: 401, data: { message: "Invalid email or password." } } };
  });
  await assert.rejects(api.post("/api/auth/login", {}), (error) => error.status === 401 && error.response.data.message === error.message);
  assert.deepEqual(h.events, []);
  h.setAdapter(async (config) => {
    assert.equal(config.headers.Authorization, "Bearer old-session");
    assert.equal(config.timeout, 15000);
    return { config, status: 200, headers: {}, data: { user: { id: "old-user" } } };
  });
  await api.get("/api/auth/me");
});

test("auth deadlines clean up after success and preserve caller cancellation and server errors", async () => {
  const h = await harness(), { default: api } = await h.use("services/api.js");
  let signal;
  h.setAdapter(async (config) => { signal = config.signal; return { config, status: 200, headers: {}, data: {} }; });
  await api.post("/api/auth/login", {}, { timeout: 20 });
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(signal.aborted, false);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(api.post("/api/auth/login", {}, { signal: controller.signal }), (error) => error.code === "ERR_CANCELED");
  for (const status of [429, 503]) {
    h.setAdapter(async (config) => { throw { config, response: { status, data: { message: "Please try again later." } } }; });
    await assert.rejects(api.post("/api/auth/login", {}), (error) => error.status === status && error.message === "Please try again later.");
  }
});

test("network failures are readable and expensive feature requests retain their timeout budget", async () => {
  const h = await harness(), { default: api } = await h.use("services/api.js");
  h.setAdapter(async (config) => { throw { config, code: "ERR_NETWORK" }; });
  await assert.rejects(api.post("/api/auth/register", {}), /Cannot reach the server/);
  h.setAdapter(async (config) => {
    assert.equal(config.timeout, 60000); assert.equal(config.signal, undefined);
    return { config, status: 200, headers: {}, data: {} };
  });
  await api.post("/api/ai/rag", {});
});
