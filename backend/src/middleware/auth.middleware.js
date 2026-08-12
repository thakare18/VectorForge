const jwt = require("jsonwebtoken");

const env = require("../config/env");

// UPDATED
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            env.JWT_SECRET
        );

        // UPDATED
        const user = await User.findById(decoded.userId);

        // UPDATED
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found."
            });
        }

        // UPDATED
        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
};

module.exports = authMiddleware;