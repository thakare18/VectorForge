const express = require("express");

const { healthCheck } = require("../controllers/health.controller");


const apiRoutes = require("./api.routes");

const router = express.Router();

router.get("/", healthCheck);


router.use("/api", apiRoutes);

module.exports = router;