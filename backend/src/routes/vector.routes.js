const express = require("express");


const {
    getVectors,
    insertVector,
    searchVectors,
    benchmarkSearch
} = require("../controllers/vector.controller");

const router = express.Router();

router.get("/", getVectors);

router.post("/", insertVector);

// UPDATED
router.post("/search", searchVectors);


router.get(
    "/benchmark",
    benchmarkSearch
);

module.exports = router;