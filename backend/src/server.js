function startupFailureMessage(error) {
    for (let current = error, depth = 0; current && depth < 4; current = current.cause, depth++) {
        if (current.code === 18 || current.codeName === "AuthenticationFailed" || /bad auth|authentication failed/i.test(current.message || "")) {
            return "Database authentication failed. Check MONGODB_URI database-user credentials, password percent-encoding and authSource in the hosting environment. Credentials were not logged.";
        }
        if (current.code === "EADDRINUSE") return "Application startup failed: configured PORT is already in use.";
        if (current.code === 11000) return "Application startup failed: duplicate records prevent a required unique index. Review existing data; do not delete records automatically.";
    }
    return "Application startup failed: connection, indexes or configured port unavailable.";
}

async function startRuntime({ app, connect, initialize = async () => {}, disconnect, port,
    host = "0.0.0.0", processRef = process, logger = console, shutdownMs = 15000 }) {
    let server, stopping = false, shutdownPromise;
    app.locals.ready = false;
    const handlers = {};
    const detach = () => { for (const [event, fn] of Object.entries(handlers)) processRef.removeListener(event, fn); };
    const shutdown = (code = 0, reason = "shutdown") => {
        if (shutdownPromise) return shutdownPromise;
        stopping = true; app.locals.draining = true; app.locals.ready = false;
        logger.info("Runtime stopping: " + reason);
        shutdownPromise = (async () => {
            const deadline = setTimeout(() => {
                server?.closeAllConnections?.(); detach(); processRef.exit(1);
            }, shutdownMs);
            try {
                if (server?.listening) await new Promise((resolve) => { server.close(resolve); server.closeIdleConnections?.(); });
                await disconnect();
            } catch { code = 1; logger.error("Runtime cleanup failed."); }
            finally { clearTimeout(deadline); detach(); processRef.exit(code); }
        })();
        return shutdownPromise;
    };
    handlers.SIGINT = () => shutdown(0, "SIGINT");
    handlers.SIGTERM = () => shutdown(0, "SIGTERM");
    handlers.unhandledRejection = () => shutdown(1, "unhandled rejection");
    handlers.uncaughtException = () => shutdown(1, "uncaught exception");
    for (const [event, fn] of Object.entries(handlers)) processRef.on(event, fn);
    try {
        await connect(); await initialize();
        if (stopping) throw new Error("Startup interrupted");
        server = await new Promise((resolve, reject) => {
            const instance = app.listen(port, host, () => { instance.removeListener("error", reject); resolve(instance); });
            instance.once("error", reject);
        });
        server.requestTimeout = 60000; server.headersTimeout = 15000; server.keepAliveTimeout = 5000;
        server.on("error", () => shutdown(1, "server error"));
        app.locals.ready = true;
        logger.info("Server listening on configured port.");
        return { server, shutdown };
    } catch (error) {
        logger.error(startupFailureMessage(error));
        await shutdown(1, "startup failure");
        return null;
    }
}
async function main() {
    // No environment loading or network access when this module is imported by tests.
    require("dotenv").config({ quiet: true });
    const env = require("./config/env");
    const mongoose = require("mongoose");
    const models = ["AuthGrant", "RateBucket", "User", "Document", "vector.model"].map((name) => require("./models/" + name));
    return startRuntime({ app: require("./app"), connect: require("./config/database"),
        initialize: async () => { await Promise.all(models.map((model) => model.init())); },
        disconnect: () => mongoose.disconnect(), port: env.PORT });
}
if (require.main === module) main().catch(() => { console.error("Application configuration/startup failed."); process.exit(1); });
module.exports = { startRuntime, main, startupFailureMessage };
