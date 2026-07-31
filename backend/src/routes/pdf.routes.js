const express = require("express");

const multer = require("multer");

const {
    uploadPDF
} = require("../controllers/pdf.controller");

const router =
    express.Router();

const upload =
    multer({

        dest: "uploads/"

    });

router.post(

    "/upload",

    upload.single("pdf"),

    uploadPDF

);

module.exports =
    router;