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

   /* 
    RAG Prompt
*/

const prompt = `

You are a professional AI assistant.

Answer the user's question ONLY using the provided context.

If the answer is not available in the context, reply exactly:

"I couldn't find the answer in the uploaded document."

Instructions:

1. Never say:
   - "The document states"

2. Start directly with the topic name as a heading.

3. Use this format whenever possible:

## Topic Name

**Full Form:**
...

**Definition:**
...

**Purpose:**
- Point 1
- Point 2
- Point 3

**Advantages:**
- Point 1
- Point 2

**Disadvantages:**
- Point 1
- Point 2

**Applications:**
- Point 1
- Point 2

**Conclusion:**
Short conclusion in 2-3 lines.

4. If some sections are not available in the context, omit them.

5. Never invent information that is not present in the context.

6. Format the answer using proper Markdown headings, bold text and bullet points.

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