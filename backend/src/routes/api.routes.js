const express = require("express");

const { apiInfo } = require("../controllers/api.controller");

// UPDATED
const vectorRoutes = require("./vector.routes");

const router = express.Router();

router.get("/", apiInfo);

// UPDATED
router.use("/vectors", vectorRoutes);

module.exports = router;