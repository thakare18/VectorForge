import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveBackendUrl, validatePublicEnv } from "../src/utils/backendUrl.js";
import { harness } from "./helpers/harness.js";

const vercelMetadata = Object.fromEntries([
  "ENV", "TARGET_ENV", "URL", "BRANCH_URL", "PROJECT_PRODUCTION_URL", "DEPLOYMENT_ID", "PROJECT_ID",
  "GIT_PROVIDER", "GIT_REPO_SLUG", "GIT_REPO_OWNER", "GIT_REPO_ID", "GIT_COMMIT_REF", "GIT_COMMIT_SHA",
  "GIT_COMMIT_MESSAGE", "GIT_COMMIT_AUTHOR_LOGIN", "GIT_COMMIT_AUTHOR_NAME", "GIT_PREVIOUS_SHA", "GIT_PULL_REQUEST_ID"
].map((name) => [`VITE_VERCEL_${name}`, "synthetic-metadata"]));

test("Vercel-injected framework metadata does not reject production or preview builds or replace the backend origin", () => {
  assert.equal(validatePublicEnv({ PROD: true, VITE_API_URL: "https://backend.test",
    VITE_VERCEL_GIT_REPO_ID: "synthetic-repo-id" }), "https://backend.test");
  assert.equal(validatePublicEnv({ PROD: true, VITE_API_URL: "https://backend.test",
    VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG: "synthetic-observability-config",
    VITE_VERCEL_FUTURE_METADATA: "synthetic-future-metadata" }), "https://backend.test");
  for (const target of ["production", "preview"]) {
    assert.equal(validatePublicEnv({ ...vercelMetadata, PROD: true, NODE_ENV: "production",
      VITE_VERCEL_ENV: target, VITE_VERCEL_URL: "frontend-deployment.vercel.app",
      VITE_API_URL: "https://backend.test" }), "https://backend.test");
  }
});

test("allowing Vercel metadata does not allow arbitrary application secrets or API-prefix lookalikes", () => {
  // Platform-prefixed values are tested for exclusion from actual built output
  // in vercel-build.test.js; application-prefixed secrets still fail closed.
  for (const key of ["VITE_GEMINI_KEY", "VITE_JWT_SECRET", "VITE_API_URL_SECRET", "VITE_API_BASE_URL_TOKEN", "VITE_VERCELSECRET"]) {
    assert.throws(() => validatePublicEnv({ ...vercelMetadata, PROD: true, VITE_API_URL: "https://backend.test",
      [key]: "synthetic-private-value" }), (error) => error.message.includes(key) && !error.message.includes("synthetic-private-value"));
  }
});

test("Vercel metadata cannot bypass the required production HTTPS API origin", () => {
  for (const value of [undefined, "http://backend.test", "https://localhost"]) {
    assert.throws(() => validatePublicEnv({ ...vercelMetadata, PROD: true, VITE_API_URL: value }), /VITE_API_URL|HTTPS backend origin/);
  }
});
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
