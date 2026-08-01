require("dotenv").config();
const env = require("./config/env");

const app = require("./app");
const constants = require("./config/constants");



app.listen(env.PORT, () => {

    console.log(
        `Server listening on port ${env.PORT}`
    );

});