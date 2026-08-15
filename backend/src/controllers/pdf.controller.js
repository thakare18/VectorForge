const {
    extractText,
    createChunks
} = require("../services/pdf.service");

const {
    generateEmbedding
} = require("../services/ai.service");

const vectorDB =
    require("../database/vector.database");

// UPDATED
const {
    saveVector
} = require("../services/vector.persistence.service");

// UPDATED
const { v4: uuidv4 } = require("uuid");

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

        // UPDATED
        const documentId =
            uuidv4();

        for (
            let i = 0;
            i < chunks.length;
            i++
        ) {

            const embedding =
                await generateEmbedding(
                    chunks[i]
                );

            // UPDATED
            const vector = {

                id:
                    `${documentId}-chunk-${i + 1}`,

                values:
                    embedding,

                metadata: {

                    text:
                        chunks[i],

                    documentId,

                    chunkIndex:
                        i + 1

                }

            };

            // UPDATED
            vectorDB.insert(
                vector
            );

            // UPDATED
            await saveVector(
                vector,
                req.user._id
            );

        }

        res.status(200).json({

            success: true,

            message:
                "Document embedded successfully.",

            // UPDATED
            documentId,

            totalChunks:
                chunks.length,

            storedVectors:
                vectorDB.getAll().length

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};

module.exports = {

    uploadPDF

};