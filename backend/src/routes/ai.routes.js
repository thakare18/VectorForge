const express = require("express");

const {
    chat,
    embed
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

module.exports = router;