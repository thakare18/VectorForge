const {
    generateResponse
} = require("../services/ai.service");

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

module.exports = {

    chat

};