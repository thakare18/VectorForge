import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
for (const target of ["production", "preview"]) {
  test(`actual Vite config builds on Vercel ${target} and excludes platform values from client output`, () => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("VITE_")));
    const markers = {
      VITE_VERCEL_GIT_REPO_ID: "synthetic-repository-marker",
      VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG: "synthetic-observability-marker",
      VITE_VERCEL_FUTURE_METADATA: "synthetic-future-marker",
      VITE_VERCEL_API_TOKEN: "synthetic-token-marker",
      VITE_VERCEL_SECRET: "synthetic-secret-marker",
      VITE_VERCEL_GIT_REPO_ID_SECRET: "synthetic-nested-secret-marker",
      DATABASE_PASSWORD: "synthetic-server-secret-marker"
    };
    const script = `
      import assert from 'node:assert/strict';
      import { build } from 'vite';
      const result = await build({ logLevel: 'silent', plugins: [{
        name: 'environment-regression-probe',
        resolveId(id) { if (id === 'virtual:env-probe') return id; },
        load(id) { if (id === 'virtual:env-probe') return 'console.log(import.meta.env, import.meta.env.VITE_VERCEL_SECRET, import.meta.env.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG);'; }
      }], build: { write: false, minify: false, rollupOptions: { input: 'virtual:env-probe' } } });
      const chunks = (Array.isArray(result) ? result : [result]).flatMap(r => r.output).filter(o => o.type === 'chunk');
      const output = chunks.map(c => c.code).join('\\n');
      assert.ok(output.includes('https://synthetic-backend.test'), 'configured backend must reach client');
      for (const key of ${JSON.stringify(Object.keys(markers))}) {
        assert.ok(!output.includes(process.env[key]), 'platform/server value leaked: ' + key);
      }
      console.log('Vercel environment isolation passed');
    `;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: root, env: { ...env, ...markers, NODE_ENV: "production", VERCEL: "1",
        VITE_VERCEL_ENV: target, VITE_API_URL: "https://synthetic-backend.test" },
      encoding: "utf8", timeout: 30000, windowsHide: true
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.match(result.stdout, /Vercel environment isolation passed/);
  });
}
