const express = require("express");

const {
    getVectors,
    insertVector
} = require("../controllers/vector.controller");

const router = express.Router();

router.get("/", getVectors);

router.post("/", insertVector);

module.exports = router;