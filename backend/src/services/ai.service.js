require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const env = require("../config/env");

// UPDATED
const ai = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,

    httpOptions: {
        timeout: 300000
    }
});

const generateResponse = async (
    prompt
) => {

    const response =
        await ai.models.generateContent({

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

    /*
    RAG Prompt
    */

    const prompt = `

You are a professional RAG AI assistant for VectorForge.

Your task is to answer the user's question using ONLY the information provided in the context.

IMPORTANT RULES:

1. Use only the provided context.
2. Do not use outside knowledge.
3. Do not invent, assume, or guess any information.
4. If the answer is not available in the context, reply exactly:

"I couldn't find the answer in the uploaded document."

5. Answer ONLY what the user asked.
6. Keep every answer SHORT, CONCISE, and DIRECT.
7. Do not generate unnecessary long explanations.
8. Do not repeat the same information.
9. Do not copy large portions of the context.
10. If the question can be answered in a few lines, answer in a few lines.
11. If the user asks "in short", give a very short answer.
12. If the user asks for a list, provide only the relevant items.
13. Use Markdown formatting when it improves readability.
14. Use headings and bullet points only when they are useful.
15. Do not add unnecessary sections such as Introduction, Advantages, Disadvantages, Applications, or Conclusion unless the question requires them.
16. Prefer 5-8 bullet points maximum for list-based answers.
17. Keep the generated answer within a safe output limit.
18. Never generate a lengthy essay unless the user explicitly asks for a detailed explanation.
19. Prioritize relevance and accuracy over completeness.
20. Do not mention information that is not supported by the context.

ANSWER STYLE:

- Direct
- Concise
- Easy to understand
- Professional
- Based strictly on the retrieved context

CONTEXT:

${context}

USER QUESTION:

${question}

ANSWER:
`;

    // UPDATED
    let lastError;

    // UPDATED
    for (
        let attempt = 1;
        attempt <= 3;
        attempt++
    ) {

        try {

            // UPDATED
            console.log(
                `Gemini answer attempt ${attempt}/3`
            );

            const response =
                await ai.models.generateContent({

                    model: "gemini-3.6-flash",

                    contents: prompt

                });

            return response.text;

        } catch (error) {

            // UPDATED
            lastError = error;

            console.error(
                `Gemini answer attempt ${attempt} failed:`,
                error.message
            );

            // UPDATED
            if (attempt < 3) {

                const delay =
                    Math.pow(2, attempt) * 1000;

                console.log(
                    `Retrying Gemini request in ${delay / 1000} seconds...`
                );

                await new Promise(
                    (resolve) =>
                        setTimeout(
                            resolve,
                            delay
                        )
                );

            }

        }

    }

    // UPDATED
    throw lastError;
};

module.exports = {
    generateResponse,
    generateEmbedding,
    generateAnswer
};