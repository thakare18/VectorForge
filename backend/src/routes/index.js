const express = require("express");

const { healthCheck, readyCheck } = require("../controllers/health.controller");


const apiRoutes = require("./api.routes");

const router = express.Router();

router.get("/", healthCheck);
router.get("/health", healthCheck);
router.get("/ready", readyCheck);


router.use("/api", apiRoutes);

module.exports = router;
