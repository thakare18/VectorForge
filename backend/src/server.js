require("dotenv").config();

const app = require("./app");
const constants = require("./config/constants");

console.log("API KEY:", process.env.GEMINI_API_KEY);

app.listen(constants.PORT, () => {
    console.log(`Server listening on port ${constants.PORT}`);
});