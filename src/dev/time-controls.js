// Dev only: scrub the time of day until the player's progress drives it (step 1.12).
//   ?time=0.6     start at that point of the journey
//   ?time=cycle   loop slowly 0 → 1 → 0 (for testing on a phone without a keyboard)
//   [ and ]       step the journey down / up by 0.1 (eases there)
import { journey, setJourney } from '../time-of-day.js';

const CYCLE_SECONDS = 60;

export function setupTimeControls() {
  window.setJourney = setJourney; // console / automated screenshots: setJourney(0.7, { instant: true })

  const param = new URLSearchParams(location.search).get('time');
  if (param === 'cycle') {
    const start = performance.now();
    journey.speed = 1; // let the cycle drive the value directly
    const loop = () => {
      const phase = ((performance.now() - start) / 1000 / CYCLE_SECONDS) % 1;
      setJourney(phase < 0.5 ? phase * 2 : 2 - phase * 2);
      requestAnimationFrame(loop);
    };
    loop();
  } else if (param !== null && !Number.isNaN(Number(param))) {
    setJourney(Number(param), { instant: true });
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'BracketRight') setJourney(Math.round((journey.target + 0.1) * 10) / 10);
    if (e.code === 'BracketLeft') setJourney(Math.round((journey.target - 0.1) * 10) / 10);
  });
}
