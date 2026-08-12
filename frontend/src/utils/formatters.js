export const formatDate = (date) => {
  if (!date) return "--";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatTime = (date) => {
  if (!date) return "--";
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export const formatScore = (score) => {
  if (score == null || Number.isNaN(score)) return "--";
  return Number(score).toFixed(4);
};

export const parseExecutionTime = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    return parseFloat(value.replace(" ms", "")) || 0;
  }
  return 0;
};

export const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};
