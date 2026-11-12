export function singleFlight(operation) {
  let busy = false;
  return async (...args) => {
    if (busy) throw new Error("An upload is already in progress.");
    busy = true;
    try { return await operation(...args); } finally { busy = false; }
  };
}
export async function copyText(text, clipboard = navigator.clipboard) {
  if (!clipboard?.writeText) throw new Error("Clipboard is unavailable.");
  await clipboard.writeText(String(text ?? ""));
}
export const metadataText = (value, fallback = "") => typeof value === "string" ? value : fallback;
export function playbackFrame(trace, step) {
  const order = trace?.searchPath || trace?.visitedNodes || [];
  const current = Math.max(0, Math.min(order.length - 1, step));
  return { activeId: order[current], pathIds: order.slice(0, current + 1),
    visited: new Set(order.slice(0, current + 1)), edges: (trace?.hnswEdges || []).filter((edge) => edge.step === undefined || edge.step <= current),
    splits: (trace?.kdTreeSplits || []).slice(0, current + 1) };
}

export function movePage(state, direction, count = 0) {
  if (direction === "next") return { offset: state.offset + count, history: [...state.history, state.offset] };
  return { offset: state.history.at(-1) || 0, history: state.history.slice(0, -1) };
}
export async function dashboardSnapshot(healthRequest, vectorsRequest) {
  const [health, vectors] = await Promise.allSettled([healthRequest(), vectorsRequest()]);
  return { health: health.status === "fulfilled" ? health.value.data : null,
    vectors: vectors.status === "fulfilled" ? vectors.value.data : null,
    error: health.status === "rejected" || vectors.status === "rejected" };
}
