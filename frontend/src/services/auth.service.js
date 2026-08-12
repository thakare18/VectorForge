import axios from "axios";

const API_URL = "http://localhost:3000/api/auth";

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
    logout,
    getToken,
    getCurrentUser,
    isAuthenticated
};