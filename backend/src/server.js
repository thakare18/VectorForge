require("dotenv").config();

const app = require("./app");
const constants = require("./config/constants");

app.listen(constants.PORT, () => {
    console.log(`Server listening on port ${constants.PORT}`);
});