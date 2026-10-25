// Approved Arabic text for Phase N, copied exactly from NATURE_SCENES.md (the owner approved it).
// `npm run check:content` verifies every string here appears in NATURE_SCENES.md.

/** The journey button on each plinth (§2, §4). */
export const JOURNEY_LABEL = '▶ رحلة على المنحنى';

/** «خواص الدالة»: the property card titles per station (§6 table). Values come in N.6. */
export const PROPERTY_TITLES = {
  1: ['المجال', 'المدى', 'نقطة الرأس', 'السلوك', 'التماثل'],
  2: ['المجال', 'المدى', 'نقطة البداية', 'السلوك'],
  3: ['المجال', 'المدى', 'المقطع الصادي', 'الميل', 'السلوك'],
  4: ['المجال', 'المدى', 'المقطع الصادي', 'الميل', 'الرسم'],
  5: ['المجال', 'المدى', 'المقطع السيني', 'خط التقارب', 'السلوك'],
  6: ['المجال', 'المدى', 'المقطع الصادي', 'خط التقارب', 'السلوك'],
  7: ['المجال', 'المدى', 'نقطة الانعطاف', 'السلوك', 'التماثل'],
  8: ['المجال', 'المدى', 'خطا التقارب', 'السلوك'],
  9: ['المجال', 'نقطة الرأس', 'المدى', 'المقطع الصادي', 'الفتحة'],
  10: ['المجال', 'المدى', 'المقطع الصادي'],
};

/** Heading of the properties row (§2, §6). */
export const PROPERTIES_HEADING = 'خواص الدالة';

/**
 * Sign cards (§5), exactly as given. Each « · » separates words that the card shows on their own
 * line (like the photos); the text itself is unchanged.
 */
export const SIGNS = {
  3: { low: 'خطوة أولى', high: 'اتجاه وهدف' },
  4: { left: 'ثبات · استقرار · طمأنينة', note: 'قيمة ثابتة لا تتغير' },
  9: { left: 'حزن · تراجع', vertex: 'نقطة التحوّل · تأمل · إعادة بناء', right: 'أمل · نهوض · بداية جديدة' },
};
