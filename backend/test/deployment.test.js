const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");

test("Swagger discovers routes independently of cwd and documents authentication and readiness", () => {
    const source = "const s=require('./backend/src/config/swagger').swaggerSpec; console.log(JSON.stringify(s))";
    const spec = JSON.parse(execFileSync(process.execPath, ["-e", source], { cwd: root, encoding: "utf8" }));
    assert.deepEqual(spec.servers, [{ url: "/" }]);
    assert.equal(spec.components.securitySchemes.bearerAuth.scheme, "bearer");
    for (const [route, method] of [["/api/vectors/search", "post"], ["/api/auth/me", "get"], ["/api/ai/rag", "post"], ["/api/pdf/upload", "post"]]) {
        assert.deepEqual(spec.paths[route][method].security, [{ bearerAuth: [] }]);
    }
    assert.ok(spec.paths["/ready"].get.responses[503]);
    assert.ok(spec.paths["/api/auth/register"].post.responses[202]);
    assert.ok(spec.paths["/api/auth/github/callback"].get.responses[302]);
});

test("deployment templates preserve SPA fallback and exclude environment variants and uploads", () => {
    const vercel = JSON.parse(fs.readFileSync(path.join(root, "frontend/vercel.json"), "utf8"));
    assert.equal(vercel.outputDirectory, "dist");
    assert.ok(vercel.rewrites.some((r) => r.destination === "/index.html"));
    const yaml = require("js-yaml").load(fs.readFileSync(path.join(root, "render.yaml"), "utf8"));
    assert.equal(yaml.services[0].rootDir, "backend");
    assert.equal(yaml.services[0].healthCheckPath, "/ready");
    assert.equal(yaml.services[0].autoDeployTrigger, "off");
    const ignored = execFileSync("git", ["check-ignore", "backend/.env.production", "frontend/.env.local", "backend/uploads/future-upload"], { cwd: root, encoding: "utf8" });
    assert.match(ignored, /backend\/\.env.production/); assert.match(ignored, /frontend\/\.env.local/);
    assert.match(ignored, /backend\/uploads\/future-upload/);
    for (const folder of ["backend", "frontend"]) {
        assert.match(fs.readFileSync(path.join(root, folder, ".dockerignore"), "utf8"), /^\.env\.\*$/m);
    }
    assert.match(fs.readFileSync(path.join(root, "backend/.dockerignore"), "utf8"), /^uploads$/m);
});
