import { createSlice } from "@reduxjs/toolkit";
import { getItem, setItem } from "../../utils/storage";
import { STORAGE_KEYS } from "../../utils/constants";

const defaultSettings = {
  backendUrl: import.meta.env.VITE_API_URL || "http://localhost:3000",
  algorithm: "brute-force",
  metric: "cosine",
  topK: 5,
  similarityThreshold: 0.6,
  embeddingModel: "text-embedding-004",
  theme: "obsidian",
};

export { defaultSettings };

const saved = getItem(STORAGE_KEYS.settings, defaultSettings);

const settingsSlice = createSlice({
  name: "settings",
  initialState: { ...defaultSettings, ...saved },
  reducers: {
    updateSettings: (state, action) => {
      Object.assign(state, action.payload);
      setItem(STORAGE_KEYS.settings, state);
    },
    resetSettings: () => {
      setItem(STORAGE_KEYS.settings, defaultSettings);
      return defaultSettings;
    },
  },
});

export const { updateSettings, resetSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
