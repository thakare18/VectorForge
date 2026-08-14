import axios from "axios";
import { DEFAULT_BACKEND_URL } from "../utils/constants";

const API_URL = `${DEFAULT_BACKEND_URL}/api/auth`;

const register = async (userData) => {
    const response = await axios.post(
        `${API_URL}/register`,
        userData
    );

    if (response.data.token) {
        localStorage.setItem(
            "vectorforge_token",
            response.data.token
        );

        localStorage.setItem(
            "vectorforge_user",
            JSON.stringify(response.data.user)
        );
    }

    return response.data;
};

const login = async (credentials) => {
    const response = await axios.post(
        `${API_URL}/login`,
        credentials
    );

    if (response.data.token) {
        localStorage.setItem(
            "vectorforge_token",
            response.data.token
        );

        localStorage.setItem(
            "vectorforge_user",
            JSON.stringify(response.data.user)
        );
    }

    return response.data;
};


const forgotPassword = async (email) => {
    const response = await axios.post(
        `${API_URL}/forgot-password`,
        {
            email
        }
    );

    return response.data;
};

// UPDATED
const resetPassword = async (token, password) => {
    const response = await axios.post(
        `${API_URL}/reset-password`,
        {
            token,
            password
        }
    );

    return response.data;
};

const logout = () => {
    localStorage.removeItem("vectorforge_token");
    localStorage.removeItem("vectorforge_user");
};

const getToken = () => {
    return localStorage.getItem("vectorforge_token");
};

const getCurrentUser = () => {
    const user = localStorage.getItem(
        "vectorforge_user"
    );

    return user ? JSON.parse(user) : null;
};

const isAuthenticated = () => {
    return !!localStorage.getItem(
        "vectorforge_token"
    );
};

export {
    register,
    login,
    forgotPassword,
    resetPassword,
    logout,
    getToken,
    getCurrentUser,
    isAuthenticated
};