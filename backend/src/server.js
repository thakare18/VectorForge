const { Agent, setGlobalDispatcher } = require("undici");

setGlobalDispatcher(
    new Agent({
        headersTimeout: 300000,
        bodyTimeout: 600000,
        keepAliveTimeout: 60000,
        connections: 20
    })
);

require("dotenv").config();

const env = require("./config/env");

const app = require("./app");

const constants = require("./config/constants");

const connectDatabase =
    require("./config/database");

// UPDATED
const vectorDB =
    require("./database/vector.database");

// UPDATED
const {
    loadVectors
} = require("./services/vector.persistence.service");

const MAX_PORT_RETRIES = 5;

// UPDATED
const initializeDatabase = async () => {

    await connectDatabase();

    const vectors =
        await loadVectors();

    console.log(
        `Loading ${vectors.length} vectors from MongoDB...`
    );

    for (const vector of vectors) {

        vectorDB.insert({

            id: vector.vectorId,

            values: vector.values,

            metadata:
                vector.metadata || {}

        });

    }

    // UPDATED
    vectorDB.buildKDTree();

    console.log(
        `Restored ${vectors.length} vectors successfully.`
    );

};

function startServer(
    port,
    attempt = 0
) {

    const server =
        app.listen(
            port,
            () => {

                console.log(
                    `Server listening on port ${port}`
                );

            }
        );

    server.on(
        "error",
        (err) => {

            if (
                err &&
                err.code === "EADDRINUSE"
            ) {

                if (
                    attempt <
                    MAX_PORT_RETRIES
                ) {

                    const nextPort =
                        port + 1;

                    console.warn(

                        `Port ${port} in use. Trying ${nextPort} ` +
                        `(attempt ${attempt + 1}/${MAX_PORT_RETRIES})`

                    );

                    setTimeout(
                        () =>
                            startServer(
                                nextPort,
                                attempt + 1
                            ),
                        200
                    );

                } else {

                    console.error(

                        `Port ${port} is in use and max retries reached. Exiting.`

                    );

                    process.exit(1);

                }

            } else {

                console.error(
                    "Server error:",
                    err
                );

                process.exit(1);

            }

        }
    );

    const shutdown = () => {

        server.close(
            () => process.exit(0)
        );

    };

    process.on(
        "SIGINT",
        shutdown
    );

    process.on(
        "SIGTERM",
        shutdown
    );

}

// UPDATED
const start = async () => {

    try {

        await initializeDatabase();

        startServer(
            env.PORT
        );

    } catch (error) {

        console.error(
            "Application startup failed:",
            error.message
        );

        process.exit(1);

    }

};

// UPDATED
start();