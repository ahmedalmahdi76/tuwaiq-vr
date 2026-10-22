// Font files. Importing with ?url lets Vite copy them into the build with the right base path.
import tajawalRegular from '../assets/Tajawal/Tajawal-Regular.ttf?url';
import tajawalBold from '../assets/Tajawal/Tajawal-Bold.ttf?url';
import firaRegular from '../assets/Fira_Sans/FiraSans-Regular.ttf?url';

export const ARABIC_FAMILY = 'Tajawal';

export const FONTS = {
  regular: tajawalRegular,
  bold: tajawalBold,
  math: firaRegular, // Latin math formulas (troika, math-text component)
};

let arabicReady = null;

/**
 * Registers Tajawal (400 + 700) with the FontFace API and resolves once both weights are loaded.
 * Canvas text drawn before this would silently use a fallback font. HTML overlays use the same faces.
 */
export function arabicFontsReady() {
  if (!arabicReady) {
    const faces = [
      new FontFace(ARABIC_FAMILY, `url(${tajawalRegular})`, { weight: '400' }),
      new FontFace(ARABIC_FAMILY, `url(${tajawalBold})`, { weight: '700' }),
    ];
    faces.forEach((face) => document.fonts.add(face));
    arabicReady = Promise.all([
      document.fonts.load(`400 32px ${ARABIC_FAMILY}`),
      document.fonts.load(`700 32px ${ARABIC_FAMILY}`),
    ]).then(() => {
      if (!document.fonts.check(`400 32px ${ARABIC_FAMILY}`)) {
        console.warn('[fonts] Tajawal did not load; Arabic text will use a fallback font');
      }
    });
  }
  return arabicReady;
}
