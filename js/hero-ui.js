/* The adventure screens (冒険): #/hero (status), #/hero/edit (the pixel avatar), the party of the class,
 * and the "you got …!" message. Everything is worked out by hero.js from the progress. */
import { t, th, esc } from './i18n.js';
import { RK_CHAPTERS } from './rank.js';
import { LV_CHAPTERS } from './level.js';
import { AV, PALETTE, AV_TEMPLATES, AV_EMPTY, COLOR_NEED, avOk, avatarSVG, heroSVG, avFill, WEAPON_OF, SYNTAX_OF, weaponSVG, weaponNext, heroOf, TROPHIES, trophiesOf, titlesOf, titleKey, earnedIds, heroPublic, heroPublicOk } from './hero.js';

let C = null;   // { S, render, save, backend, toast }
export function installHero(ctx) { C = ctx; }
const L = () => C.S.settings.lang;
const T = (k, v) => t(k, L(), v);
const H = (k, v) => `<span class="tx">${th(k, L(), v && Object.fromEntries(Object.entries(v).map(([a, b]) => [a, esc(b)])))}</span>`;
const rec = () => (C.S.progress.hero = Object.assign({ a: '', t: 'novice', seen: null, at: 0 }, C.S.progress.hero));
const cssCol = i => (i === 23 ? 'linear-gradient(135deg,#ff4d4d,#ffd23c,#4dd67a,#4d8cff)' : PALETTE[i]);
const cIdx = ch => parseInt(ch, 36);
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
  return `<div class="hero-page"><header class="page-head"><h1>⚔️ ${H('hero.title')}</h1><p class="muted">${H('hero.lead')}</p></header>
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
const ed = { a: null, c: 1, tool: 'pen', mirror: false, undo: [], down: false };
export function editHTML() {
  if (ed.a === null) ed.a = rec().a && avOk(rec().a) ? rec().a : AV_TEMPLATES.knight;
  const cells = [...ed.a].map((v, i) => `<i data-av="${i}" style="${v !== '0' ? `background:${cssCol(cIdx(v))}` : ''}"></i>`).join('');
  const tool = (k, ic) => `<button type="button" class="btn btn-ghost btn-sm ${ed.tool === k ? 'on' : ''}" data-hero-tool="${k}" aria-pressed="${ed.tool === k}">${ic} ${H('hero.' + k)}</button>`;
  return `<div class="hero-page hero-edit"><header class="page-head"><h1>🎨 ${H('hero.draw')}</h1><p class="muted">${H('hero.editTip')}</p></header>
    <div class="hero-ed">
      <div class="rpg-win"><div class="av-grid ${ed.mirror ? 'mirror' : ''}" data-av-grid style="--n:${AV}">${cells}</div></div>
      <div class="hero-ed-side">
        <div class="rpg-win"><h2 class="rpg-h">${H('hero.palette')}</h2><div class="av-pal">${PALETTE.map((p, i) => { const lock = COLOR_NEED[i] > trophiesOf(heroOf(C.S.progress)).length;
            return `<button type="button" class="${ed.c === i ? 'on' : ''} ${i ? '' : 'clear'} ${lock ? 'lock' : ''} ${i >= 16 ? 'sp' : ''}" ${lock ? `disabled title="${esc(T('hero.colorLock', { n: COLOR_NEED[i] }))}"` : ''} data-hero-c="${i}" style="${p ? `background:${cssCol(i)}` : ''}" aria-label="${i ? (lock ? esc(T('hero.colorLock', { n: COLOR_NEED[i] })) : String(i)) : esc(T('hero.erase'))}" aria-pressed="${ed.c === i}">${lock ? '🔒' : ''}</button>`; }).join('')}</div>
          <div class="row-btns left">${tool('pen', '✏️')}${tool('fill', '🪣')}${tool('erase', '🧽')}</div>
          <div class="row-btns left"><button type="button" class="btn btn-ghost btn-sm ${ed.mirror ? 'on' : ''}" data-hero-do="mirror" aria-pressed="${ed.mirror}">↔️ ${H('hero.mirror')}</button><button type="button" class="btn btn-ghost btn-sm" data-hero-do="undo" ${ed.undo.length ? '' : 'disabled'}>↩️ ${H('hero.undo')}</button><button type="button" class="btn btn-ghost btn-sm" data-hero-do="clear">🗑 ${H('hero.clear')}</button></div></div>
        <div class="rpg-win"><h2 class="rpg-h">${H('hero.tpl')}</h2><div class="av-tpls">${Object.keys(AV_TEMPLATES).map(k => `<button type="button" data-hero-tpl="${k}">${avatarSVG(AV_TEMPLATES[k], 48)}<small>${H(`hero.tpl.${k}`)}</small></button>`).join('')}</div></div>
        <div class="rpg-win hero-prev"><h2 class="rpg-h">${H('hero.preview')}</h2><div data-av-prev>${avatarSVG(ed.a, 96)}${avatarSVG(ed.a, 32)}</div></div>
        <div class="row-btns left"><button type="button" class="btn btn-primary" data-hero-do="save">💾 ${H('hero.save')}</button><a class="btn btn-ghost" href="#/hero" data-hero-do="cancel">${H('hero.cancel')}</a></div>
      </div></div></div>`;
}
function paintAt(i) {
  const x = i % AV, y = Math.floor(i / AV), c = ed.tool === 'erase' ? 0 : ed.c;
  let a = ed.tool === 'fill' ? avFill(ed.a, x, y, c) : ed.a.slice(0, i) + c.toString(36) + ed.a.slice(i + 1);
  if (ed.mirror && ed.tool !== 'fill') { const j = y * AV + (AV - 1 - x); a = a.slice(0, j) + c.toString(36) + a.slice(j + 1); }
  if (ed.mirror && ed.tool === 'fill') a = avFill(a, AV - 1 - x, y, c);
  if (a === ed.a) return;
  ed.a = a; drawGrid();
}
function drawGrid() {
  const g = document.querySelector('[data-av-grid]'); if (!g) return;
  g.querySelectorAll('[data-av]').forEach((el, i) => { const v = cIdx(ed.a[i]); el.style.background = v ? cssCol(v) : ''; });
}
const drawPrev = () => { const p = document.querySelector('[data-av-prev]'); if (p) p.innerHTML = avatarSVG(ed.a, 96) + avatarSVG(ed.a, 32); };
const pushUndo = () => { ed.undo.push(ed.a); if (ed.undo.length > 40) ed.undo.shift(); };
export function editLeave() { ed.a = null; ed.undo = []; }

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
    if (k === 'c') return `<span class="hero-sw" style="background:${cssCol(+a)}"></span> ${H('hero.gotColor')}`;
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
    if (b.dataset.heroC !== undefined) { ed.c = +b.dataset.heroC; if (ed.tool === 'erase') ed.tool = 'pen'; if (ed.c === 0) ed.tool = 'erase'; return C.render(); }
    if (b.dataset.heroTool) { ed.tool = b.dataset.heroTool; return C.render(); }
    if (b.dataset.heroTpl) { if (ed.a !== AV_TEMPLATES[b.dataset.heroTpl] && !confirm(T('hero.tplConfirm'))) return; pushUndo(); ed.a = AV_TEMPLATES[b.dataset.heroTpl]; return C.render(); }
    const d = b.dataset.heroDo;
    if (d === 'mirror') { ed.mirror = !ed.mirror; return C.render(); }
    if (d === 'undo') { if (ed.undo.length) ed.a = ed.undo.pop(); return C.render(); }
    if (d === 'clear') { if (!confirm(T('hero.clearConfirm'))) return; pushUndo(); ed.a = AV_EMPTY; return C.render(); }
    if (d === 'save') { const me = rec(); me.a = ed.a; me.at = Date.now(); C.save(); heroSync(); editLeave(); if (C.toast) C.toast(T('hero.saved')); location.hash = '#/hero'; return; }
    if (d === 'cancel') { editLeave(); return; }
    if (d === 'newsOk') { const me = rec(); me.seen = earnedIds(heroOf(C.S.progress)); C.save(); const n = document.querySelector('[data-hero-news]'); if (n) n.remove(); if (b.tagName !== 'A') e.preventDefault(); }
  });
}
