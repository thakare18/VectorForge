const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const randomToken = () => crypto.randomBytes(32).toString("hex");
const validToken = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const validEmail = (value) => typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validPassword = (value, existing = false) => typeof value === "string" &&
    value.length >= (existing ? 1 : 8) && Buffer.byteLength(value, "utf8") <= 72;
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email,
    provider: user.provider, avatar: user.avatar, createdAt: user.createdAt });
const signToken = (user) => jwt.sign({ userId: String(user._id), ver: user.tokenVersion || 0 }, env.JWT_SECRET,
    { algorithm: "HS256", issuer: "vectorforge", audience: "vectorforge-web", expiresIn: "1d" });
const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET,
    { algorithms: ["HS256"], issuer: "vectorforge", audience: "vectorforge-web" });
module.exports = { hash, randomToken, validToken, validEmail, validPassword, publicUser, signToken, verifyToken };
