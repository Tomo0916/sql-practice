/* =========================================================
 * i18n.js — language loading and text helpers
 * Each language lives in i18n/<code>.js (one file per language, easy to review).
 * "easy" = やさしい日本語 with furigana written as {漢字|かんじ}.
 * ========================================================= */
export const LANGS = [
  { code: 'ja', name: '日本語', html: 'ja' },
  { code: 'easy', name: 'やさしい にほんご', html: 'ja' },
  { code: 'en', name: 'English', html: 'en' },
  { code: 'ne', name: 'नेपाली', html: 'ne' },
  { code: 'fr', name: 'Français', html: 'fr' },
  { code: 'my', name: 'မြန်မာ', html: 'my' },
  { code: 'bn', name: 'বাংলা', html: 'bn' },
  { code: 'si', name: 'සිංහල', html: 'si' },
  { code: 'id', name: 'Bahasa Indonesia', html: 'id' },
  { code: 'vi', name: 'Tiếng Việt', html: 'vi' },
  { code: 'zh', name: '中文', html: 'zh' }
];
export const LANG_CODES = LANGS.map(l => l.code);
export const htmlLang = c => (LANGS.find(l => l.code === c) || LANGS[2]).html;

const dicts = {};
export async function loadLang(code) {
  if (!LANG_CODES.includes(code)) code = 'en';
  if (!dicts[code]) dicts[code] = (await import(`../i18n/${code}.js`)).default;
  return dicts[code];
}
export function hasLang(code) { return !!dicts[code]; }

export function detectLang(saved) {
  const q = new URLSearchParams(location.search).get('lang');
  if (q && LANG_CODES.includes(q)) return q;
  if (saved && LANG_CODES.includes(saved)) return saved;
  const nav = (navigator.languages || [navigator.language || 'ja']).map(s => String(s).slice(0, 2).toLowerCase());
  return nav.find(c => LANG_CODES.includes(c)) || 'ja';
}

/** Raw string (may contain {漢字|かんじ} ruby markup and {var} placeholders). Falls back to English. */
export function raw(key, lang) {
  const d = dicts[lang], en = dicts.en;
  const s = (d && d[key]) ?? (en && en[key]);
  if (s === undefined) { if (typeof console !== 'undefined') console.warn('[i18n] missing', key); return key; }
  return s;
}
function fill(s, vars) {
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? vars[k] : m)) : s;
}
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** Plain text (ruby removed: 漢字). For titles, attributes, aria labels. */
export function t(key, lang, vars) { return fill(stripRuby(raw(key, lang)), vars); }
export function stripRuby(s) { return String(s).replace(/\{([^{}|]+)\|([^{}]+)\}/g, '$1'); }
/** Escaped HTML with <ruby>. Variables are escaped too. */
export function rubyHTML(s) {
  return esc(s).replace(/\{([^{}|]+)\|([^{}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
}
/** Escaped HTML with ruby, variables inserted as given HTML (already escaped by caller) */
export function th(key, lang, varsHTML) {
  const s = raw(key, lang);
  const parts = [];
  let last = 0;
  const re = /\{(\w+)\}/g;
  let m;
  while ((m = re.exec(s))) {
    parts.push(rubyHTML(s.slice(last, m.index)));
    parts.push(varsHTML && varsHTML[m[1]] !== undefined ? String(varsHTML[m[1]]) : esc(m[0]));
    last = re.lastIndex;
  }
  parts.push(rubyHTML(s.slice(last)));
  return parts.join('');
}
