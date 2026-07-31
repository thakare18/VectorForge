const express = require("express");

const { apiInfo } = require("../controllers/api.controller");

// UPDATED
const vectorRoutes = require("./vector.routes");

const aiRoutes = require("./ai.routes");

const pdfRoutes = require("./pdf.routes");

const router = express.Router();

router.get("/", apiInfo);

// UPDATED
router.use("/vectors", vectorRoutes);

router.use("/ai", aiRoutes);

router.use( "/pdf", pdfRoutes
);

module.exports = router;