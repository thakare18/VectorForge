import { normalizeBackendUrl } from "../utils/backendUrl";
import axios from "axios";
import { getItem } from "../utils/storage";
import { STORAGE_KEYS, DEFAULT_BACKEND_URL } from "../utils/constants";

export const getBaseUrl = () => {
  if (import.meta.env.PROD) return DEFAULT_BACKEND_URL;
  const settings = getItem(STORAGE_KEYS.settings, {});
  return normalizeBackendUrl(settings.backendUrl || DEFAULT_BACKEND_URL);
};

const api = axios.create({
  timeout: 60000,
});

export const AUTH_TIMEOUT_MS = 15000;
const publicAuthPaths = new Set(["register", "login", "forgot-password", "reset-password", "verify-email", "exchange"].map((name) => `/api/auth/${name}`));
const finishRequest = (config) => config?._authDeadline?.dispose();

api.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl();
  const auth = getItem(STORAGE_KEYS.auth);
  if (publicAuthPaths.has(config.url)) {
    delete config.headers.Authorization;
  } else if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  if (config.url?.startsWith("/api/auth/")) {
    const timeout = Number.isFinite(config.timeout) && config.timeout > 0 ? Math.min(config.timeout, AUTH_TIMEOUT_MS) : AUTH_TIMEOUT_MS;
    config.timeout = timeout;
    const controller = new AbortController(), originalSignal = config.signal;
    const abort = () => controller.abort();
    const deadline = { expired: false, dispose: () => { clearTimeout(timer); originalSignal?.removeEventListener("abort", abort); } };
    const timer = setTimeout(() => { deadline.expired = true; controller.abort(); }, timeout);
    if (originalSignal?.aborted) abort();
    else originalSignal?.addEventListener("abort", abort, { once: true });
    config.signal = controller.signal;
    config._authDeadline = deadline;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    finishRequest(response.config);
    const sent = response.config.headers.Authorization;
    if (sent && sent !== `Bearer ${getItem(STORAGE_KEYS.auth)?.token}`) throw new Error("Session changed.");
    return response;
  },
  (error) => {
    finishRequest(error.config);
    const status = error.response?.status;
    if (status === 401 && error.config?.headers?.Authorization === `Bearer ${getItem(STORAGE_KEYS.auth)?.token}`) {
      window.dispatchEvent(new Event("vf-session-invalid"));
    }
    const timedOut = error.config?._authDeadline?.expired || ["ECONNABORTED", "ETIMEDOUT"].includes(error.code);
    const message = timedOut
      ? "The server is taking too long to respond. Please try again shortly."
      : error.response?.data?.message || (error.response
        ? "The request could not be completed. Please try again."
        : "Cannot reach the server. Check your connection and try again.");

    const enriched = new Error(message);
    enriched.status = status;
    enriched.code = timedOut ? "ETIMEDOUT" : error.code;
    enriched.response = error.response;
    enriched.isNetworkError = !error.response;
    throw enriched;
  }
);

export default api;
