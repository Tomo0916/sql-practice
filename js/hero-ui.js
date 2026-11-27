/* The adventure screens (冒険): #/hero (status), #/hero/edit (the pixel avatar), the party of the class,
 * and the "you got …!" message. Everything is worked out by hero.js from the progress. */
import { t, th, esc } from './i18n.js';
import { getMode, modeBtnHTML, copyText } from './ui.js';
import { RK_CHAPTERS } from './rank.js';
import { LV_CHAPTERS } from './level.js';
import { AV, PALETTE, AV_TEMPLATES, AV_EMPTY, SPECIAL, SPECIAL_NEED, avCss, avCells, avEncode, avToCSV, avFromCSV, specialName, avOk, avatarSVG, heroSVG, avFill, WEAPON_OF, SYNTAX_OF, weaponSVG, weaponNext, heroOf, TROPHIES, trophiesOf, titlesOf, titleKey, earnedIds, heroPublic, heroPublicOk } from './hero.js';

let C = null;   // { S, render, save, backend, toast }
export function installHero(ctx) { C = ctx; }
const L = () => C.S.settings.lang;
const T = (k, v) => t(k, L(), v);
const H = (k, v) => `<span class="tx">${th(k, L(), v && Object.fromEntries(Object.entries(v).map(([a, b]) => [a, esc(b)])))}</span>`;
const rec = () => (C.S.progress.hero = Object.assign({ a: '', t: 'novice', seen: null, at: 0 }, C.S.progress.hero));
const myName = () => (C.S.klass && C.S.klass.nickname) || T('hero.you');
export const myAvatar = () => { const a = rec().a; return avOk(a) ? a : AV_TEMPLATES.knight; };

/* ---------- names ---------- */
export const weaponName = (ch, g) => g ? T('hero.wname', { g: T(`hero.g${g}`), w: T(`hero.w.${WEAPON_OF[ch]}`) }) : T(`hero.w.${WEAPON_OF[ch]}`);
export const titleName = id => { const k = titleKey(id); return T(k.key, k.vars); };

