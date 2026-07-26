const express = require("express");

const {
    getVectors,
    insertVector,
    searchVectors
} = require("../controllers/vector.controller");

const router = express.Router();

router.get("/", getVectors);

router.post("/", insertVector);

// UPDATED
router.post("/search", searchVectors);

module.exports = router;