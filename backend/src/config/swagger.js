const path = require("node:path");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: "3.0.0",
        info: { title: "VectorForge API", version: "1.0.0", description: "Authenticated vector search, PDF ingestion and RAG. Use the frontend's OAuth/verification flows to obtain a JWT." },
        servers: [{ url: "/" }],
        components: {
            securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
            schemas: { Vector: { type: "object", required: ["id", "values"], properties: {
                id: { type: "string", maxLength: 200 }, values: { type: "array", minItems: 1, maxItems: 4096, items: { type: "number" } },
                embeddingModel: { type: "string", nullable: true }, metadata: { type: "object", description: "Bounded scalar metadata; text fields must be strings." }
            } } }
        }
    },
    apis: [path.join(__dirname, "../routes/*.js").replace(/\\/g, "/")]
});
const operation = (summary, protectedRoute = false) => ({ summary,
    ...(protectedRoute ? { security: [{ bearerAuth: [] }] } : {}),
    responses: { 200: { description: "Successful response" }, 400: { description: "Invalid request" },
        ...(protectedRoute ? { 401: { description: "Authentication required" } } : {}),
        429: { description: "Rate limited" }, 503: { description: "Temporarily unavailable" } } });
for (const name of ["register", "verify-email", "login", "forgot-password", "reset-password", "exchange"]) {
    swaggerSpec.paths["/api/auth/" + name] = { post: operation(name + " (see deployment checklist for request/verification flow)") };
}
for (const name of ["register", "forgot-password"]) {
    const responses = swaggerSpec.paths["/api/auth/" + name].post.responses;
    delete responses[200]; responses[202] = { description: "Generic acceptance; check email if eligible" };
}
for (const provider of ["google", "github"]) for (const suffix of ["", "/callback"]) {
    swaggerSpec.paths["/api/auth/" + provider + suffix] = { get: { summary: "Browser OAuth flow; initiate through the frontend for state and exchange binding",
        responses: { 302: { description: "Provider authorization or safe frontend callback redirect" }, 400: { description: "Invalid initiation request" }, 429: { description: "Rate limited" } } } };
}
swaggerSpec.paths["/api/auth/me"] = { get: operation("Current user", true) };
for (const name of ["chat", "embed", "rag"]) swaggerSpec.paths["/api/ai/" + name] = { post: operation("Authenticated " + name, true) };
swaggerSpec.paths["/api/ai/config"] = { get: operation("Embedding profile", true) };
swaggerSpec.paths["/api/pdf/upload"] = { post: { ...operation("Upload one PDF (10 MiB, atomic document commit)", true),
    requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["pdf"], properties: { pdf: { type: "string", format: "binary" } } } } } } } };
swaggerSpec.paths["/health"] = { get: operation("Process liveness") };
swaggerSpec.paths["/ready"] = { get: operation("Database and startup readiness; 503 when unavailable") };
for (const [route, methods] of Object.entries(swaggerSpec.paths)) {
    if (route.startsWith("/api/vectors")) for (const method of ["get", "post", "delete"]) if (methods[method]) methods[method].security = [{ bearerAuth: [] }];
}
module.exports = { swaggerUi, swaggerSpec };
