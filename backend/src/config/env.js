const {
    cleanEnv,
    str,
    port
} = require("envalid");

const env = cleanEnv(process.env, {

    PORT: port({
        default: 3000
    }),

    GEMINI_API_KEY: str()

});

module.exports = env;