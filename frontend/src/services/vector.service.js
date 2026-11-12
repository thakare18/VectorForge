import api from "./api";

export const getVectors = (params = {}) => api.get("/api/vectors", { params });

export const insertVector = (payload) => api.post("/api/vectors", payload);

export const searchVectors = (payload) =>
  api.post("/api/vectors/search", payload);

export const runBenchmark = () => api.get("/api/vectors/benchmark");
