// Resource admission is per process; security rate limits remain shared in MongoDB.
let active = false;
module.exports = (req, res, next) => {
    if (active) {
        res.set("Retry-After", "2");
        return res.status(503).json({ success: false, message: "A document/search job is already running. Please retry shortly." });
    }
    active = true;
    let released = false;
    const release = () => { if (!released) { released = true; active = false; } };
    req.releaseWork = release;
    res.once("finish", release);
    res.once("close", () => { if (!req.workRunning) release(); });
    next();
};
module.exports.run = (handler) => async (req, res, next) => {
    req.workRunning = true;
    try { await handler(req, res, next); }
    catch (error) { next(error); }
    finally { req.releaseWork?.(); }
};
