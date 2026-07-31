const {
    extractText,
    createChunks
} = require("../services/pdf.service");

const uploadPDF = async (
    req,
    res
) => {

    try {

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message: "PDF file is required."

            });

        }

        const text =
    await extractText(
        req.file.path
    );

const chunks =
    createChunks(text);

res.status(200).json({

    success: true,

    totalChunks:
        chunks.length,

    chunks

});

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

module.exports = {

    uploadPDF

};