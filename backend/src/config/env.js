const {
    cleanEnv,
    str,
    port
} = require("envalid");

const env = cleanEnv(process.env, {
    NODE_ENV: str({ default: "development", choices: ["development", "test", "production"] }),
    BACKEND_URL: str({ default: "" }),

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

}, { reporter: ({ errors }) => {
    if (Object.keys(errors).length) throw new Error("Invalid environment variables: " + Object.keys(errors).join(", "));
} });

if (Buffer.byteLength(env.JWT_SECRET, "utf8") < 32) throw new Error("JWT_SECRET must contain at least 32 bytes");
const production = env.NODE_ENV === "production";
for (const key of ["GEMINI_API_KEY", "MONGODB_URI", "JWT_SECRET"]) if (!env[key].trim()) throw new Error(key + " is required");
if (!/^mongodb(?:\+srv)?:\/\//.test(env.MONGODB_URI)) throw new Error("MONGODB_URI must use a MongoDB scheme");
const parseUrl = (value, key) => { try { return new URL(value); } catch { throw new Error(key + " is invalid"); } };
const origin = (value, key) => {
    const url = parseUrl(value, key);
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== value || url.username || url.password ||
        (production && (url.protocol !== "https:" || /^(localhost|127\.|0\.|\[::1\])/.test(url.hostname) || url.hostname.endsWith(".localhost")))) {
        throw new Error(key + " must be a public HTTPS origin in production");
    }
    return url;
};
origin(env.FRONTEND_URL, "FRONTEND_URL");
if (production && !env.BACKEND_URL) throw new Error("BACKEND_URL is required in production");
if (env.BACKEND_URL) origin(env.BACKEND_URL, "BACKEND_URL");
for (const provider of ["GOOGLE", "GITHUB"]) {
    const values = ["CLIENT_ID", "CLIENT_SECRET", "CALLBACK_URL"].map((key) => env[provider + "_" + key]);
    if (values.some(Boolean) && !values.every(Boolean)) throw new Error(provider + " OAuth configuration is incomplete");
    if (values[2]) {
        const callback = parseUrl(values[2], provider + "_CALLBACK_URL");
        if (!["http:", "https:"].includes(callback.protocol) || callback.username || callback.password || callback.search || callback.hash ||
            callback.pathname !== "/api/auth/" + provider.toLowerCase() + "/callback" ||
            (production && callback.protocol !== "https:") || (env.BACKEND_URL && callback.origin !== env.BACKEND_URL)) {
            throw new Error(provider + " callback must match its backend origin and route");
        }
    }
}
const smtp = [env.SMTP_HOST, env.SMTP_PORT, env.SMTP_USER, env.SMTP_PASSWORD];
if ((production || smtp.some(Boolean)) && !smtp.every(Boolean)) throw new Error("SMTP configuration is incomplete");
if (env.SMTP_PORT && (!/^\d+$/.test(env.SMTP_PORT) || Number(env.SMTP_PORT) < 1 || Number(env.SMTP_PORT) > 65535)) throw new Error("SMTP_PORT is invalid");
module.exports = env;
