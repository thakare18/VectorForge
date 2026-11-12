// Run after a production build. This verifies HTTP delivery, not React/browser behavior.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", "0", "--strictPort"], {
  cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, VITE_API_URL: "https://backend.example.invalid" }
});
try {
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Preview startup timeout")), 10000);
    server.once("error", (error) => { clearTimeout(timer); reject(error); });
    server.once("exit", (code) => { clearTimeout(timer); reject(new Error("Preview exited " + code)); });
    server.stdout.on("data", (data) => { const address = String(data).match(/http:\/\/127\.0\.0\.1:\d+/); if (address) { clearTimeout(timer); resolve(address[0]); } });
    server.stderr.resume();
  });
  const routes = ["/", "/login", "/register", "/oauth/callback", "/forgot-password", "/reset-password", "/dashboard", "/upload", "/vectors", "/search", "/visualizer", "/chat", "/benchmark", "/profile", "/settings"];
  let html;
  for (const route of routes) {
    const response = await fetch(base + route, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200, route); assert.match(response.headers.get("content-type"), /text\/html/);
    html = await response.text(); assert.match(html, /id="root"/);
  }
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(assets.length >= 2);
  for (const asset of assets) assert.equal((await fetch(base + asset, { signal: AbortSignal.timeout(5000) })).status, 200, asset);
  console.log(JSON.stringify({ routeResponses: routes.length, assets: assets.length, status: "PASS", browserExecution: "NOT VERIFIED" }));
} finally {
  if (server.exitCode === null) {
    const exit = new Promise((resolve) => server.once("exit", resolve));
    server.kill(); await exit;
  }
}
