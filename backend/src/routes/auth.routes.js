const express = require("express");

const {
    register,
    login,
    getMe,
    forgotPassword,
    resetPassword,

    googleLogin,

    googleCallback,
    
    githubLogin,
    githubCallback
} = require("../controllers/auth.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

// UPDATED
router.get("/google", googleLogin);

router.get("/google/callback", googleCallback);

// UPDATED
router.get("/github", githubLogin);


router.get("/github/callback", githubCallback);

// UPDATED
router.post("/forgot-password", forgotPassword);


router.post("/reset-password", resetPassword);

// UPDATED
router.get("/me", authMiddleware, getMe);

module.exports = router;