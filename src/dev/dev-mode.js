// Dev tools (fly mode, viewpoint keys, time keys) only with ?dev, so normal visitors never trigger
// them by accident. URL helpers like ?stats, ?station=, ?time= and ?quality= stay available.
export const DEV = new URLSearchParams(location.search).has('dev');

/** Dev only: expose a few modules on window for the console and automated screenshots. */
export function exposeDevModules(modules) {
  if (DEV) window.__dev = modules;
}
