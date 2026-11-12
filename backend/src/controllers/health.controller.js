const mongoose = require("mongoose");
const healthCheck = (req, res) => res.status(200).json({
    success: true, project: "VectorForge", message: "Backend is running successfully."
});
const readyCheck = async (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!req.app.locals.ready || req.app.locals.draining || mongoose.connection.readyState !== 1) {
        return res.status(503).json({ success: false, status: "not_ready" });
    }
    let timer;
    try {
        await Promise.race([
            mongoose.connection.db.command({ ping: 1 }, { maxTimeMS: 1000 }),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Readiness deadline")), 2000); })
        ]);
        return res.json({ success: true, status: "ready" });
    } catch { return res.status(503).json({ success: false, status: "not_ready" }); }
    finally { clearTimeout(timer); }
};
module.exports = { healthCheck, readyCheck };
