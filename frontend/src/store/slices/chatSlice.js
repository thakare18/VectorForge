import { createSlice } from "@reduxjs/toolkit";
import { getItem, setItem } from "../../utils/storage";
import { STORAGE_KEYS } from "../../utils/constants";

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    messages: getItem(STORAGE_KEYS.chatHistory, []),
    mode: "general",
    loading: false,
  },
  reducers: {
    addMessage: (state, action) => {
      state.messages.push({
        id: Date.now(),
        ...action.payload,
        timestamp: new Date().toISOString(),
      });
      setItem(STORAGE_KEYS.chatHistory, state.messages);
    },
    setChatLoading: (state, action) => {
      state.loading = action.payload;
    },
    setChatMode: (state, action) => {
      state.mode = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
      setItem(STORAGE_KEYS.chatHistory, []);
    },
  },
});

export const { addMessage, setChatLoading, setChatMode, clearChat } =
  chatSlice.actions;
export default chatSlice.reducer;
