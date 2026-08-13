import { createSlice } from "@reduxjs/toolkit";
import { getItem, setItem, removeItem } from "../../utils/storage";
import { STORAGE_KEYS } from "../../utils/constants";

const saved = getItem(STORAGE_KEYS.auth);

const authSlice = createSlice({
    name: "auth",

    initialState: {
        user: saved?.user || null,
        token: saved?.token || null,
        isAuthenticated: Boolean(saved?.token),
        authEnabled: true
    },

    reducers: {
        loginSuccess: (state, action) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isAuthenticated = true;

            setItem(
                STORAGE_KEYS.auth,
                action.payload
            );
        },

        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;

            removeItem(STORAGE_KEYS.auth);
        },

        mockOAuthLogin: (state, action) => {
            const provider = action.payload;

            const mockUser = {
                id: "mock-user",
                name:
                    provider === "google"
                        ? "Google User"
                        : "GitHub User",
                email: `${provider}@example.com`,
                provider,
                joinedAt: new Date().toISOString()
            };

            const payload = {
                user: mockUser,
                token: `mock-jwt-${provider}`
            };

            state.user = mockUser;
            state.token = payload.token;
            state.isAuthenticated = true;

            setItem(
                STORAGE_KEYS.auth,
                payload
            );
        }
    }
});

export const {
    loginSuccess,
    logout,
    mockOAuthLogin
} = authSlice.actions;

export default authSlice.reducer;