/* ---------- the status page ---------- */
function win(title, body, cls = '') { return `<section class="rpg-win ${cls}"><h2 class="rpg-h">${title}</h2>${body}</section>`; }
export function heroHTML() {
  const h = heroOf(C.S.progress), me = rec(), titles = titlesOf(h), tr = trophiesOf(h), cur = titles.some(x => x.id === me.t) ? me.t : 'novice';
  const nextCh = h.lv < LV_CHAPTERS.length ? LV_CHAPTERS[h.lv] : null;
  const status = win(H('hero.status'), `<div class="hero-top">
      <div class="hero-av">${heroSVG(heroPublic(C.S.progress), 168, esc(myName()))}<a class="btn btn-ghost btn-sm" href="#/hero/edit">🎨 ${H('hero.draw')}</a></div>
      <div class="hero-st"><p class="hero-name">${esc(myName())}</p>
        <p class="hero-title">〈${esc(titleName(cur))}〉</p>
        <p class="hero-lv">Lv <b>${h.lv}</b></p>
        <p class="small">${nextCh ? H('hero.lvNext', { ch: T('ch.' + nextCh) }) : H('hero.lvTop')} <a href="#/level">${H('hero.toLevel')} →</a></p>
        <label class="fld hero-tsel"><span>${H('hero.titleSel')}</span><select data-hero-title>${titles.map(x => `<option value="${x.id}" ${x.id === cur ? 'selected' : ''}>${esc(T(x.key, x.vars))}</option>`).join('')}</select></label>
        <p class="muted small">${H('hero.titleTip', { n: titles.length })}</p></div></div>
      <p class="muted small hero-look">✨ ${H('hero.lookTip')}</p>`);
  const held = heroPublic(C.S.progress).h;
  const equip = win(H('hero.equip'), `<p class="muted small">${H('hero.equipTip')}</p><ul class="hero-weapons">${RK_CHAPTERS.map(ch => { const g = h.w[ch], nx = weaponNext(g);
      return `<li class="g${g}">${weaponSVG(WEAPON_OF[ch], g, 40)}<div><b>${g ? esc(weaponName(ch, g)) : `<span class="muted">${H('hero.noWeapon', { w: T(`hero.w.${WEAPON_OF[ch]}`) })}</span>`}</b>
        <small class="mono">${esc(SYNTAX_OF[ch])}</small><small class="muted">${nx ? H('hero.next', { tier: T('rk.tier.' + nx.tier), rank: nx.rank, w: weaponName(ch, g + 1) }) : H('hero.max')}</small></div>${g ? (held === ch ? `<span class="hero-held">✋ ${H('hero.holding')}</span>` : `<button type="button" class="btn btn-ghost btn-xs hero-hold" data-hero-hold="${ch}">✋ ${H('hero.hold')}</button>`) : ''}</li>`; }).join('')}</ul>
    <p class="small"><a href="#/rank">${H('hero.toRank')} →</a></p>`);
  const q = h.q, bar = (n, m) => `<span class="hero-bar"><i style="width:${m ? Math.round(n / m * 100) : 0}%"></i></span><b>${n} / ${m}</b>`;
  const quest = win(H('hero.quest'), `<div class="hero-q">
      <div><h3>HackerRank</h3>${['sel', 'rel', 'agg'].map(a => `<p class="hero-qrow"><span>${H('hr.area.' + a)}</span>${bar(q.areas[a].n, q.areas[a].m)}</p>`).join('')}
        <p class="hero-qrow boss"><span>👹 ${H('hero.boss')}</span><b>${q.mockBest === null ? H('hero.notYet') : H('hero.bossBest', { n: q.mockBest })}</b></p><a class="btn btn-ghost btn-sm" href="#/hr">${H('hero.go')}</a></div>
      <div><h3>paiza</h3><p class="hero-pz">${[1, 2, 3, 4, 5].map(lv => `<span class="${q.pzCleared.includes(lv) ? 'on' : ''}">Lv${lv}</span>`).join('')}</p>
        <p class="small">${q.pzLv ? H('hero.pzLv', { n: q.pzLv }) : H('hero.notYet')}</p><a class="btn btn-ghost btn-sm" href="#/pz">${H('hero.go')}</a></div></div>`);
  const shelf = win(`${H('hero.trophies')} <small>${tr.length} / ${TROPHIES.length}</small>`, `<ul class="hero-tr">${TROPHIES.map(([id, tier]) => { const ok = tr.includes(id);
      return `<li class="${ok ? 'on' : ''} t${tier}" title="${esc(T(`hero.tr.${id}.d`))}"><span class="cup" aria-hidden="true">${ok ? ['🥉', '🥈', '🏆'][tier - 1] : '❔'}</span><b>${ok ? H(`hero.tr.${id}.n`) : H('hero.locked')}</b><small>${H(`hero.tr.${id}.d`)}</small></li>`; }).join('')}</ul>`);
  return `<div class="hero-page"><header class="page-head"><h1>⚔️ ${H('hero.title')}</h1><p class="muted">${H('hero.lead')}</p>
      <p class="hero-mode small"><span class="muted">${H(getMode() === 'adv' ? 'mode.tip' : 'mode.tryAdv')}</span> ${modeBtnHTML(L(), 'btn')}</p></header>
    <div class="hero-grid">${status}${equip}</div>${quest}${shelf}${partyHTML()}</div>`;
}

