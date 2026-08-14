const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const apiLimiter =require("./middleware/rateLimiter");
const authRoutes = require("./routes/auth.routes");

const {
    swaggerUi,
    swaggerSpec
} = require("./config/swagger");

const errorHandler =
    require("./middleware/errorHandler");


const routes = require("./routes");

const app = express();


const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173"
].filter(Boolean);

// UPDATED
app.use(
    cors({
        origin: (origin, callback) => {

            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(
                    new Error("Not allowed by CORS")
                );
            }

        },
        credentials: true
    })
);


// Middlewares
app.use(morgan("dev"));
app.use(express.json());


// Swagger
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", apiLimiter);
app.use("/", routes);


// Error Handling Middleware
app.use(errorHandler);

module.exports = app;