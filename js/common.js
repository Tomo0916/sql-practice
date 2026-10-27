/* =========================================================
 * common.js — helpers shared by the app (index.html) and the test maker (test.html)
 * ========================================================= */

/* ---------- storage (never throws; private mode just forgets) ---------- */
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
};
const KEYS = { lang: 'sqlp.lang', progress: 'sqlp.progress.v2', set: 'sqlp.set', presenter: 'sqlp.presenter', test: 'sqlp.test' };

/* ---------- language ---------- */
function detectLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q && LANG_CODES.includes(q)) { Store.set(KEYS.lang, q); return q; }
  const saved = Store.get(KEYS.lang, null);
  if (saved && LANG_CODES.includes(saved)) return saved;
  const nav = (navigator.languages || [navigator.language || 'ja']).map(s => String(s).slice(0, 2).toLowerCase());
  return nav.find(c => LANG_CODES.includes(c)) || 'ja';
}
function applyLang(lang) {
  Store.set(KEYS.lang, lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n, lang); });
}
function langSelectHTML(lang) {
  return `<label class="lang-wrap"><span class="sr">${esc(t('nav.language', lang))}</span>${ICONS.globe}
    <select class="lang-select" data-act="lang" aria-label="${esc(t('nav.language', lang))}">
      ${LANGS.map(l => `<option value="${l.code}" ${l.code === lang ? 'selected' : ''} lang="${l.code}">${esc(l.name)}</option>`).join('')}
    </select></label>`;
}

/* ---------- icons (inline SVG, currentColor) ---------- */
const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
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
  print: svg('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>')
};

/* ---------- SQL syntax highlighting ---------- */
const SQL_KEYWORDS = new Set('SELECT FROM WHERE AND OR NOT IN IS NULL LIKE BETWEEN DISTINCT ORDER BY ASC DESC LIMIT OFFSET GROUP HAVING AS JOIN INNER LEFT RIGHT OUTER FULL CROSS ON UNION ALL CASE WHEN THEN ELSE END WITH EXISTS'.split(' '));
const SQL_FUNCS = new Set('COUNT SUM AVG MAX MIN ROUND LENGTH UPPER LOWER ABS COALESCE IFNULL SUBSTR'.split(' '));
function highlightSQL(src) {
  let out = '';
  const re = /('(?:[^']|'')*'?)|(‹[^›]*›)|(___)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(--[^\n]*)|([\s\S])/g;
  let m;
  while ((m = re.exec(src))) {
    const [tok, str, ph, blank, num, word, comment] = m;
    if (str) out += `<span class="tok-str">${esc(str).replace(/___/g, '<span class="tok-blank">___</span>')}</span>`;
    else if (ph) out += `<span class="tok-ph">${esc(ph)}</span>`;
    else if (blank) out += '<span class="tok-blank">___</span>';
    else if (num) out += `<span class="tok-num">${num}</span>`;
    else if (word) {
      const u = word.toUpperCase();
      if (SQL_KEYWORDS.has(u)) out += `<span class="tok-kw">${esc(word)}</span>`;
      else if (SQL_FUNCS.has(u) && src[re.lastIndex] === '(') out += `<span class="tok-fn">${esc(word)}</span>`;
      else out += esc(word);
    } else if (comment) out += `<span class="muted">${esc(comment)}</span>`;
    else out += esc(tok);
  }
  return out;
}
/** Highlight SQL and mark the words that are new compared with `prev` (used by step-by-step). */
function highlightDiff(prev, cur) {
  const tok = s => [...String(s || '').matchAll(/'(?:[^']|'')*'|[(),;*]|[^\s(),;*']+/g)].map(m => ({ w: m[0], i: m.index }));
  const a = tok(prev).map(x => x.w), bt = tok(cur), b = bt.map(x => x.w);
  const n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const isNew = new Array(m).fill(!!prev);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i] === b[j]) { isNew[j] = false; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  let html = '', pos = 0, open = false;
  bt.forEach((x, j) => {
    const gap = cur.slice(pos, x.i);
    if (open && !isNew[j]) { html += '</mark>'; open = false; }
    html += esc(gap);
    if (!open && isNew[j]) { html += '<mark>'; open = true; }
    html += highlightSQL(x.w);
    pos = x.i + x.w.length;
  });
  if (open) html += '</mark>';
  return html + esc(cur.slice(pos));
}

/* ---------- result tables ---------- */
function fmtCell(v) {
  if (v === null || v === undefined) return '<span class="null">NULL</span>';
  if (typeof v === 'number' && !Number.isInteger(v)) return String(Math.round(v * 10000) / 10000);
  return esc(v);
}
function gridHTML(res, opts) {
  opts = opts || {};
  if (!res || !res.columns || !res.columns.length) return '';
  const numCol = res.columns.map((_, j) => res.values.length > 0 && res.values.every(r => r[j] === null || typeof r[j] === 'number'));
  let h = `<table class="grid"><thead><tr>${opts.rowNums ? '<th class="rn">#</th>' : ''}${res.columns.map((c, j) => `<th${numCol[j] ? ' style="text-align:right"' : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>`;
  res.values.forEach((r, i) => {
    h += `<tr>${opts.rowNums ? `<td class="rn">${i + 1}</td>` : ''}${r.map((v, j) => `<td${numCol[j] ? ' class="n"' : ''}>${fmtCell(v)}</td>`).join('')}</tr>`;
  });
  return h + '</tbody></table>';
}

/* ---------- SQL engine loading ---------- */
const SQLJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/';
function loadEngine() {
  return initSqlJs({ locateFile: f => SQLJS_BASE + f }).then(SQL => new SqlEngine(SQL));
}

/* ---------- set code (shared between app and test maker) ---------- */
function currentSet() {
  const q = normCode(new URLSearchParams(location.search).get('set'));
  if (q) { Store.set(KEYS.set, { code: q }); return { code: q, custom: true }; }
  const s = Store.get(KEYS.set, null);
  if (s && s.code) return { code: s.code, custom: true };
  return { code: todayCode(), custom: false };
}

function toast(msg) {
  document.querySelectorAll('.toast').forEach(e => e.remove());
  const d = document.createElement('div');
  d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2200);
}
