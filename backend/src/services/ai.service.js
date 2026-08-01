require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const env = require("../config/env");

const ai = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY
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

const generateAnswer = async (
    context,
    question
) => {

    const prompt = `

You are an AI assistant.

Answer ONLY using the context below.

If the answer is not available in the context, reply:

"I couldn't find the answer in the uploaded document."

Context:

${context}

Question:

${question}

`;

    const response =
        await ai.models.generateContent({

            model: "gemini-3.6-flash",

            contents: prompt

        });

    return response.text;

};

module.exports = {
    generateResponse,
    generateEmbedding,
    generateAnswer
};