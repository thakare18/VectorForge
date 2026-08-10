require("dotenv").config();
const env = require("./config/env");

const app = require("./app");
const constants = require("./config/constants");

const MAX_PORT_RETRIES = 5;

function startServer(port, attempt = 0) {
    const server = app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });

    server.on("error", (err) => {
        if (err && err.code === "EADDRINUSE") {
            if (attempt < MAX_PORT_RETRIES) {
                const nextPort = port + 1;
                console.warn(
                    `Port ${port} in use. Trying ${nextPort} (attempt ${attempt + 1}/${MAX_PORT_RETRIES})`
                );
                // Give the OS a short moment before retrying
                setTimeout(() => startServer(nextPort, attempt + 1), 200);
            } else {
                console.error(
                    `Port ${port} is in use and max retries reached. Exiting.`
                );
                process.exit(1);
            }
        } else {
            console.error("Server error:", err);
            process.exit(1);
        }
    });

    // Optional: handle graceful shutdown
    const shutdown = () => {
        server.close(() => process.exit(0));
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

startServer(env.PORT);