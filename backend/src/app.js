const express = require("express");
const cors = require("cors");

const {
    swaggerUi,
    swaggerSpec
} = require("./config/swagger");

const errorHandler =
    require("./middleware/errorHandler");


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

// Error Handling Middleware
app.use(errorHandler);

module.exports = app;