/* ---------- the party: the class's avatars (Supabase class_heroes) ---------- */
const party = { cid: null, rows: undefined, at: 0 };
export function loadParty(force) {
  const k = C.S.klass; if (!k || !C.backend.enabled) return;
  if (party.cid !== k.id) Object.assign(party, { cid: k.id, rows: undefined, at: 0 });
  if (party.rows === 'loading' || (!force && party.rows !== undefined && Date.now() - party.at < 60000)) return;
  party.rows = 'loading';
  C.backend.classHeroes(k.id).then(r => { party.rows = r; }, () => { party.rows = null; }).then(() => { party.at = Date.now(); if (C.S.route.view === 'hero' || C.S.route.kind === 'rank') C.render(); });
}
/** nickname → public hero, for the class (empty until loaded) */
export function classHeroMap() {
  loadParty();
  const m = new Map();
  if (Array.isArray(party.rows)) party.rows.forEach(r => { if (heroPublicOk(r.hero)) m.set(r.nickname, r.hero); });
  if (C.S.klass) m.set(C.S.klass.nickname, heroPublic(C.S.progress));
  return m;
}
function partyHTML() {
  if (!C.S.klass || !C.backend.enabled) return win(H('hero.party'), `<p class="muted small">${H('hero.partyNeed')}</p>`);
  const m = classHeroMap(), rows = [...m.entries()].sort((a, b) => (b[1].lv - a[1].lv) || (b[1].tr - a[1].tr));
  const body = party.rows === 'loading' || party.rows === undefined ? `<p class="muted small">${H('rk.loading')}</p>`
    : party.rows === null ? `<p class="muted small">${H('hero.partyDb')}</p>`
      : `<ul class="hero-party">${rows.map(([n, x]) => `<li class="${n === C.S.klass.nickname ? 'me' : ''}">${heroSVG(x, 84, esc(n))}<b>${esc(n)}</b><small>〈${esc(titleName(x.t))}〉</small><small>Lv ${x.lv} · 🏆 ${x.tr}</small>
          <span class="hero-mini">${RK_CHAPTERS.map((ch, i) => weaponSVG(WEAPON_OF[ch], +String(x.w || '')[i] || 0, 16)).join('')}</span></li>`).join('')}</ul>`;
  return win(`${H('hero.party')} <small>${C.S.klass ? esc(C.S.klass.name) : ''}</small>`, `<p class="muted small">${H('hero.partyLead')}</p>${body}`);
}

