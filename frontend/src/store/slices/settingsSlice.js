import { createSlice } from "@reduxjs/toolkit";
import { getItem, setItem } from "../../utils/storage";
import { STORAGE_KEYS, DEFAULT_BACKEND_URL } from "../../utils/constants";

const defaultSettings = {
  backendUrl: DEFAULT_BACKEND_URL,
  algorithm: "brute-force",
  metric: "cosine",
  topK: 5,
  similarityThreshold: 0.6,
  embeddingModel: "Backend configured",
  theme: "obsidian",
};

export { defaultSettings };

const saved = getItem(STORAGE_KEYS.settings, defaultSettings);

const settingsSlice = createSlice({
  name: "settings",
  initialState: { ...defaultSettings, ...saved, ...(import.meta.env.PROD ? { backendUrl: DEFAULT_BACKEND_URL } : {}) },
  reducers: {
    updateSettings: (state, action) => {
      Object.assign(state, action.payload);
      if (import.meta.env.PROD) state.backendUrl = DEFAULT_BACKEND_URL;
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
