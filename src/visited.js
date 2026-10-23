// Which stations the visitor has reached (resets on every page load, decision A5).
// Used by the visited moment now, and later by the HUD counter, the time of day and the quiz.
import { STATION_COUNT } from './trail.js';

const visited = new Set();
const listeners = new Set();

export function isVisited(n) {
  return visited.has(n);
}

/** Mark station n visited. Returns true the first time only. */
export function markVisited(n) {
  if (visited.has(n)) return false;
  visited.add(n);
  const list = [...visited].sort((a, b) => a - b);
  console.info(`[visited] ${visited.size} / ${STATION_COUNT}: stations ${list.join(', ')}`);
  listeners.forEach((fn) => fn(n, list));
  return true;
}

export function visitedList() {
  return [...visited].sort((a, b) => a - b);
}

export function onVisited(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetVisited() {
  visited.clear();
}