/* ---------- the avatar editor ---------- */
const ed = { cells: null, c: '1b1b25', tool: 'pen', mirror: false, undo: [], down: false, what: '', base: false, csv: '', msg: '' };
const BASE = PALETTE.slice(1, 16).map(x => x.slice(1));
const trophyN = () => trophiesOf(heroOf(C.S.progress)).length;
const isOpen = c => !SPECIAL[c] || SPECIAL_NEED[c] <= trophyN();
function swatch(c, label, extra = '') {
  const lock = !isOpen(c), on = ed.tool !== 'erase' && ed.c === c;
  const tip = lock ? T('hero.colorLock', { n: SPECIAL_NEED[c] }) : label;
  return `<button type="button" class="${on ? 'on' : ''} ${lock ? 'lock' : ''} ${SPECIAL[c] ? 'sp' : ''} ${extra}" ${lock ? 'disabled' : ''} data-hero-c="${c}" style="background:${avCss(c)}" title="${esc(tip)}" aria-label="${esc(tip)}" aria-pressed="${on}">${lock ? '🔒' : ''}</button>`;
}
export function editHTML() {
  if (ed.cells === null) ed.cells = (avCells(rec().a) || avCells(AV_TEMPLATES.knight)).slice();
  const cells = ed.cells.map((v, i) => `<i data-av="${i}" style="${v ? `background:${avCss(v)}` : ''}"></i>`).join('');
  const tool = (k, ic) => `<button type="button" class="btn btn-ghost btn-sm ${ed.tool === k ? 'on' : ''}" data-hero-tool="${k}" aria-pressed="${ed.tool === k}">${ic} ${H('hero.' + k)}</button>`;
  const used = [...new Set(ed.cells.filter(c => c && !SPECIAL[c] && !BASE.includes(c)))].slice(0, 16);
  const cur = ed.c && !SPECIAL[ed.c] ? '#' + ed.c : '#1b1b25';
  const palette = `<div class="rpg-win"><h2 class="rpg-h">${H('hero.palette')}</h2>
      <p class="av-sub">${H('hero.base')}</p><div class="av-pal">${BASE.map(c => swatch(c, '#' + c.toUpperCase())).join('')}<button type="button" class="clear ${ed.tool === 'erase' ? 'on' : ''}" data-hero-tool="erase" title="${esc(T('hero.erase'))}" aria-label="${esc(T('hero.erase'))}"></button></div>
      <p class="av-sub">${H('hero.free')}</p><div class="av-free"><input type="color" value="${cur}" data-hero-pick aria-label="${esc(T('hero.free'))}"><code data-hero-hex>${esc(cur.toUpperCase())}</code></div>
      ${used.length ? `<p class="av-sub">${H('hero.used')}</p><div class="av-pal">${used.map(c => swatch(c, '#' + c.toUpperCase())).join('')}</div>` : ''}
      <p class="av-sub">${H('hero.special')}</p><div class="av-pal">${Object.keys(SPECIAL).map(c => swatch(c, specialName(c))).join('')}</div>
      <div class="row-btns left">${tool('pen', '✏️')}${tool('fill', '🪣')}${tool('erase', '🧽')}</div>
      <div class="row-btns left"><button type="button" class="btn btn-ghost btn-sm ${ed.mirror ? 'on' : ''}" data-hero-do="mirror" aria-pressed="${ed.mirror}">↔️ ${H('hero.mirror')}</button><button type="button" class="btn btn-ghost btn-sm" data-hero-do="undo" ${ed.undo.length ? '' : 'disabled'}>↩️ ${H('hero.undo')}</button><button type="button" class="btn btn-ghost btn-sm" data-hero-do="clear">🗑 ${H('hero.clear')}</button></div></div>`;
  const ai = `<div class="rpg-win hero-ai"><h2 class="rpg-h">🤖 ${H('hero.ai')}</h2>
      <p class="small muted">${H('hero.aiLead')}</p>
      <ol class="hero-ai-steps">
        <li><label class="fld"><span>${H('hero.aiWhat')}</span><input type="text" data-hero-ai="what" value="${esc(ed.what)}" placeholder="${esc(T('hero.aiWhatPh'))}" maxlength="200"></label>
          <label class="chk"><input type="checkbox" data-hero-ai="base" ${ed.base ? 'checked' : ''}><span>${H('hero.aiBase')}</span></label>
          <button type="button" class="btn btn-ghost btn-sm" data-hero-do="aiCopy">📋 ${H('hero.aiCopy')}</button></li>
        <li><label class="fld"><span>${H('hero.aiPaste')}</span><textarea data-hero-ai="csv" rows="4" spellcheck="false" placeholder="-,-,#1B1B25,#1B1B25,…">${esc(ed.csv)}</textarea></label>
          <div class="row-btns left"><button type="button" class="btn btn-primary btn-sm" data-hero-do="aiLoad">🎨 ${H('hero.aiLoad')}</button><label class="btn btn-ghost btn-sm">📄 ${H('hero.aiFile')}<input type="file" accept=".csv,.txt,text/csv,text/plain" data-hero-ai-file hidden></label></div>
          <div class="hero-ai-msg small" data-hero-ai-msg role="status">${ed.msg}</div></li>
      </ol>
      <details class="small"><summary>${H('hero.aiFormat')}</summary><p class="muted">${H('hero.aiTip', { names: Object.keys(SPECIAL).map(specialName).join(', ') })}</p></details>
      <div class="row-btns left"><button type="button" class="btn btn-ghost btn-sm" data-hero-do="csvOut">⬇ ${H('hero.csvOut')}</button><button type="button" class="btn btn-ghost btn-sm" data-hero-do="csvCopy">📋 ${H('hero.csvCopy')}</button></div></div>`;
  return `<div class="hero-page hero-edit"><header class="page-head"><h1>🎨 ${H('hero.draw')}</h1><p class="muted">${H('hero.editTip')}</p></header>
    <div class="hero-ed">
      <div class="hero-ed-main"><div class="rpg-win"><div class="av-grid ${ed.mirror ? 'mirror' : ''}" data-av-grid style="--n:${AV}">${cells}</div></div>${ai}</div>
      <div class="hero-ed-side">${palette}
        <div class="rpg-win"><h2 class="rpg-h">${H('hero.tpl')}</h2><div class="av-tpls">${Object.keys(AV_TEMPLATES).map(k => `<button type="button" data-hero-tpl="${k}">${avatarSVG(AV_TEMPLATES[k], 48)}<small>${H(`hero.tpl.${k}`)}</small></button>`).join('')}</div></div>
        <div class="rpg-win hero-prev"><h2 class="rpg-h">${H('hero.preview')}</h2><div data-av-prev>${avatarSVG(ed.cells, 96)}${avatarSVG(ed.cells, 32)}</div></div>
        <div class="row-btns left"><button type="button" class="btn btn-primary" data-hero-do="save">💾 ${H('hero.save')}</button><a class="btn btn-ghost" href="#/hero" data-hero-do="cancel">${H('hero.cancel')}</a></div>
      </div></div></div>`;
}
function paintAt(i) {
  const x = i % AV, y = Math.floor(i / AV), c = ed.tool === 'erase' ? '' : ed.c;
  let a = ed.cells;
  if (ed.tool === 'fill') { a = avFill(a, x, y, c); if (ed.mirror) a = avFill(a, AV - 1 - x, y, c); }
  else { a = a.slice(); a[i] = c; if (ed.mirror) a[y * AV + (AV - 1 - x)] = c; }
  if (a.join() === ed.cells.join()) return;
  ed.cells = a; drawGrid();
}
function drawGrid() {
  const g = document.querySelector('[data-av-grid]'); if (!g) return;
  g.querySelectorAll('[data-av]').forEach((el, i) => { el.style.background = avCss(ed.cells[i]); });
}
const drawPrev = () => { const p = document.querySelector('[data-av-prev]'); if (p) p.innerHTML = avatarSVG(ed.cells, 96) + avatarSVG(ed.cells, 32); };
const pushUndo = () => { ed.undo.push(ed.cells.slice()); if (ed.undo.length > 40) ed.undo.shift(); };
export function editLeave() { Object.assign(ed, { cells: null, undo: [], msg: '', csv: '' }); }

