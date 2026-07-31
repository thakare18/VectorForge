const {
    extractText
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

        res.status(200).json({

            success: true,

            text

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