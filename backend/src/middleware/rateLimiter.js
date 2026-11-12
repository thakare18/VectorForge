const { ipKeyGenerator } = require("express-rate-limit");
const RateBucket = require("../models/RateBucket");
const { hash } = require("../security/auth");
// Shared, atomic fixed-window counters. Never fall back to process-local limits.
const limit = (scope, max, windowMs = 15 * 60 * 1000, account = false) => async (req, res, next) => {
    try {
        const now = Date.now();
        const end = (Math.floor(now / windowMs) + 1) * windowMs;
        const identity = account ? String(req.user._id) : ipKeyGenerator(req.ip);
        const id = hash(`${scope}:${identity}:${end}`);
        const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(end) } };
        let bucket;
        try {
            bucket = await RateBucket.findOneAndUpdate({ _id: id }, update, { upsert: true, returnDocument: "after" });
        } catch (error) {
            if (error.code !== 11000) throw error;
            bucket = await RateBucket.findOneAndUpdate({ _id: id }, { $inc: { count: 1 } }, { returnDocument: "after" });
        }
        if (!bucket) throw new Error("Rate store unavailable");
        if (bucket.count > max) {
            res.set("Retry-After", String(Math.ceil((end - now) / 1000)));
            return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
        }
        next();
    } catch {
        res.status(503).json({ success: false, message: "Service temporarily unavailable." });
    }
};
module.exports = limit("api", 300);
module.exports.limit = limit;