/* ---------- AI: the prompt to copy, and the CSV it gives back ---------- */
function aiPrompt() {
  const what = ed.what.trim() || 'an original hero for a retro RPG, standing and facing forward';
  const names = Object.keys(SPECIAL).filter(isOpen).map(specialName);
  return [`Draw 16x16 pixel art of: ${what}`, '',
    ...(ed.base ? ['Start from my current picture below (same format) and change it as asked.', '```csv', avToCSV(ed.cells), '```', ''] : []),
    'Rules for your answer:',
    '- Output CSV only, in one code block, with no explanation.',
    '- Exactly 16 lines. Each line has exactly 16 values separated by commas.',
    '- Each value is one pixel: a colour as #RRGGBB, or - for a transparent pixel.',
    '- Keep the background transparent (-). Draw the subject large and centred, with a dark outline, like a retro game sprite.',
    ...(names.length ? [`- You may also use these special shining colours by name: ${names.join(', ')}.`] : [])].join('\n');
}
function aiLoad(text) {
  const r = avFromCSV(text, isOpen), box = document.querySelector('[data-hero-ai-msg]');
  if (!r || !r.colored) { ed.msg = `<p class="bad">${H('hero.aiNone')}</p>`; if (box) box.innerHTML = ed.msg; return; }
  pushUndo(); ed.cells = r.cells;
  const notes = [H('hero.aiDone', { n: r.colored })];
  if (r.rows !== AV) notes.push(H('hero.aiFixRows', { n: r.rows }));
  if (r.cols) notes.push(H('hero.aiFixCols', { n: r.cols }));
  if (r.bad) notes.push(H('hero.aiFixBad', { n: r.bad }));
  if (r.lock) notes.push(H('hero.aiFixLock', { n: r.lock }));
  if (r.colors) notes.push(H('hero.aiFixMany', { n: r.colors }));
  ed.msg = notes.map((x, i) => `<p class="${i ? 'warn' : 'ok'}">${i ? '⚠️' : '✅'} ${x}</p>`).join('');
  C.render();
}
function download(name, text) {
  const u = URL.createObjectURL(new Blob([text + '\n'], { type: 'text/csv' })), a = document.createElement('a');
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000);
}

