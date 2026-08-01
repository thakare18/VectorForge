const {
    extractText,
    createChunks
} = require("../services/pdf.service");

const {
    generateEmbedding
} = require("../services/ai.service");

const vectorDB =
    require("../database/vector.database")

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

for (let i = 0; i < chunks.length; i++) {

    const embedding =
        await generateEmbedding(
            chunks[i]
        );

    vectorDB.insert({

        id: `chunk-${i + 1}`,

        values: embedding,

        metadata: {

            text: chunks[i]

        }

    });

}

res.status(200).json({

    success: true,

    message:
        "Document embedded successfully.",

    totalChunks:
        chunks.length,

    storedVectors:
        vectorDB.getAll().length

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