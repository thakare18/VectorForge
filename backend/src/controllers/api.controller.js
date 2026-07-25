const apiInfo = (req, res) => {
    res.status(200).json({
        name: "VectorForge API",
        version: "1.0.0",
        status: "Running"
    });
};

module.exports = {
    apiInfo
};