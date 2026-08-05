const {
    generateResponse,
    generateEmbedding,
    generateAnswer
} = require("../services/ai.service");

const vectorDB = require("../database/vector.database");

const chat = async (
    req,
    res
) => {

    try {

        const {
            prompt
        } = req.body;

        if (!prompt) {

            return res.status(400).json({

                success: false,

                message: "Prompt is required."

            });

        }

        const answer =
            await generateResponse( 
                prompt
            );

        res.status(200).json({

            success: true,

            answer

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const embed = async (
    req,
    res
) => {

    try {

        const {
            text
        } = req.body;

        if (!text) {

            return res.status(400).json({

                success: false,

                message: "Text is required."

            });

        }

        const embedding =
            await generateEmbedding(
                text
            );

        res.status(200).json({

            success: true,

            dimensions:
                embedding.length,

            embedding

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const ragChat = async (req, res) => {

    try {

        const question = req.body.question?.trim();

if (!question) {

    return res.status(400).json({

        success: false,

        message: "Question is required."

    });

}

        const questionEmbedding =
            await generateEmbedding(question);

      const results =
    vectorDB.search(

        questionEmbedding,

        5,

        "cosine",

        "brute-force"

    );

// UPDATED
const filteredResults = results.filter(

    (result) => result.score >= 0.70

);

// UPDATED
if (filteredResults.length === 0) {

    return res.status(200).json({

        success: true,

        retrievedChunks: 0,

        sources: [],

        answer:
            "I couldn't find the answer in the uploaded document."

    });

}

// UPDATED
const context =
    filteredResults
        .map(result => result.metadata?.text || "")
        .join("\n\n");

const answer =
    await generateAnswer(
        context,
        question
    );

// UPDATED
const sources =
    filteredResults.map(result => ({

        id: result.id,

        score: Number(result.score.toFixed(4))

    }));

res.status(200).json({

    success: true,

    // UPDATED
    retrievedChunks:
        filteredResults.length,

    sources,

    answer

});



   } catch (error) {

    console.error("===== RAG ERROR =====");
    console.error(error);

    res.status(500).json({

        success: false,

        message: error.message,
        stack: error.stack

    });

}

};

module.exports = {

    chat,
    embed,
    ragChat

};