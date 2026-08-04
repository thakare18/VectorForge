import axios from "axios";


const api = axios.create({
    baseURL: "http://localhost:3000/api",
    headers: {
        "Content-Type": "application/json"
    }
});

/* 
   Get all vectors from backend.
*/
export const getVectors = () => {
    return api.get("/vectors");
};

/* 
   Upload PDF.
*/
export const uploadPDF = (formData) => {
    return api.post("/pdf/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
};

/* 
   Ask AI using RAG.
*/
export const askAI = (question) => {
    return api.post("/ai/rag", {
        question
    });
};

/* 
   Benchmark API.
*/
export const getBenchmark = () => {
    return api.get("/vectors/benchmark");
};

export default api;