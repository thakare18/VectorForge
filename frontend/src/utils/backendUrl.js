export function normalizeBackendUrl(value, { production = false } = {}) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Backend URL must be a valid HTTP(S) origin."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    throw new Error("Backend URL must be an HTTP(S) origin without a path or credentials.");
  }
  if (production && (url.protocol !== "https:" || /^(localhost|127\.|0\.|\[::1\])/.test(url.hostname) || url.hostname.endsWith(".localhost"))) {
    throw new Error("Production requires a non-local HTTPS backend origin.");
  }
  return url.origin;
}
export function resolveBackendUrl(env = {}) {
  const configured = env.VITE_API_URL || env.VITE_API_BASE_URL;
  if (env.PROD && !configured) throw new Error("Set VITE_API_URL before building for production.");
  return normalizeBackendUrl(configured || "http://localhost:3000", { production: Boolean(env.PROD) });
}
export function validatePublicEnv(env) {
  if (env.PROD && env.NODE_ENV && env.NODE_ENV !== "production") {
    throw new Error("Production builds require NODE_ENV=production.");
  }
  const allowed = new Set(["VITE_API_URL", "VITE_API_BASE_URL"]);
  for (const key of Object.keys(env)) {
    if (key.startsWith("VITE_") && !allowed.has(key)) throw new Error("Unsupported public environment variable: " + key);
  }
  return resolveBackendUrl(env);
}
