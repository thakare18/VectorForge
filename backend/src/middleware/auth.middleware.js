const { verifyToken } = require("../security/auth");
const User = require("../models/User");
module.exports = async (req, res, next) => {
    const denied = () => res.status(401).json({ success: false, message: "Authentication required." });
    const header = req.headers.authorization;
    if (typeof header !== "string" || !/^Bearer [^\s]+$/.test(header)) return denied();
    let decoded;
    try {
        decoded = verifyToken(header.slice(7));
        if (typeof decoded.userId !== "string" || !/^[a-f0-9]{24}$/i.test(decoded.userId) ||
            !Number.isInteger(decoded.ver) || decoded.ver < 0) return denied();
    } catch { return denied(); }
    try {
        const user = await User.findById(decoded.userId);
        if (!user || decoded.ver !== (user.tokenVersion || 0)) return denied();
        req.user = user;
        next();
    } catch {
        res.status(503).json({ success: false, message: "Authentication temporarily unavailable." });
    }
};
