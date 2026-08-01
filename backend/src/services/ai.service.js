require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const generateResponse = async (prompt) => {

    const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
    });

    return response.text;

};

const generateEmbedding = async (
    text
) => {

    const response =
        await ai.models.embedContent({

            model: "gemini-embedding-001",

            contents: text

        });

    return response.embeddings[0].values;

};

module.exports = {
    generateResponse,
    generateEmbedding
};