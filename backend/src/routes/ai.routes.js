const express = require("express");

const {
    chat,
    embed,
    ragChat
} = require("../controllers/ai.controller");

const router =
    express.Router();

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
    ragChat
);

module.exports = router;