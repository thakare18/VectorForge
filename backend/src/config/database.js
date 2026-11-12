const mongoose = require("mongoose");
async function connectDatabase() {
    // Fail instead of buffering protected operations during an outage.
    mongoose.set("bufferCommands", false);
    await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000,
        socketTimeoutMS: 20000, maxPoolSize: 10
    });
}
module.exports = connectDatabase;
