import { parseExecutionTime } from "./formatters";

export const getAlgorithmLabel = (key) => {
  const labels = {
    "brute-force": "Brute Force",
    bruteForce: "Brute Force",
    "kd-tree": "KD-Tree",
    kdTree: "KD-Tree",
    hnsw: "HNSW",
  };
  return labels[key] || key || "Unknown";
};

export const normalizeSearchResults = (results = [], trace = null) => {
  const distances = new Map(
    (trace?.distances || []).map((item) => [item.id, item.distance])
  );

  return results.map((result) => {
    if (result.score != null) return result;

    const distance = distances.get(result.id);
    return {
      ...result,
      score: distance == null ? null : 1 / (1 + Number(distance)),
      distance,
    };
  });
};

export const normalizeBenchmarkRows = (benchmark) => {
  if (!benchmark?.results) return [];

  return [
    ["bruteForce", benchmark.results.bruteForce],
    ["kdTree", benchmark.results.kdTree],
    ["hnsw", benchmark.results.hnsw],
  ].map(([key, result]) => ({
    id: key,
    algorithm: getAlgorithmLabel(key),
    average: parseExecutionTime(result?.averageExecutionTime),
    min: parseExecutionTime(result?.minExecutionTime),
    max: parseExecutionTime(result?.maxExecutionTime),
    median: parseExecutionTime(result?.medianExecutionTime),
    recall: result?.recall || "--",
    status: key === benchmark.fastestAlgorithm ? "Fastest" : "Normal",
  }));
};
