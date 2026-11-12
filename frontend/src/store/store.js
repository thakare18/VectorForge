import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { removeItem } from "../utils/storage";
import { STORAGE_KEYS } from "../utils/constants";
import authReducer from "./slices/authSlice";
import settingsReducer from "./slices/settingsSlice";
import uploadReducer from "./slices/uploadSlice";
import searchReducer from "./slices/searchSlice";
import chatReducer from "./slices/chatSlice";

const combined = combineReducers({
    auth: authReducer,
    settings: settingsReducer,
    upload: uploadReducer,
    search: searchReducer,
    chat: chatReducer,
});
export const store = configureStore({
  reducer: (state, action) => {
    if (action.type === "auth/logout" ||
        (action.type === "auth/loginSuccess" && String(state?.auth.user?.id) !== String(action.payload.user.id))) {
      [STORAGE_KEYS.chatHistory, STORAGE_KEYS.uploadHistory, "vectorforge_token", "vectorforge_user"].forEach(removeItem);
      if (state) state = { ...state,
        chat: { ...chatReducer(undefined, { type: "@@init" }), messages: [] },
        upload: { ...uploadReducer(undefined, { type: "@@init" }), history: [], lastUpload: null, totalChunks: 0, storedVectors: 0 },
        search: searchReducer(undefined, { type: "@@init" })
      };
    }
    return combined(state, action);
  }
});
