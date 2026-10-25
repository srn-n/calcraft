// Tiny observable store. Subscribers run once per animation frame at most.
export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  let queued = false;
  const flush = () => {
    queued = false;
    for (const fn of subs) fn(state);
  };
  return {
    get: () => state,
    set(patch) {
      const next = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...next };
      if (!queued) {
        queued = true;
        requestAnimationFrame(flush);
      }
    },
    sub(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