/* ---------- "you got …!" (after a test, on the next screen) ---------- */
export function heroNews() {
  const me = rec(), ids = earnedIds(heroOf(C.S.progress));
  if (!Array.isArray(me.seen)) { me.seen = ids; C.save(); return ''; }   // the first time: what was there already is not news
  const fresh = ids.filter(id => !me.seen.includes(id));
  if (!fresh.length) return '';
  const who = esc(myName()), line = id => {
    const [k, a, b] = id.split(':');
    if (k === 'w') return `${weaponSVG(WEAPON_OF[a], +b, 32)} ${H('hero.got', { who: myName(), what: weaponName(a, +b) })}`;
    if (k === 'lv') return `⬆️ ${H('hero.gotLv', { who: myName(), n: a })}`;
    if (k === 'c') return `<span class="hero-sw" style="background:${avCss((+a).toString(36))}"></span> ${H('hero.gotColor')}`;
    return `${['🥉', '🥈', '🏆'][((TROPHIES.find(x => x[0] === a) || [])[1] || 1) - 1]} ${H('hero.gotTrophy', { what: T(`hero.tr.${a}.n`) })}`;
  };
  // the best of each weapon only (getting 鉄 also passes 木)
  const lastC = fresh.filter(id => id.startsWith('c:')).pop();
  const shown = fresh.filter(id => { const m = /^w:([a-z]+):(\d)$/.exec(id), l = /^lv:(\d)$/.exec(id); return m ? !fresh.includes(`w:${m[1]}:${+m[2] + 1}`) : l ? !fresh.includes(`lv:${+l[1] + 1}`) : id.startsWith('c:') ? id === lastC : true; });
  void who;
  return `<div class="rpg-msg" role="dialog" aria-modal="true" data-hero-news><div class="rpg-win">${heroSVG(heroPublic(C.S.progress), 84)}<div>${shown.map(id => `<p>${line(id)}</p>`).join('')}</div>
    <div class="row-btns"><a class="btn btn-ghost btn-sm" href="#/hero" data-hero-do="newsOk">${H('hero.see')}</a><button type="button" class="btn btn-primary btn-sm" data-hero-do="newsOk" autofocus>▼ ${H('hero.ok')}</button></div></div></div>`;
}

/* ---------- the class sees the public part: saved to members.hero when it changes ---------- */
let sent = '', sendT = 0;
export function heroSync() {
  const k = C.S.klass; if (!k || !C.backend.enabled) return;
  const pub = heroPublic(C.S.progress), s = k.id + JSON.stringify(pub);
  if (s === sent) return;
  clearTimeout(sendT);
  sendT = setTimeout(() => { C.backend.saveHero(k.id, pub).then(ok => { if (ok) { sent = s; const m = party.rows; if (Array.isArray(m)) { const r = m.find(x => x.nickname === k.nickname); if (r) r.hero = pub; } } }, () => {}); }, 1500);
}

