import api from "./api";
import { singleFlight } from "../utils/workflows";
export const uploadPdf = singleFlight(async (file, onProgress) => {
  const formData = new FormData(); formData.append("pdf", file);
  return api.post("/api/pdf/upload", formData, {
    onUploadProgress: (event) => { if (onProgress && event.total) onProgress(Math.round(event.loaded * 100 / event.total)); }
  });
});
