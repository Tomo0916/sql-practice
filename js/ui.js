/* =========================================================
 * ui.js — shared UI helpers for the student and teacher pages
 * ========================================================= */
import { LANGS, t, th, esc, rubyHTML, raw } from './i18n.js';
import { LESSON_BY_KEY } from './engine.js';
import { joinView, MORE_AGG } from './lessons.js';
import { PD_BY_KEY } from './pandas.js';

/* ---------- icons ---------- */
const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const I = {
  home: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>'),
  layers: svg('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>'),
  medal: svg('<circle cx="12" cy="14" r="6"/><path d="M8.5 9 6 3h4l2 4 2-4h4l-2.5 6"/><path d="m12 11.5.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z"/>'),
  code: svg('<path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/><path d="m14 5-4 14"/>'),
  inbox: svg('<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5.5 5h13L21 13v6H3v-6z"/>'),
  present: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/>'),
  words: svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>'),
  map: svg('<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  more: svg('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),
  timer: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>'),
  target: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
  blocks: svg('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>'),
  puzzle: svg('<path d="M9 3h6v3a2 2 0 1 0 4 0h2v6h-3a2 2 0 1 0 0 4h3v5h-6v-3a2 2 0 1 0-4 0v3H3v-6h3a2 2 0 1 0 0-4H3V3z"/>'),
  sliders: svg('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  pin: svg('<path d="M9 3h6l-1 6 3 3H7l3-3z"/><path d="M12 12v9"/>'),
  clip: svg('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/>'),
  stairs: svg('<path d="M3 20h5v-5h5v-5h5V5h3"/>'),
  sparkle: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>'),
  save: svg('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7M8 21v-7h8v7"/>'),
  folder: svg('<path d="M3 6h6l2 2h10v11H3z"/>'),
  expand: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
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
const PY_KW = new Set(['True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'import', 'from', 'as', 'for', 'if', 'elif', 'else', 'while', 'def', 'return', 'lambda', 'print', 'len']);
/** Highlight Python: strings, numbers, keywords, and the methods called after a dot (.head( …). */
export function highlightPy(src) {
  let out = '';
  const re = /("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|(#[^\n]*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|([\s\S])/g;
  let m;
  while ((m = re.exec(src))) {
    const [tok, str, comment, num, word] = m;
    if (str) out += `<span class="tok-str">${esc(str)}</span>`;
    else if (comment) out += `<span class="muted">${esc(comment)}</span>`;
    else if (num) out += `<span class="tok-num">${num}</span>`;
    else if (word) out += PY_KW.has(word) ? `<span class="tok-kw">${word}</span>` : src[m.index - 1] === '.' && src[re.lastIndex] === '(' ? `<span class="tok-fn">${word}</span>` : esc(word);
    else out += esc(tok);
  }
  return out;
}
/** the text of a Python-course problem: values as code, nested texts (cmp.ge …) filled the same way */
export function pyDescHTML(prob, lang) {
  const [k, v] = PD_BY_KEY[prob.lesson].desc(prob.p);
  const fill = vars => Object.fromEntries(Object.entries(vars).map(([a, b]) => [a, b && typeof b === 'object' ? th(b.k, lang, b.v ? fill(b.v) : undefined) : `<code>${esc(b)}</code>`]));
  return th(k, lang, fill(v));
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
  const hc = opts.headClass || (() => '');
  let h = `<table class="grid"><thead><tr>${opts.rowNums ? '<th class="rn">#</th>' : ''}${res.columns.map((c, j) => `<th class="${numCol[j] ? 'n ' : ''}${hc(j)}">${esc(c)}</th>`).join('')}</tr></thead><tbody>`;
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
  const text = th(lesson.descKey ? lesson.descKey(p) : `L.${prob.lesson}.desc`, lang, vars);
  if (!(p.more && p.more.length)) return text;   // a harder level: more columns to get
  const cols = p.more.map(c => `<code>${esc(c)}</code>`);
  return `${text} ${th(MORE_AGG.has(prob.lesson) ? 'L.moreAgg' : 'L.more', lang, { cols: cols.length === 1 ? cols[0] : th('list.two', lang, { a: cols[0], b: cols[1] }) })}`;
}
/** the text of a choice (a key like 'median' → its words; raw choices are data values) */
export function choiceHTML(prob, key, lang) {
  if (prob.p.raw) return esc(String(key));
  const vars = {};
  Object.keys(prob.p).forEach(k => { if (typeof prob.p[k] !== 'object') vars[k] = `<code>${esc(prob.p[k])}</code>`; });
  return th(`L.${prob.lesson}.c_${key}`, lang, vars);
}
/** the answer of a question, as words */
export function answerTextHTML(prob, lang) { return prob.p && prob.p.choices ? choiceHTML(prob, prob.answer, lang) : esc(String(prob.answer)); }
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

/* ---------- choosing how many problems (the same everywhere: practice, quick test, assignment) ----------
 * the usual numbers as big buttons, − / + for any other number in [min, max], and how long it takes
 * opts: { act, k (data-k), value, presets, min, max, secEach (seconds a problem, for the estimate), lang } */
/**
 * A table of counts (問題の組み立て): rows × columns with − / + in each cell, the totals, a bar of the mix and presets.
 * o = { act, rows: [{ id, label }], cols: [{ id, label, sub, tone }], get(rowId, colId) → number | null (no such cell),
 *       max (a cell), totalMax, secEach (for the time estimate), lang, presets: [{ v, label }], presetAct, presetOn, note }
 * Clicks: data-act=act data-r=row data-c=col data-d=±1; a preset: data-act=presetAct data-v.
 */
export function composeHTML(o) {
  const val = (r, c) => o.get(r.id, c.id), colSum = c => o.rows.reduce((a, r) => a + (val(r, c) || 0), 0);
  const sums = o.cols.map(colSum), total = sums.reduce((a, b) => a + b, 0), many = o.rows.length > 1, cols = o.cols.length > 1;
  const full = o.totalMax && total >= o.totalMax;
  const cell = (r, c) => { const v = val(r, c); if (v === null || v === undefined) return '<td class="cmp-na" aria-hidden="true">—</td>';
    return `<td class="${v ? 'on ' + (c.tone || '') : ''}"><span class="cmp-st"><button type="button" data-act="${o.act}" data-r="${r.id}" data-c="${c.id}" data-d="-1" aria-label="${esc(String(r.text || ''))} ${esc(String(c.text || ''))} −" ${v <= 0 ? 'disabled' : ''}>−</button><b>${v}</b><button type="button" data-act="${o.act}" data-r="${r.id}" data-c="${c.id}" data-d="1" aria-label="${esc(String(r.text || ''))} ${esc(String(c.text || ''))} +" ${v >= o.max || full ? 'disabled' : ''}>+</button></span></td>`; };
  const rowSum = r => o.cols.reduce((a, c) => a + (val(r, c) || 0), 0), min = Math.max(1, Math.round(o.rows.reduce((a, r) => a + rowSum(r) * (o.secFor ? o.secFor(r) : o.secEach || 60), 0) / 60));
  return `<div class="cmp">
    ${(o.groups || (o.presets && o.presets.length ? [{ act: o.presetAct, on: o.presetOn, items: o.presets }] : [])).map(g => `<div class="cmp-presets">${g.label ? `<span class="cmp-pl">${g.label}</span>` : ''}${g.items.map(p => `<button type="button" class="cmp-p ${g.on === p.v ? 'on' : ''}" data-act="${g.act}" data-v="${p.v}" aria-pressed="${g.on === p.v}">${p.label}</button>`).join('')}</div>`).join('')}
    <div class="cmp-wrap"><table class="cmp-t ${many ? 'many' : ''}">
      <thead><tr><th class="cmp-rh">${o.corner || ''}</th>${o.cols.map(c => `<th class="cmp-ch ${c.tone || ''}"><b>${c.label}</b>${c.sub ? `<small>${c.sub}</small>` : ''}</th>`).join('')}${cols ? `<th class="cmp-sum">${th('cmp.sum', o.lang)}</th>` : ''}</tr></thead>
      <tbody>${o.rows.map((r, i) => `${r.group && (i === 0 || o.rows[i - 1].group !== r.group) ? `<tr class="cmp-g"><th colspan="${o.cols.length + (cols ? 2 : 1)}">${r.group}</th></tr>` : ''}<tr class="${r.cls || ''}"><th class="cmp-rh">${r.label}</th>${o.cols.map(c => cell(r, c)).join('')}${cols ? `<td class="cmp-sum"><b>${rowSum(r)}</b></td>` : ''}</tr>`).join('')}</tbody>
      ${many && cols ? `<tfoot><tr><th class="cmp-rh">${th('cmp.sum', o.lang)}</th>${sums.map((n, i) => `<td class="${o.cols[i].tone || ''}"><b>${n}</b></td>`).join('')}<td class="cmp-sum"><b>${total}</b></td></tr></tfoot>` : ''}
    </table></div>
    ${cols && total ? `<div class="cmp-bar" aria-hidden="true">${o.cols.map((c, i) => (sums[i] ? `<i class="${c.tone || ''}" style="flex:${sums[i]}"></i>` : '')).join('')}</div>` : ''}
    ${o.hideTotal ? '' : `<div class="cmp-total"><b>${th('cnt.sum', o.lang, { n: total, m: min })}</b>${cols && total ? `<span class="muted">${o.cols.map((c, i) => (sums[i] ? `<span class="cmp-lg ${c.tone || ''}"><i></i>${c.label} ${sums[i]}</span>` : '')).join('')}</span>` : ''}</div>`}
    ${!total && !o.hideTotal ? `<p class="err small">${th('cmp.empty', o.lang)}</p>` : ''}${o.note ? `<p class="muted small">${o.note}</p>` : ''}
  </div>`;
}
export function countPickHTML(o) {
  const v = o.value, btn = n => `<button type="button" class="cp-n ${n === v ? 'on' : ''}" data-act="${o.act}" data-k="${o.k}" data-v="${n}" aria-pressed="${n === v}"><b>${n}</b></button>`;
  const off = !o.presets.includes(v), min = Math.round((o.secEach || 60) * v / 60);
  return `<div class="cpick" role="group">
    <div class="cp-row">${o.presets.map(btn).join('')}
      <span class="cp-step ${off ? 'on' : ''}"><button type="button" data-act="${o.act}" data-k="${o.k}" data-v="${Math.max(o.min, v - 1)}" aria-label="−" ${v <= o.min ? 'disabled' : ''}>−</button><b>${v}</b><button type="button" data-act="${o.act}" data-k="${o.k}" data-v="${Math.min(o.max, v + 1)}" aria-label="+" ${v >= o.max ? 'disabled' : ''}>+</button></span></div>
    <small class="cp-est">${th('cnt.sum', o.lang, { n: v, m: Math.max(1, min) })}</small></div>`;
}

/* ---------- emoji → line icons: every emoji that reaches the page (texts, toasts, partial redraws) is drawn as a simple icon ---------- */
const EMOJI_ICON = { '🎉': 'sparkle', '🧱': 'blocks', '🧩': 'puzzle', '📽': 'present', '📝': 'clip', '🎯': 'target', '🎚': 'sliders', '🗂': 'table', '📬': 'inbox', '📌': 'pin', '⏱': 'timer', '🌐': 'globe', '🔒': 'lock', '🏅': 'medal', '🐍': 'code', '🪜': 'stairs', '💾': 'save', '📂': 'folder', '⛶': 'expand', '📖': 'words', '📊': 'chart', '🔥': 'fire', '👀': 'eye', '⚡': 'bolt', '📈': 'chart', '✏️': 'clip', '✏': 'clip', '📋': 'clip', '🏠': 'home', '📚': 'layers', '🔁': 'repeat', '🔀': 'shuffle', '🖨': 'print', '👥': 'users', '⚙': 'gear', '⚙️': 'gear' };
const EMOJI_RE = /(?:\p{Extended_Pictographic}|⛶)\uFE0F?/gu;
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'INPUT']);
function iconizeText(node) {
  const p = node.parentNode; if (!p || SKIP.has(p.nodeName) || (p.closest && p.closest('.cm-editor, .no-icons'))) return;
  const txt = node.nodeValue; EMOJI_RE.lastIndex = 0; let hit = false, m0; while ((m0 = EMOJI_RE.exec(txt))) if (EMOJI_ICON[m0[0]] || EMOJI_ICON[m0[0].replace('\uFE0F', '')]) { hit = true; break; } if (!hit) return;
  if (p.nodeName === 'OPTION' || p.nodeName === 'TITLE') { node.nodeValue = txt.replace(EMOJI_RE, x => (EMOJI_ICON[x] || EMOJI_ICON[x.replace('\uFE0F', '')] ? '' : x)).replace(/^\s+/, ''); return; }
  const frag = document.createDocumentFragment(); let at = 0; EMOJI_RE.lastIndex = 0; let m;
  while ((m = EMOJI_RE.exec(txt))) {
    if (m.index > at) frag.appendChild(document.createTextNode(txt.slice(at, m.index)));
    const k = EMOJI_ICON[m[0]] || EMOJI_ICON[m[0].replace('\uFE0F', '')];
    if (k && I[k]) { const sp = document.createElement('span'); sp.className = 'ic'; sp.innerHTML = I[k]; frag.appendChild(sp); }
    else frag.appendChild(document.createTextNode(m[0]));   // arrows and other symbols stay as they are
    at = m.index + m[0].length;
  }
  if (at < txt.length) frag.appendChild(document.createTextNode(txt.slice(at)));
  p.replaceChild(frag, node);
}
function iconizeTree(root) {
  if (root.nodeType === 3) { iconizeText(root); return; }
  if (root.nodeType !== 1 || SKIP.has(root.nodeName)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [];
  while (w.nextNode()) list.push(w.currentNode);
  list.forEach(iconizeText);
}
/** start once per page: draw emoji as icons from now on */
export function startIconizer(root = document.body) {
  iconizeTree(root);
  new MutationObserver(ms => ms.forEach(m => { if (m.type === 'characterData') iconizeText(m.target); else m.addedNodes.forEach(iconizeTree); }))
    .observe(root, { childList: true, subtree: true, characterData: true });
}
