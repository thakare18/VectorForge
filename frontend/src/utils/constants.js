export const APP_TITLE = "VectorForge";
export const APP_SUBTITLE = "Visual Vector Database and RAG Search Engine";

export const DEFAULT_BACKEND_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export const ALGORITHMS = [
  { value: "brute-force", label: "Brute Force" },
  { value: "kd-tree", label: "KD-Tree" },
  { value: "hnsw", label: "HNSW" },
];

export const METRICS = [
  { value: "cosine", label: "Cosine" },
  { value: "euclidean", label: "Euclidean" },
  { value: "manhattan", label: "Manhattan" },
];

export const CATEGORY_COLORS = {
  "Computer Science": "#00e5ff",
  CS: "#00e5ff",
  Math: "#a855f7",
  Mathematics: "#a855f7",
  Food: "#ff6b00",
  Sports: "#22c55e",
  Documents: "#f472b6",
  Docs: "#f472b6",
  default: "#94a3b8",
};

export const NAV_LINKS = [
  { to: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { to: "/search", label: "Search Lab", icon: "Search" },
  { to: "/visualizer", label: "Visualizer", icon: "GitBranch" },
  { to: "/upload", label: "Upload", icon: "Upload" },
  { to: "/chat", label: "AI Chat", icon: "MessageSquare" },
  { to: "/vectors", label: "Vectors", icon: "Database" },
  { to: "/benchmark", label: "Benchmark", icon: "BarChart3" },
  { to: "/swagger", label: "Swagger", icon: "FileCode" },
  { to: "/settings", label: "Settings", icon: "Settings" },
  { to: "/profile", label: "Profile", icon: "User" },
];

export const STORAGE_KEYS = {
  settings: "vf_settings",
  auth: "vf_auth",
  uploadHistory: "vf_upload_history",
  chatHistory: "vf_chat_history",
};
