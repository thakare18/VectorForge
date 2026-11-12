const { uploadDirectory, fileName } = require("../services/upload-files.service");
const express = require("express");

const multer = require("multer");

const authMiddleware =
    require("../middleware/auth.middleware");

const {
    uploadPDF
} = require("../controllers/pdf.controller");

const router =
    express.Router();

const upload =
    multer({

        storage: multer.diskStorage({
            destination: (req, file, callback) => require("fs").mkdir(uploadDirectory, { recursive: true }, (error) => callback(error, uploadDirectory)),
            filename: (req, file, callback) => callback(null, fileName())
        }),
        limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 },
        fileFilter: (req, file, callback) => callback(
            file.mimetype === "application/pdf" ? null : Object.assign(new Error("Invalid PDF"), { status: 400 }),
            file.mimetype === "application/pdf"
        )

    });

router.post(

    "/upload",

    
    authMiddleware,
    require("../middleware/rateLimiter").limit("pdf-user", 5, 15 * 60 * 1000, true),

    require("../middleware/workLimiter"),
    upload.single("pdf"),

    require("../middleware/workLimiter").run(uploadPDF)

);

module.exports =
    router;
