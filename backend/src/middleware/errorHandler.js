module.exports = (err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 :
        err.type === "entity.too.large" ? 413 : err.code?.startsWith("LIMIT_") ? 400 : err.status === 400 ? 400 : err.status === 403 ? 403 : 500;
    res.status(status).json({ success: false, message: status === 413 ? "Request too large." :
        status < 500 ? "Invalid request." : "Internal server error." });
};
