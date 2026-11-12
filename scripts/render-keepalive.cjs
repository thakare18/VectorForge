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

async function ping(origin, { fetchImpl = globalThis.fetch, timeoutMs = 120000 } = {}) {
    const url = healthUrl(origin);
    const controller = new AbortController();
    let timer;
    try {
        await Promise.race([
            (async () => {
                const response = await fetchImpl(url, {
                    method: "GET", redirect: "error", signal: controller.signal,
                    headers: { Accept: "application/json", "Cache-Control": "no-cache" }
                });
                if (response.status !== 200) {
                    await response.body?.cancel();
                    throw new Error("Health response failed.");
                }
                const body = await response.json();
                // Render's wake-up HTML is not a successful application response.
                if (body?.success !== true || body?.project !== "VectorForge") throw new Error("Invalid health response.");
            })(),
            new Promise((_, reject) => { timer = setTimeout(() => {
                reject(new Error("Health check timed out.")); controller.abort();
            }, timeoutMs); })
        ]);
        return { healthy: true };
    } catch {
        // Never print URLs, upstream response bodies or arbitrary network errors.
        throw new Error(controller.signal.aborted
            ? "Health check timed out. Inspect Render service logs."
            : "Health check failed. Check the Render URL, deployment and service logs.");
    } finally { clearTimeout(timer); }
}

if (require.main === module) {
    ping(process.env.RENDER_BACKEND_URL).then(
        () => console.log("VectorForge /health responded successfully."),
        (error) => { console.error(error.message); process.exitCode = 1; }
    );
}
module.exports = { healthUrl, ping };
