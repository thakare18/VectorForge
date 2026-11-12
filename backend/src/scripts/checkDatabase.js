const { MongoClient } = require("mongoose").mongo;
const { startupFailureMessage } = require("../server");

async function checkDatabase(uri, { Client = MongoClient, logger = console } = {}) {
    let client;
    try {
        if (typeof uri !== "string" || !uri.trim()) {
            logger.error("MONGODB_URI is missing. Set it in the backend hosting environment.");
            return false;
        }
        client = new Client(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 10000 });
        await client.connect();
        await client.db().command({ ping: 1 }, { maxTimeMS: 3000 });
        logger.info("Database connection verified. Ping only; no records or indexes changed.");
        return true;
    } catch (error) {
        logger.error(startupFailureMessage(error));
        return false;
    } finally {
        if (client) await client.close().catch(() => {});
    }
}

if (require.main === module) {
    require("dotenv").config({ quiet: true });
    checkDatabase(process.env.MONGODB_URI).then((ok) => { process.exitCode = ok ? 0 : 1; });
}
module.exports = { checkDatabase };
