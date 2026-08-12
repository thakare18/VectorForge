const {
    cleanEnv,
    str,
    port
} = require("envalid");

const env = cleanEnv(process.env, {

    PORT: port({
        default: 3000
    }),

    GEMINI_API_KEY: str(),

    // UPDATED
    MONGODB_URI: str(),

    // UPDATED
    JWT_SECRET: str(),

    // UPDATED
    GOOGLE_CLIENT_ID: str({
        default: ""
    }),

    // UPDATED
    GOOGLE_CLIENT_SECRET: str({
        default: ""
    }),

    // UPDATED
    GOOGLE_CALLBACK_URL: str({
        default: ""
    }),

    // UPDATED
    GITHUB_CLIENT_ID: str({
        default: ""
    }),

    // UPDATED
    GITHUB_CLIENT_SECRET: str({
        default: ""
    }),

    // UPDATED
    GITHUB_CALLBACK_URL: str({
        default: ""
    }),

    // UPDATED
    FRONTEND_URL: str({
        default: "http://localhost:5173"
    }),

    // UPDATED
    SMTP_HOST: str({
        default: ""
    }),

    // UPDATED
    SMTP_PORT: str({
        default: ""
    }),

    // UPDATED
    SMTP_USER: str({
        default: ""
    }),

    // UPDATED
    SMTP_PASSWORD: str({
        default: ""
    })

});

module.exports = env;