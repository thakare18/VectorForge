const express = require("express");

const { apiInfo } = require("../controllers/api.controller");

const router = express.Router();

router.get("/", apiInfo);

module.exports = router;