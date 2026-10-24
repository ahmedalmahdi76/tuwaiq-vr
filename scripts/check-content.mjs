// npm run check:content — confirms src/content.js matches PROJECT_BRIEF.md character for character.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  TITLE, WELCOME, AUTHOR_CREDIT, INTRO, STATIONS, UI, MOVE_HINTS, visitedText,
} from '../src/content.js';
import { JOURNEY_LABEL, PROPERTY_TITLES, PROPERTIES_HEADING } from '../src/nature-content.js';

const briefPath = fileURLToPath(new URL('../PROJECT_BRIEF.md', import.meta.url));
const brief = readFileSync(briefPath, 'utf8').replace(/\r/g, '');
const section5 = brief.slice(brief.indexOf('## 5. Content'), brief.indexOf('## 6. Controls'));

let failures = 0;
let checks = 0;

function codepoints(s) {
  return [...s].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');
}

function same(label, actual, expected) {
  checks++;
  if (actual === expected) return;
  failures++;
  let i = 0;
  while (i < actual.length && actual[i] === expected[i]) i++;
  console.error(`✘ ${label}`);
  console.error(`    content.js: …${actual.slice(Math.max(0, i - 10), i + 15)}…  (${codepoints(actual.slice(i, i + 3))})`);
  console.error(`    brief     : …${expected.slice(Math.max(0, i - 10), i + 15)}…  (${codepoints(expected.slice(i, i + 3))})`);
}

function inBrief(label, actual) {
  checks++;
  if (brief.includes(actual)) return;
  failures++;
  console.error(`✘ ${label}: "${actual}" not found anywhere in the brief`);
}

/** Body text under "### heading" in section 5, up to the next heading or rule. */
function block(heading) {
  const marker = `### ${heading}\n`;
  const start = section5.indexOf(marker);
  if (start < 0) throw new Error(`Heading not found in brief: ${heading}`);
  const rest = section5.slice(start + marker.length);
  const end = rest.search(/\n### |\n---/);
  return (end < 0 ? rest : rest.slice(0, end)).trim();
}

/** "- key: value" lines (top level and indented) → { key: value } */
function bullets(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*- ([^:]+): (.*)$/);
    if (m) out[m[1].trim()] = m[2];
  }
  return out;
}

// Intros
same('INTRO.tuwaiq.text', INTRO.tuwaiq.text, block('Intro — جبل طويق'));
same('INTRO.functions.text', INTRO.functions.text, block('Intro — ما هي الدوال؟'));
inBrief('INTRO.tuwaiq.title', `### Intro — ${INTRO.tuwaiq.title}`);
inBrief('INTRO.functions.title', `### Intro — ${INTRO.functions.title}`);

// Stations: every field in the brief must exist and match, and nothing extra
const FIELDS = ['name', 'formula', 'subtitle', 'math', 'life', 'quote'];
checks++;
if (STATIONS.length !== 10) { failures++; console.error(`✘ expected 10 stations, found ${STATIONS.length}`); }
for (let n = 1; n <= 10; n++) {
  const expected = bullets(block(`Station ${n}`));
  const station = STATIONS.find((s) => s.number === n);
  if (!station) { failures++; console.error(`✘ station ${n} missing`); continue; }
  for (const key of Object.keys(expected)) {
    if (!FIELDS.includes(key)) { failures++; console.error(`✘ station ${n}: brief has unknown field "${key}"`); }
  }
  for (const key of FIELDS) {
    if (!(key in expected)) { failures++; console.error(`✘ station ${n}: brief has no "${key}"`); continue; }
    same(`station ${n} ${key}`, station[key], expected[key]);
  }
}

// UI strings
const ui = bullets(block('UI strings (Arabic)'));
const [next, prev] = ui['Next / previous station'].split(' / ');
same('UI.start', UI.start, ui['Start button']);
same('UI.nextStation', UI.nextStation, next);
same('UI.prevStation', UI.prevStation, prev);
same('UI.stationsMenu', UI.stationsMenu, ui['Stations menu']);
same('UI.listen', UI.listen, ui['Listen']);
same('UI.enterVR', UI.enterVR, ui['Enter VR']);
same('visitedText(3, 10)', visitedText(3, 10), ui['Visited count'].replace(/ \(.*\)$/, ''));
same('MOVE_HINTS.desktop', MOVE_HINTS.desktop, ui['Desktop']);
same('MOVE_HINTS.phone', MOVE_HINTS.phone, ui['Phone']);
same('MOVE_HINTS.vr', MOVE_HINTS.vr, ui['VR']);

// Strings from other sections of the brief (title, start area, closing area)
inBrief('TITLE', `**«${TITLE}»**`);
inBrief('WELCOME', `**${WELCOME}**`);
inBrief('AUTHOR_CREDIT', `**Author credit (show on the start screen and on the end screen):**\n${AUTHOR_CREDIT}`);
inBrief('UI.closingTitle', `## 8. Closing area — ${UI.closingTitle}`);
inBrief('UI.quizWhichFunction', `**"${UI.quizWhichFunction}"`);
inBrief('UI.quizMatchFeeling', `**"${UI.quizMatchFeeling}"`);
inBrief('UI.thanks', `«${UI.thanks}»`);
inBrief('UI.restart', `"${UI.restart}"`);

// Phase N text (NATURE_SCENES.md, approved by the owner)
const naturePath = fileURLToPath(new URL('../NATURE_SCENES.md', import.meta.url));
const nature = readFileSync(naturePath, 'utf8').replace(/\r/g, '');
function inNature(label, actual) {
  checks++;
  if (nature.includes(actual)) return;
  failures++;
  console.error(`✘ ${label}: "${actual}" not found in NATURE_SCENES.md`);
}
inNature('JOURNEY_LABEL', `«${JOURNEY_LABEL}»`);
inNature('PROPERTIES_HEADING', `«${PROPERTIES_HEADING}»`);
const propertiesTable = nature.slice(nature.indexOf('## 6.'), nature.indexOf('## 7.'));
for (const [n, titles] of Object.entries(PROPERTY_TITLES)) {
  const row = propertiesTable.split('\n').find((l) => l.startsWith(`| ${n} |`)) || '';
  for (const t of titles) {
    checks++;
    if (!row.includes(`${t}:`)) {
      failures++;
      console.error(`✘ property title ${n} "${t}" not in its NATURE_SCENES.md §6 row`);
    }
  }
}

if (failures) {
  console.error(`\n${failures} of ${checks} checks failed.`);
  process.exit(1);
}
console.log(`✔ all match (${checks} checks)`);
