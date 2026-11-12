// Memory fallback keeps the current session usable when browser storage is denied/full.
const memory = new Map();
export const getItem = (key, fallback = null) => {
  if (memory.has(key)) return memory.get(key) ?? fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
};
export const setItem = (key, value) => {
  try {
    const encoded = JSON.stringify(value);
    memory.set(key, JSON.parse(encoded));
    try { localStorage.setItem(key, encoded); memory.delete(key); return true; }
    catch {
      // Do not leave a previous user's persisted value behind on a quota error.
      try { localStorage.removeItem(key); } catch { /* Storage is unavailable. */ }
      return false;
    }
  } catch { return false; }
};
export const removeItem = (key) => {
  memory.set(key, null);
  try { localStorage.removeItem(key); memory.delete(key); return true; }
  catch { return false; }
};
