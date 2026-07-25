

const healthCheck = (req, res) => {
    res.status(200).json({
        success: true,
        project: "VectorForge",
        message: "Backend is running successfully."
    });
};

module.exports = {
    healthCheck
};