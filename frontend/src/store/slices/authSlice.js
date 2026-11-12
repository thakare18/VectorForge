import { createSlice } from "@reduxjs/toolkit";
import { getItem, setItem, removeItem } from "../../utils/storage";
import { STORAGE_KEYS } from "../../utils/constants";
const saved = getItem(STORAGE_KEYS.auth);
const authSlice = createSlice({
  name: "auth",
  initialState: { user: saved?.user || null, token: saved?.token || null,
    isAuthenticated: false, checking: Boolean(saved?.token), authEnabled: true },
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.checking = false;
      setItem(STORAGE_KEYS.auth, { user: state.user, token: state.token });
    },
    logout: (state) => {
      state.user = null; state.token = null; state.isAuthenticated = false; state.checking = false;
      [STORAGE_KEYS.auth, "vectorforge_token", "vectorforge_user"].forEach(removeItem);
    }
  }
});
export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
