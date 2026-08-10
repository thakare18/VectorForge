import api from "./api";

export const getVectors = () => api.get("/api/vectors");

export const insertVector = (payload) => api.post("/api/vectors", payload);

export const searchVectors = (payload) =>
  api.post("/api/vectors/search", payload);

export const runBenchmark = () => api.get("/api/vectors/benchmark");
