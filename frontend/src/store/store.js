import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import settingsReducer from "./slices/settingsSlice";
import uploadReducer from "./slices/uploadSlice";
import searchReducer from "./slices/searchSlice";
import chatReducer from "./slices/chatSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    settings: settingsReducer,
    upload: uploadReducer,
    search: searchReducer,
    chat: chatReducer,
  },
});
