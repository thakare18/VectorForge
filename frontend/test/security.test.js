import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { webcrypto } from "node:crypto";

import { harness } from "./helpers/harness.js";

test("storage denied/quota errors do not crash auth or chat; memory values are detached from Immer proxies", async () => {
  const h = await harness({}, true);
  const { store } = await h.use("store/store.js");
  const auth = await h.use("store/slices/authSlice.js");
  const chat = await h.use("store/slices/chatSlice.js");
  const storage = await h.use("utils/storage.js");
  store.dispatch(auth.loginSuccess({ token: "synthetic", user: { id: "alice", name: "Alice" } }));
  assert.equal(storage.getItem("vf_auth").user.name, "Alice");
  for (let i = 0; i < 120; i++) store.dispatch(chat.addMessage({ content: "message-" + i }));
  assert.equal(store.getState().chat.messages.length, 100);
  assert.equal(storage.getItem("vf_chat_history").length, 100);
  store.dispatch(auth.logout());
  assert.equal(storage.getItem("vf_auth"), null);
  assert.equal(store.getState().chat.messages.length, 0);
});
test("stored token starts unauthenticated until server hydration; logout and account switches clear private slices", async () => {
  const h = await harness({ vf_auth: { token: "synthetic", user: { id: "alice" } }, vf_chat_history: [{ content: "private" }] });
  const { store } = await h.use("store/store.js");
  const auth = await h.use("store/slices/authSlice.js");
  assert.equal(store.getState().auth.isAuthenticated, false); assert.equal(store.getState().auth.checking, true);
  store.dispatch(auth.loginSuccess({ token: "synthetic", user: { id: "alice" } }));
  assert.equal(store.getState().auth.isAuthenticated, true); assert.equal(store.getState().auth.checking, false);
  store.dispatch({ type: "search/setVectorsData", payload: { data: [{ id: "private-vector" }] } });
  store.dispatch({ type: "upload/addUpload", payload: { name: "private.pdf" } });
  store.dispatch(auth.loginSuccess({ token: "bob-token", user: { id: "bob" } }));
  assert.equal(store.getState().chat.messages.length, 0);
  assert.equal(store.getState().upload.history.length, 0);
  assert.equal(store.getState().search.vectors.length, 0);
  store.dispatch(auth.logout()); assert.equal(store.getState().auth.token, null);
  assert.equal(h.data.has("vf_chat_history"), false);
});
test("API sends current session token and emits invalid-session only for matching 401; outages preserve session", async () => {
  const h = await harness({ vf_auth: { token: "synthetic", user: { id: "alice" } } });
  const { default: api } = await h.use("services/api.js");
  let captured;
  h.setAdapter(async (config) => { captured = config; return { data: { user: { id: "alice" } }, status: 200, headers: {}, config }; });
  assert.equal((await api.get("/api/auth/me")).data.user.id, "alice");
  assert.equal(captured.headers.Authorization, "Bearer synthetic");
  for (const status of [503, 401]) {
    h.setAdapter(async (config) => { throw { config, response: { status, data: { message: "Synthetic failure" } } }; });
    await assert.rejects(api.get("/api/auth/me"), (error) => error.status === status);
  }
  assert.deepEqual(h.events, ["vf-session-invalid"]);
});
test("late API responses from a previous user's session are rejected", async () => {
  const h = await harness({ vf_auth: { token: "alice-token" } });
  const { default: api } = await h.use("services/api.js");
  const storage = await h.use("utils/storage.js");
  h.setAdapter(async (config) => {
    storage.setItem("vf_auth", { token: "bob-token" });
    return { data: { private: "Alice" }, status: 200, headers: {}, config };
  });
  await assert.rejects(api.get("/api/vectors"), /Session changed/);
});
test("OAuth initiation uses cryptographic browser verifier, SHA256 challenge, configured backend and fails closed without session storage", async () => {
  const h = await harness();
  const { startOAuth } = await h.use("services/auth.service.js");
  await startOAuth("github");
  const verifier = h.session.get("vf_oauth_verifier");
  assert.match(verifier, /^[a-f0-9]{64}$/);
  const url = new URL(h.redirects[0]); assert.equal(url.origin, "https://backend.test");
  assert.equal(url.pathname, "/api/auth/github");
  const expected = Buffer.from(await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))).toString("base64url");
  assert.equal(url.searchParams.get("challenge"), expected); assert.equal(url.searchParams.has("verifier"), false);
  const denied = await harness({}, true);
  await assert.rejects((await denied.use("services/auth.service.js")).startOAuth("google"), /session storage/);
  assert.equal(denied.redirects.length, 0);
});
test("login stores no duplicate legacy credentials and uses the shared API backend", async () => {
  const h = await harness({ vf_settings: { backendUrl: "https://custom-backend.test" } });
  h.setAdapter(async (config) => {
    assert.equal(config.baseURL, "https://custom-backend.test");
    return { data: { token: "synthetic", user: { id: "alice" } }, status: 200, headers: {}, config };
  });
  assert.equal((await (await h.use("services/auth.service.js")).login({ email: "a@example.test", password: "synthetic" })).token, "synthetic");
  assert.equal(h.data.has("vectorforge_token"), false); assert.equal(h.data.has("vectorforge_user"), false);
});

test("session hydration validates with the server; invalid sessions clear state and cross-tab account changes reload private state", async () => {
  const h = await harness({ vf_auth: { token: "synthetic", user: { id: "alice" } } });
  const { store } = await h.use("store/store.js");
  const { loginSuccess, logout } = await h.use("store/slices/authSlice.js");
  const { revalidateSession, watchSession } = await h.use("services/session.service.js");
  const stop = watchSession(() => store.dispatch(logout()));
  h.setAdapter(async (config) => ({ config, status: 200, headers: {}, data: { user: { id: "alice", name: "Fresh server name" } } }));
  store.dispatch(loginSuccess(await revalidateSession("synthetic")));
  assert.equal(store.getState().auth.user.name, "Fresh server name");
  h.listeners.get("storage")({ key: "vf_settings" }); assert.equal(h.reloadCount(), 0);
  h.listeners.get("storage")({ key: "vf_auth" }); assert.equal(h.reloadCount(), 1);
  h.setAdapter(async (config) => { throw { config, response: { status: 401, data: {} } }; });
  await assert.rejects(revalidateSession("synthetic"));
  assert.equal(store.getState().auth.isAuthenticated, false); assert.equal(store.getState().auth.token, null);
  stop(); assert.equal(h.listeners.size, 0);
});
