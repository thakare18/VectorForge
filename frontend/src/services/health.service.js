import api from "./api";

export const checkHealth = () => api.get("/");

export const getApiInfo = () => api.get("/api");
