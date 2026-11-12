import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveBackendUrl, validatePublicEnv } from "../src/utils/backendUrl.js";
import { harness } from "./helpers/harness.js";
test("production rejects missing, HTTP and local backend origins without printing values", () => {
  for (const url of [undefined, "", "http://backend.test", "https://localhost", "https://127.0.0.1", "https://[::1]", "https://foo.localhost"]) {
    assert.throws(() => resolveBackendUrl({ PROD: true, VITE_API_URL: url }));
  }
  assert.equal(resolveBackendUrl({ PROD: true, VITE_API_BASE_URL: "https://backend.test/" }), "https://backend.test");
  assert.throws(() => validatePublicEnv({ PROD: true, VITE_API_URL: "https://backend.test", VITE_GEMINI_KEY: "synthetic-secret" }), (error) => !error.message.includes("synthetic-secret"));
  assert.throws(() => validatePublicEnv({ PROD: true, NODE_ENV: "development", VITE_API_URL: "https://backend.test" }), /NODE_ENV/);
});
test("production auth and general APIs ignore stale browser origin overrides", async () => {
  const h = await harness({ vf_settings: { backendUrl: "http://localhost:3000" } }, false, { PROD: true, VITE_API_URL: "https://backend.test" });
  const { STORAGE_KEYS } = await h.use("utils/constants.js");
  h.data.set(STORAGE_KEYS.settings, JSON.stringify({ backendUrl: "https://untrusted.test" }));
  const { getBaseUrl } = await h.use("services/api.js"); assert.equal(getBaseUrl(), "https://backend.test");
  const { store } = await h.use("store/store.js");
  const { updateSettings } = await h.use("store/slices/settingsSlice.js");
  store.dispatch(updateSettings({ backendUrl: "http://localhost:3000" }));
  assert.equal(store.getState().settings.backendUrl, "https://backend.test");
});
