import api from "./api";

export const embedText = (text) =>
  api.post("/api/ai/embed", { text });

export const chat = (prompt) =>
  api.post("/api/ai/chat", { prompt });

export const ragChat = (question) =>
  api.post("/api/ai/rag", { question });
