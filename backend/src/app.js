const express = require("express");
const cors = require("cors");

const {
    swaggerUi,
    swaggerSpec
} = require("./config/swagger");


const routes = require("./routes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());


// Swagger
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

// Routes
app.use("/", routes);

module.exports = app;