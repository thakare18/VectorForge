import api, { getBaseUrl } from "./api";
import { getItem, removeItem } from "../utils/storage";
import { STORAGE_KEYS } from "../utils/constants";
export const register = async (data) => (await api.post("/api/auth/register", data)).data;
export const login = async (data) => (await api.post("/api/auth/login", data)).data;
export const forgotPassword = async (email) => (await api.post("/api/auth/forgot-password", { email })).data;
export const resetPassword = async (token, password) => (await api.post("/api/auth/reset-password", { token, password })).data;
export const verifyEmail = async (token) => (await api.post("/api/auth/verify-email", { token })).data;
export const logout = () => ["vectorforge_token", "vectorforge_user", STORAGE_KEYS.auth].forEach(removeItem);
export const getToken = () => getItem(STORAGE_KEYS.auth)?.token;
export const getCurrentUser = () => getItem(STORAGE_KEYS.auth)?.user;
export const isAuthenticated = () => Boolean(getToken());
export const startOAuth = async (provider) => {
  if (!["google", "github"].includes(provider)) throw new Error("Unsupported provider.");
  const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const challenge = btoa(String.fromCharCode(...digest)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  // Must survive the navigation; fail safely rather than starting an unbound flow.
  try { sessionStorage.setItem("vf_oauth_verifier", verifier); }
  catch { throw new Error("Allow session storage in this browser to use social sign-in."); }
  window.location.assign(`${getBaseUrl()}/api/auth/${provider}?challenge=${encodeURIComponent(challenge)}`);
};