/* ---------- events ---------- */
if (typeof document !== 'undefined') {
  document.addEventListener('input', e => {
    const t = e.target; if (!C || !t.dataset) return;
    if (t.dataset.heroAi === 'what') ed.what = t.value;
    else if (t.dataset.heroAi === 'csv') ed.csv = t.value;
    else if (t.dataset.heroAi === 'base') ed.base = t.checked;
    else if (t.dataset.heroPick !== undefined) { ed.c = t.value.slice(1).toLowerCase(); if (ed.tool === 'erase') ed.tool = 'pen'; const h = document.querySelector('[data-hero-hex]'); if (h) h.textContent = t.value.toUpperCase(); document.querySelectorAll('.av-pal button.on').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); }); }
  });
  document.addEventListener('change', e => {
    const t = e.target; if (!C || !t.matches) return;
    if (t.matches('[data-hero-ai="base"]')) { ed.base = t.checked; return; }
    if (t.matches('[data-hero-pick]')) { C.render(); return; }
    if (t.matches('[data-hero-ai-file]') && t.files && t.files[0]) { t.files[0].text().then(x => { ed.csv = x.slice(0, 20000); aiLoad(ed.csv); }); return; }
  });
  document.addEventListener('change', e => {
    const s = e.target.closest && e.target.closest('[data-hero-title]'); if (!s || !C) return;
    const me = rec(); me.t = s.value; me.at = Date.now(); C.save(); heroSync(); C.render();
  });
  const cellOf = e => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.closest && el.closest('[data-av]'); };
  document.addEventListener('pointerdown', e => {
    const c = e.target.closest && e.target.closest('[data-av]'); if (!c || !C) return;
    e.preventDefault(); pushUndo(); ed.down = true; paintAt(+c.dataset.av);
  });
  document.addEventListener('pointermove', e => { if (!ed.down || ed.tool === 'fill') return; const c = cellOf(e); if (c) paintAt(+c.dataset.av); });
  document.addEventListener('pointerup', () => { if (!ed.down) return; ed.down = false; drawPrev(); const u = document.querySelector('[data-hero-do="undo"]'); if (u) u.disabled = !ed.undo.length; });
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-hero-c], [data-hero-tool], [data-hero-do], [data-hero-tpl], [data-hero-hold]'); if (!b || !C) return;
    if (b.dataset.heroHold) { const me = rec(); me.h = b.dataset.heroHold; me.at = Date.now(); C.save(); heroSync(); return C.render(); }
    if (b.dataset.heroC !== undefined) { ed.c = b.dataset.heroC; if (ed.tool === 'erase') ed.tool = 'pen'; return C.render(); }
    if (b.dataset.heroTool) { ed.tool = b.dataset.heroTool; return C.render(); }
    if (b.dataset.heroTpl) { const t = avCells(AV_TEMPLATES[b.dataset.heroTpl]); if (ed.cells.join() !== t.join() && !confirm(T('hero.tplConfirm'))) return; pushUndo(); ed.cells = t.slice(); return C.render(); }
    const d = b.dataset.heroDo;
    if (d === 'mirror') { ed.mirror = !ed.mirror; return C.render(); }
    if (d === 'undo') { if (ed.undo.length) ed.cells = ed.undo.pop(); return C.render(); }
    if (d === 'clear') { if (!confirm(T('hero.clearConfirm'))) return; pushUndo(); ed.cells = avCells(AV_EMPTY).slice(); return C.render(); }
    if (d === 'aiCopy') { copyText(aiPrompt(), () => C.toast && C.toast(T('hero.aiCopied'))); return; }
    if (d === 'aiLoad') { const ta = document.querySelector('[data-hero-ai="csv"]'); ed.csv = ta ? ta.value : ed.csv; aiLoad(ed.csv); return; }
    if (d === 'csvOut') { download('avatar.csv', avToCSV(ed.cells)); return; }
    if (d === 'csvCopy') { copyText(avToCSV(ed.cells), () => C.toast && C.toast(T('hero.csvCopied'))); return; }
    if (d === 'save') { const me = rec(); me.a = avEncode(ed.cells); me.at = Date.now(); C.save(); heroSync(); editLeave(); if (C.toast) C.toast(T('hero.saved')); location.hash = '#/hero'; return; }
    if (d === 'cancel') { editLeave(); return; }
    if (d === 'newsOk') { const me = rec(); me.seen = earnedIds(heroOf(C.S.progress)); C.save(); const n = document.querySelector('[data-hero-news]'); if (n) n.remove(); if (b.tagName !== 'A') e.preventDefault(); }
  });
}
