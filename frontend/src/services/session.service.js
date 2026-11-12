import api from "./api";
import { STORAGE_KEYS } from "../utils/constants";

export async function revalidateSession(token) {
  const { data } = await api.get("/api/auth/me");
  return { token, user: data.user };
}
export function watchSession(onInvalid) {
  const changed = (event) => {
    // A different tab switched accounts or signed out. Drop this tab's private state.
    if (event.key === STORAGE_KEYS.auth) window.location.reload();
  };
  window.addEventListener("vf-session-invalid", onInvalid);
  window.addEventListener("storage", changed);
  return () => {
    window.removeEventListener("vf-session-invalid", onInvalid);
    window.removeEventListener("storage", changed);
  };
}
