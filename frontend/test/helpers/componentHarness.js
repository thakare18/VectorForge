// Execute real JSX page handlers with deterministic hooks. This is not a browser/DOM test.
import vm from "node:vm";
import fs from "node:fs/promises";
import { transformWithOxc } from "vite";
import * as jsxRuntime from "react/jsx-runtime";
import * as validators from "../../src/utils/validators.js";

export async function componentHarness(page, services, search = "", options = {}) {
  const state = [], navigations = [], actions = [], toasts = [], effects = []; let cursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
      return [state[index], (value) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return state[index] ||= { current: initial }; },
    useEffect(fn) { effects.push(fn); }
  };
  const mocks = {
    react, "react/jsx-runtime": jsxRuntime,
    "react-router-dom": { Link: "Link", useNavigate: () => (...args) => navigations.push(args), useSearchParams: () => [new URLSearchParams(search)], useLocation: () => ({ state: options.locationState }) },
    "react-redux": { useDispatch: () => (action) => actions.push(action) },
    "react-hot-toast": { default: { success: (value) => toasts.push(["success", value]), error: (value) => toasts.push(["error", value]) } },
    "../utils/constants": { APP_TITLE: "VectorForge" },
    "../utils/validators": validators,
    "../components/common/Button": { default: "Button" },
    "../components/common/Badge": { default: "Badge" },
    "../components/common/Loader": { default: "Loader" },
    "../services/api": { default: { post: services.exchange } },
    "../services/auth.service": { login: async () => {}, register: async () => {}, forgotPassword: async () => {}, resetPassword: async () => {}, verifyEmail: async () => {}, startOAuth: async () => {}, ...services },
    "../store/slices/authSlice": { loginSuccess: (payload) => ({ type: "auth/loginSuccess", payload }), logout: () => ({ type: "auth/logout" }) }
  };
  const entries = new Map(Object.entries(options.storage || {}));
  const sessionStorage = { getItem: (key) => entries.get(key) || null, removeItem: (key) => entries.delete(key) };
  const context = vm.createContext({ URLSearchParams, sessionStorage: options.sessionStorage || sessionStorage,
    window: { location: { search }, history: { replaceState() {} } } });
  const source = await fs.readFile(new URL(`../../src/pages/${page}.jsx`, import.meta.url), "utf8");
  const { code } = await transformWithOxc(source, `${page}.jsx`, { jsx: { runtime: "automatic" } });
  const module = new vm.SourceTextModule(code, { context });
  await module.link((name) => {
    const values = mocks[name]; if (!values) throw new Error("Unmocked page import: " + name);
    return new vm.SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); }, { context });
  });
  await module.evaluate();
  const render = () => { cursor = 0; return module.namespace.default(); };
  const nodes = (root) => !root || typeof root !== "object" ? [] : Array.isArray(root)
    ? root.flatMap(nodes) : [root, ...nodes(root.props?.children)];
  const all = (predicate) => nodes(render()).filter(predicate);
  const text = (root) => typeof root === "string" ? root : Array.isArray(root) ? root.map(text).join(" ") : text(root?.props?.children || "");
  return { render, all, text, navigations, actions, toasts,
    async flushEffects() { for (const fn of effects.splice(0)) fn(); await new Promise((resolve) => setImmediate(resolve)); },
    input(index, value) { all((n) => n.type === "input")[index].props.onChange({ target: { value } }); },
    submit() { return all((n) => n.type === "form")[0].props.onSubmit({ preventDefault() {} }); }
  };
}
