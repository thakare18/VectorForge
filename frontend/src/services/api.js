import axios from "axios";
import { getItem } from "../utils/storage";
import { STORAGE_KEYS, DEFAULT_BACKEND_URL } from "../utils/constants";

const getBaseUrl = () => {
  const settings = getItem(STORAGE_KEYS.settings, {});
  return settings.backendUrl || DEFAULT_BACKEND_URL;
};

const api = axios.create({
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl();
  const auth = getItem(STORAGE_KEYS.auth);
  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.message ||
      "Something went wrong";

    const enriched = new Error(message);
    enriched.status = status;
    enriched.isNetworkError = !error.response;
    throw enriched;
  }
);

export default api;
