import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { webcrypto } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");
export async function harness(saved = {}, storageFails = false, env = { VITE_API_URL: "https://backend.test" }) {
  const data = new Map(Object.entries(saved).map(([k, v]) => [k, JSON.stringify(v)]));
  const session = new Map(), redirects = [], events = [], listeners = new Map();
  let reloads = 0;
  let adapter = async (config) => ({ data: {}, status: 200, statusText: "OK", headers: {}, config });
  const axios = (await import("axios")).default;
  // Separate Axios instance for each isolated app module graph.
  const axiosMock = { create: (options) => axios.create({ ...options, adapter: (config) => adapter(config) }) };
  const redux = await import("@reduxjs/toolkit");
  const context = vm.createContext({
    console, setTimeout, clearTimeout, AbortController, TextEncoder, FormData, Blob, crypto: webcrypto, URL, URLSearchParams,
    btoa: (value) => Buffer.from(value, "binary").toString("base64"), Event,
    localStorage: {
      getItem(key) { if (storageFails) throw new Error("denied"); return data.get(key) || null; },
      setItem(key, value) { if (storageFails) throw new Error("quota"); data.set(key, value); },
      removeItem(key) { if (storageFails) throw new Error("denied"); data.delete(key); }
    },
    sessionStorage: {
      getItem: (key) => session.get(key),
      setItem(key, value) { if (storageFails) throw new Error("denied"); session.set(key, value); },
      removeItem: (key) => session.delete(key)
    },
    window: {
      location: { assign: (url) => redirects.push(url), reload: () => reloads++ },
      dispatchEvent: (event) => { events.push(event.type); listeners.get(event.type)?.(event); },
      addEventListener: (type, fn) => listeners.set(type, fn),
      removeEventListener: (type) => listeners.delete(type)
    }
  });
  const cache = new Map();
  async function load(specifier, parent = path.join(root, "index.js")) {
    if (!specifier.startsWith(".") && !path.isAbsolute(specifier)) {
      if (cache.has(specifier)) return cache.get(specifier);
      const exports = specifier === "axios" ? { default: axiosMock } : redux;
      const module = new vm.SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
      }, { context });
      cache.set(specifier, module); return module;
    }
    let filename = path.resolve(path.dirname(parent), specifier);
    if (!path.extname(filename)) filename += ".js";
    if (cache.has(filename)) return cache.get(filename);
    const module = new vm.SourceTextModule(fs.readFileSync(filename, "utf8"), {
      context, identifier: filename, initializeImportMeta: (meta) => { meta.env = env; }
    });
    cache.set(filename, module);
    return module;
  }
  async function use(relative) {
    const module = await load(path.join(root, relative));
    if (module.status === "unlinked") await module.link((child, parent) => load(child, parent.identifier));
    if (module.status !== "evaluated") await module.evaluate();
    return module.namespace;
  }
  return { use, data, session, redirects, events, listeners, reloadCount: () => reloads, setAdapter: (fn) => { adapter = fn; } };
}

