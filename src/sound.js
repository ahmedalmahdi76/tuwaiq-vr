// Synthesised sounds (Web Audio, no files). Browsers only allow audio after a user gesture, so the
// AudioContext is created / resumed on the first key, click or touch. `sound.muted` is for E.7.

export const sound = { muted: false };

let ctx = null;
let master = null;

function ensureContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

for (const type of ['keydown', 'mousedown', 'touchend']) {
  window.addEventListener(type, ensureContext, { once: true, capture: true });
}

// A soft pentatonic scale, so every station's chime sounds a little different but always gentle.
const NOTES = [523.25, 587.33, 659.25, 783.99, 880.0]; // C5 D5 E5 G5 A5

/** A soft bell: two quiet sine partials per note with a slow decay, notes slightly staggered. */
export function playChime(seed = 0) {
  if (sound.muted) return;
  const ac = ensureContext();
  if (!ac || ac.state !== 'running') return;
  const now = ac.currentTime;
  const root = NOTES[seed % NOTES.length];
  [root, root * 1.5].forEach((freq, i) => {
    const start = now + i * 0.09;
    for (const [mult, level] of [[1, 0.16], [2.76, 0.03]]) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * mult;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(level, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.8);
      osc.connect(gain).connect(master);
      osc.start(start);
      osc.stop(start + 1.9);
    }
  });
}
