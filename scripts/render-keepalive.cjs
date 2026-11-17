// Standalone: no npm install, .env loading, credentials, database or AI calls.
function healthUrl(origin) {
    let url;
    try { url = new URL(origin); } catch { throw new Error("Set RENDER_BACKEND_URL to the public Render HTTPS origin."); }
    if (url.protocol !== "https:" || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.onrender\.com$/.test(url.hostname) ||
        url.username || url.password || url.port || url.search || url.hash || url.pathname !== "/") {
        throw new Error("RENDER_BACKEND_URL must be an HTTPS onrender.com origin without credentials, port, path or query.");
    }
    return new URL("/health", url).href;
}

class HealthFailure extends Error {
    constructor(reason, retryable) {
        super(`Health check failed: ${reason}. Inspect Render service logs.`);
        this.retryable = retryable;
    }
}

async function check(url, fetchImpl, signal) {
    let response;
    try {
        response = await fetchImpl(url, {
            method: "GET", redirect: "error", signal,
            headers: { Accept: "application/json", "Cache-Control": "no-cache" }
        });
    } catch {
        throw new HealthFailure("network connection, TLS or redirect error", true);
    }
    if (response.status !== 200) {
        // Do not read or log hosting error pages.
        try { await response.body?.cancel(); } catch { /* Preserve the HTTP diagnosis. */ }
        const status = Number.isInteger(response.status) ? response.status : 0;
        throw new HealthFailure(`HTTP ${status}`, [408, 429, 500, 502, 503, 504].includes(status));
    }
    let body;
    try { body = await response.json(); } catch {
        // A waking service can temporarily return HTML. Never count it as healthy.
        throw new HealthFailure("response is not readable JSON (possibly a wake-up page)", true);
    }
    if (body?.success !== true || body?.project !== "VectorForge") {
        throw new HealthFailure("response does not identify a healthy VectorForge application", false);
    }
}

async function ping(origin, {
    fetchImpl = globalThis.fetch, timeoutMs = 120000, retryDelayMs = 10000, onRetry = () => {}
} = {}) {
    const url = healthUrl(origin);
    const controller = new AbortController();
    let timer;
    try {
        await Promise.race([
            (async () => {
                for (let attempt = 1; attempt <= 3; attempt++) {
                    controller.signal.throwIfAborted();
                    try {
                        await check(url, fetchImpl, controller.signal);
                        return;
                    } catch (error) {
                        controller.signal.throwIfAborted();
                        if (!(error instanceof HealthFailure) || !error.retryable || attempt === 3) throw error;
                        onRetry(`Attempt ${attempt}/3: ${error.message} Retrying in ${retryDelayMs / 1000}s.`);
                        await require("node:timers/promises").setTimeout(retryDelayMs, undefined, { signal: controller.signal });
                    }
                }
            })(),
            new Promise((_, reject) => { timer = setTimeout(() => {
                reject(new Error("Health check timed out.")); controller.abort();
            }, timeoutMs); })
        ]);
        return { healthy: true };
    } catch (error) {
        // Never print URLs, upstream response bodies or arbitrary network errors.
        throw new Error(controller.signal.aborted
            ? "Health check timed out. Inspect Render service logs."
            : error instanceof HealthFailure ? error.message
                : "Health check failed. Check the Render URL, deployment and service logs.");
    } finally { clearTimeout(timer); }
}

if (require.main === module) {
    ping(process.env.RENDER_BACKEND_URL, { onRetry: (message) => console.warn(message) }).then(
        () => console.log("VectorForge /health responded successfully."),
        (error) => { console.error(error.message); process.exitCode = 1; }
    );
}
module.exports = { healthUrl, ping };
