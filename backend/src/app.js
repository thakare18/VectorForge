const express = require("express");
const cors = require("cors");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Health Check API
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        project: "VectorForge",
        message: "Backend is running successfully."
    });
});

module.exports = app;