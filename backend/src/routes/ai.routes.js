const express = require("express");

const {
    chat,
    embed,
    ragChat
} = require("../controllers/ai.controller");

const router =
    express.Router();
router.use(require("../middleware/auth.middleware"));
router.get("/config", (req, res) => res.json({ success: true, ...require("../config/embedding"), similarityThreshold: 0.6 }));
router.use(require("../middleware/rateLimiter").limit("ai-user", 30, 15 * 60 * 1000, true));

router.post(
    "/chat",
    chat
);

router.post(
    "/embed",
    embed
);

router.post(
    "/rag",
    require("../middleware/workLimiter"),
    require("../middleware/workLimiter").run(ragChat)
);

module.exports = router;
