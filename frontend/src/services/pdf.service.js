import api from "./api";

export const uploadPdf = (file, onProgress) => {
  const formData = new FormData();
  formData.append("pdf", file);

  return api.post("/api/pdf/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
};
