import { createSlice } from "@reduxjs/toolkit";
import { getItem, setItem } from "../../utils/storage";
import { STORAGE_KEYS } from "../../utils/constants";

const uploadSlice = createSlice({
  name: "upload",
  initialState: {
    history: getItem(STORAGE_KEYS.uploadHistory, []),
    lastUpload: null,
    totalChunks: 0,
    storedVectors: 0,
  },
  reducers: {
    addUpload: (state, action) => {
      const entry = {
        id: Date.now(),
        ...action.payload,
        uploadedAt: new Date().toISOString(),
      };
      state.history = [entry, ...state.history].slice(0, 20);
      state.lastUpload = entry;
      state.totalChunks = action.payload.totalChunks || 0;
      state.storedVectors = action.payload.storedVectors || 0;
      setItem(STORAGE_KEYS.uploadHistory, state.history);
    },
    clearHistory: (state) => {
      state.history = [];
      setItem(STORAGE_KEYS.uploadHistory, []);
    },
  },
});

export const { addUpload, clearHistory } = uploadSlice.actions;
export default uploadSlice.reducer;
