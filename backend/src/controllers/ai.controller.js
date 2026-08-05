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

/* If no similar vectors are found,
   stop here and return response.*/
if (results.length === 0) {

    return res.status(404).json({

        success: false,

        message: "No relevant documents found."

    });

}

const context =
    results
        .map(result => result.metadata?.text || "")
        .join("\n\n");

const answer =
    await generateAnswer(
        context,
        question
    );

    const sources =
    results.map(result => ({

        id: result.id,

        score: Number(result.score.toFixed(4))

    }));

res.status(200).json({

    success: true,

    retrievedChunks: results.length,

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