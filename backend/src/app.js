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
app.locals.ready = false;
app.use((req, res, next) => {
    if (app.locals.draining) return res.status(503).set("Connection", "close").json({ success: false, message: "Service restarting." });
    next();
});

// UPDATED
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || (process.env.RENDER ? 1 : 0));
if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 5) throw new Error("Invalid TRUST_PROXY_HOPS");
app.set("trust proxy", proxyHops || false);
app.disable("x-powered-by");
app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "no-referrer");
    if (process.env.NODE_ENV === "production") res.set("Strict-Transport-Security", "max-age=31536000");
    if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
    next();
});


const allowedOrigins = [
    require("./config/env").FRONTEND_URL,
    ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:5173"])
].filter(Boolean);

// UPDATED
app.use(
    cors({
        origin: (origin, callback) => {

            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(
                    Object.assign(new Error("Not allowed by CORS"), { status: 403 })
                );
            }

        },
        credentials: true
    })
);


// Middlewares
// Never log query strings: OAuth codes and reset links may be present.
app.use(morgan((tokens, req, res) => [tokens.method(req, res), req.route?.path || "unmatched", tokens.status(req, res)].join(" ")));
app.use(express.json({ limit: "128kb" }));


// Swagger
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

// Routes
app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/", routes);


// Error Handling Middleware
app.use(errorHandler);

module.exports = app;
