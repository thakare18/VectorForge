const mongoose = require("mongoose");
// Expiry is checked on consumption; TTL only removes old records.
const schema = new mongoose.Schema({
    _id: String, kind: { type: String, required: true }, provider: String,
    binding: String, challenge: String, verifier: String,
    userId: mongoose.Schema.Types.ObjectId, tokenVersion: Number,
    registration: { name: String, email: String, password: String },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
});
module.exports = mongoose.model("AuthGrant", schema);
