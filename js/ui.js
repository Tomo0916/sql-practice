/* =========================================================
 * ui.js — shared UI helpers for the student and teacher pages
 * ========================================================= */
import { LANGS, t, th, esc, rubyHTML, raw } from './i18n.js';
import { LESSON_BY_KEY } from './engine.js';
import { joinView } from './lessons.js';

/* ---------- icons ---------- */
const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const I = {
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  play: svg('<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>'),
  reset: svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'),
  table: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>'),
  next: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  prev: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  screen: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  paper: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'),
  steps: svg('<path d="M4 18h5v-5h5V8h6"/>'),
  link: svg('<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>'),
  shuffle: svg('<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'),
  check: svg('<path d="M5 12l5 5L20 7"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  print: svg('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  users: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>'),
  book: svg('<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5V4.5"/>'),
  repeat: svg('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
  fire: svg('<path d="M12 22c4 0 7-3 7-7 0-5-4-7-5-12-2 2-3 4-3 6-1-1-2-2-2-4-2 2-4 5-4 10 0 4 3 7 7 7z"/>'),
  eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  lock: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  door: svg('<path d="M14 3h5v18h-5M10 17l5-5-5-5M15 12H3"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>'),
  qr: svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M21 14v7h-4M14 21v-3"/>'),
  bolt: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  drag: svg('<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>')
};

/* ---------- theme / size / language ---------- */
export function applySettings(s, htmlLangCode) {
  const root = document.documentElement;
  if (s.theme === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', s.theme);
  root.dataset.size = s.size || 'm';
  root.lang = htmlLangCode;
  document.body.classList.toggle('presenter', !!s.presenter);
}
export function langOptions(cur) {
  return LANGS.map(l => `<option value="${l.code}" ${l.code === cur ? 'selected' : ''}>${esc(l.name)}</option>`).join('');
}
export function langSelect(cur, label) {
  return `<label class="lang-wrap"><span class="sr">${esc(label)}</span>${I.globe}<select class="lang-select" data-act="lang" aria-label="${esc(label)}">${langOptions(cur)}</select></label>`;
}

/* ---------- SQL highlighting ---------- */
const KW = new Set('SELECT FROM WHERE AND OR NOT IN IS NULL LIKE BETWEEN DISTINCT ORDER BY ASC DESC LIMIT OFFSET GROUP HAVING AS JOIN INNER LEFT RIGHT OUTER ON UNION ALL CASE WHEN THEN ELSE END'.split(' '));
const FN = new Set('COUNT SUM AVG MAX MIN ROUND LENGTH UPPER LOWER ABS COALESCE IFNULL'.split(' '));
export function highlightSQL(src) {
  let out = '';
  const re = /('(?:[^']|'')*'?)|(‹[^›]*›)|(___|__B\d+__)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(--[^\n]*)|([\s\S])/g;
  let m;
  while ((m = re.exec(src))) {
    const [tok, str, ph, blank, num, word, comment] = m;
    if (str) out += `<span class="tok-str">${esc(str)}</span>`;
    else if (ph) out += `<span class="tok-ph">${esc(ph)}</span>`;
    else if (blank) out += '<span class="tok-blank">___</span>';
    else if (num) out += `<span class="tok-num">${num}</span>`;
    else if (word) {
      const u = word.toUpperCase();
      if (KW.has(u)) out += `<span class="tok-kw">${esc(word)}</span>`;
      else if (FN.has(u) && src[re.lastIndex] === '(') out += `<span class="tok-fn">${esc(word)}</span>`;
      else out += esc(word);
    } else if (comment) out += `<span class="muted">${esc(comment)}</span>`;
    else out += esc(tok);
  }
  return out;
}
/** Highlight `cur`, marking what is new compared with `prev`. */
export function highlightDiff(prev, cur) {
  const tok = s => [...String(s || '').matchAll(/'(?:[^']|'')*'|[(),;*]|[^\s(),;*']+/g)].map(m => ({ w: m[0], i: m.index }));
  const a = tok(prev).map(x => x.w), bt = tok(cur), b = bt.map(x => x.w);
  const n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const isNew = new Array(m).fill(!!prev);
  for (let i = 0, j = 0; i < n && j < m;) { if (a[i] === b[j]) { isNew[j] = false; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  let html = '', pos = 0, open = false;
  bt.forEach((x, j) => {
    if (open && !isNew[j]) { html += '</mark>'; open = false; }
    html += esc(cur.slice(pos, x.i));
    if (!open && isNew[j]) { html += '<mark>'; open = true; }
    html += highlightSQL(x.w);
    pos = x.i + x.w.length;
  });
  if (open) html += '</mark>';
  return html + esc(cur.slice(pos));
}

/* ---------- result tables ---------- */
export function fmtCell(v) {
  if (v === null || v === undefined) return '<span class="null">NULL</span>';
  if (typeof v === 'number' && !Number.isInteger(v)) return String(Math.round(v * 100) / 100);
  return esc(v);
}
export function gridHTML(res, opts) {
  opts = opts || {};
  if (!res || !res.columns || !res.columns.length) return '';
  const numCol = res.columns.map((_, j) => res.values.length > 0 && res.values.every(r => r[j] === null || typeof r[j] === 'number'));
  const cls = opts.rowClass || (() => '');
  let h = `<table class="grid"><thead><tr>${opts.rowNums ? '<th class="rn">#</th>' : ''}${res.columns.map((c, j) => `<th${numCol[j] ? ' class="n"' : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>`;
  res.values.forEach((r, i) => {
    h += `<tr class="${cls(r, i)}">${opts.rowNums ? `<td class="rn">${i + 1}</td>` : ''}${r.map((v, j) => `<td${numCol[j] ? ' class="n"' : ''}>${fmtCell(v)}</td>`).join('')}</tr>`;
  });
  return h + '</tbody></table>';
}

/* ---------- problem text ---------- */
export function lessonTitle(lesson, lang) { return t(`L.${lesson.key}.title`, lang); }
export function lessonTitleHTML(lesson, lang) { return rubyHTML(raw(`L.${lesson.key}.title`, lang)); }
export function themeName(prob, lang) { return prob.theme === 'demo' ? '' : t(`ds.${prob.theme}`, lang); }
export function themeHTML(prob, lang) { return prob.theme === 'demo' ? '' : rubyHTML(raw(`ds.${prob.theme}`, lang)); }
/** Problem statement as HTML (code chips for names/values, translated order and function words). */
export function problemHTML(prob, lang) {
  const lesson = LESSON_BY_KEY[prob.lesson];
  const p = prob.p;
  const view = Object.assign({}, p, lesson.kind === 'join' ? joinView(p) : {}, lesson.view ? lesson.view(p) : {});
  const vars = {};
  Object.keys(view).forEach(k => { vars[k] = `<code>${esc(view[k])}</code>`; });
  if (p.ord) vars.ord = rubyHTML(raw('ord.' + p.ord, lang));
  ['f', 'f1', 'f2'].forEach(k => { if (p[k]) vars[k] = `<b class="agg">${rubyHTML(raw('agg.' + p[k], lang))}</b>`; });
  // phrases that are themselves translated, e.g. cond = "price is 4800 or more"
  if (lesson.phrases) Object.entries(lesson.phrases(p)).forEach(([k, [key, v]]) => { vars[k] = th(key, lang, Object.fromEntries(Object.entries(v).map(([a, b]) => [a, `<code>${esc(b)}</code>`]))); });
  return th(lesson.descKey ? lesson.descKey(p) : `L.${prob.lesson}.desc`, lang, vars);
}
export function syntaxHint(lesson, lang) {
  return lesson.syntax.replace(/\{(\w+)\}/g, (m, k) => `‹${t('ph.' + k, lang)}›`);
}

/* ---------- glossary: SQL keywords in text become buttons ---------- */
const GLOSS = ['SELECT', 'FROM', 'AS', 'WHERE', 'AND', 'OR', 'NOT', 'BETWEEN', 'IN', 'LIKE', 'IS NULL', 'NULL', 'DISTINCT', 'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'GROUP BY', 'HAVING', 'INNER JOIN', 'LEFT JOIN', 'JOIN', 'ON'];
export const GLOSS_KEYS = GLOSS;
const glossRe = new RegExp(`\\b(${GLOSS.map(g => g.replace(' ', '\\s+')).sort((a, b) => b.length - a.length).join('|')})\\b`, 'g');
export function withGloss(html) {
  // only outside of tags
  return html.replace(/(<[^>]+>)|([^<]+)/g, (m, tag, text) => tag || text.replace(glossRe, w => `<button class="kwref" data-act="gloss" data-kw="${w.replace(/\s+/g, ' ')}">${w}</button>`));
}

/* ---------- small things ---------- */
export function toast(msg) {
  document.querySelectorAll('.toast').forEach(e => e.remove());
  const d = document.createElement('div');
  d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2400);
}
export function copyText(text, done) {
  const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done && done(); } catch (e) { prompt('', text); } ta.remove(); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => done && done(), fallback); else fallback();
}
export function modal(html, opts) {
  closeModal();
  const d = document.createElement('div');
  d.className = 'modal-back'; d.id = 'modal';
  d.innerHTML = `<div class="modal ${opts && opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  d.addEventListener('click', e => { if (e.target === d) closeModal(); });
  document.body.appendChild(d);
  const f = d.querySelector('input, button, select'); if (f) f.focus();
  return d;
}
export function closeModal() { const m = document.getElementById('modal'); if (m) m.remove(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
