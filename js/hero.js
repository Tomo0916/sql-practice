/* =========================================================
 * hero.js — the adventure (冒険): a pixel avatar, a level, weapons, trophies and titles.
 * Nothing here is earned by playing more: everything comes from what the student can do.
 *   Lv (0–6)      the level test (レベルテスト): one level for each chapter passed
 *   weapons       the rank tests: one weapon for each of the 8 subjects; its grade
 *                   1 = 初級 rank C or better, 2 = 中級 C+, 3 = 上級 C+, 4 (legend) = 上級 S or better
 *   quests        the HackerRank and paiza practice; the HackerRank mock test is the boss
 *   trophies      milestones of the above; titles are chosen by the student from the ones earned
 * Looks only: nothing changes how a problem is checked.
 * Pure functions (check.mjs tests them); the screens are in hero-ui.js.
 * ========================================================= */
import { RK_CHAPTERS, RK_TIERS, rankKey, rankOf, RK_RANKS } from './rank.js';
import { HR_PROBLEMS, HR_AREAS } from './hr.js';
import { PZ_LEVELS, pzCleared, pzReached } from './pz.js';

/* ---------- the avatar: 16 × 16 dots, a palette of 16 (0 = no colour), saved as 256 hex digits ---------- */
export const AV = 16;
export const PALETTE = ['', '#1b1b25', '#ffffff', '#ffe0bd', '#e8b48a', '#a0663f', '#e23b3b', '#f08a24', '#f6d23c', '#5cc25a', '#2f7a43', '#7fd3f5', '#3463d6', '#8a4fd1', '#7a4a26', '#9aa0a8',
  // special colours (g–n), unlocked by trophies: gold, silver, pink, mint, night, lava, crystal, rainbow
  '#ffc61a', '#dfe5ee', '#ff7eb6', '#6ff0c6', '#232a63', '#ff4d1a', '#b9f3ff', 'url(#av-rb)'];
export const COLOR_NEED = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 5, 7, 9, 11, 13, 15];   // trophies needed
const LETTER = { '.': 0, k: 1, w: 2, s: 3, t: 4, d: 5, r: 6, o: 7, y: 8, g: 9, G: 10, c: 11, b: 12, p: 13, n: 14, a: 15 };
const grid = rows => rows.map(r => [...r].map(ch => (LETTER[ch] || 0).toString(16)).join('')).join('');
/** starting points (all original) */
export const AV_TEMPLATES = {
  knight: grid([
    '................', '.....kkkkkk.....', '....knnnnnnk....', '...knnnnnnnnk...', '...knssssssnk...', '...ksksssskskk..',
    '...kssssssssk...', '....ksssrssk....', '.....kssssk.....', '...kkbbbbbbkk...', '..kabbyybbbbak..', '..ksbbbbbbbbsk..',
    '..ksbbbbbbbbsk..', '...knnnnnnnnk...', '....kbbk.kbbk...', '....kkkk.kkkk...']),
  mage: grid([
    '.......kk.......', '......kppk......', '.....kpppk......', '....kppppppk....', '...kppppppppk...', '..kkkkkkkkkkkk..',
    '....kssssssk....', '....ksksssksk...', '....kssssssk....', '.....kswwsk.....', '....kpwwwwpk....', '...kpppwwpppk...',
    '..kspppppppppsk.', '...kppppppppk...', '...kppppppppk...', '....kkkkkkkk....']),
  fighter: grid([
    '................', '.....kkkkkk.....', '....kkkkkkkk....', '...kkkkkkkkkk...', '...krrrrrrrrk...', '...ksksssskskk..',
    '...kssssssssk...', '....kssttssk....', '.....kssssk.....', '...kkooooookk...', '..ksooookooosk..', '..ksoooooooosk..',
    '...kookkkkook...', '...koooooooook..', '....kssk.kssk...', '....kkkk.kkkk...']),
  ranger: grid([
    '................', '.....kGGGGk.....', '....kGggggGk....', '...kGggggggGk...', '...kGsssssgGk...', '...kGkssskgGk...',
    '...kGssssssGk...', '....kssttssk....', '...kGGssssGGk...', '..kGggggggggGk..', '..ksggnnggggsk..', '..ksgggggggggk..',
    '...knnnnnnnnk...', '...kggggggggk...', '....knnk.knnk...', '....kkkk.kkkk...'])
};
export const AV_EMPTY = '0'.repeat(AV * AV);
/* A drawing is 256 cells (left to right, top to bottom). A cell is '' (no colour), 'rrggbb' (any colour)
 * or a letter g–n (a special colour, unlocked by trophies: it shines). Saved as text:
 *   new:    "2:" + the colours, comma-separated + ":" + 256 characters (0 = none, 1… = the n-th colour)
 *   older:  256 base-36 digits 0–n (the first 24-colour palette) — still read. */
export const SPECIAL = {   // letter: [name in CSV, light, middle, dark]
  g: ['gold', '#fff3b0', '#ffc61a', '#a87200'], h: ['silver', '#ffffff', '#c9d1dc', '#7d8796'], i: ['pink', '#ffd6ea', '#ff7eb6', '#c2336f'],
  j: ['mint', '#d9fff2', '#6ff0c6', '#1fa37a'], k: ['night', '#5b66d1', '#232a63', '#090c2a'], l: ['lava', '#ffe066', '#ff4d1a', '#7a1200'],
  m: ['crystal', '#ffffff', '#b9f3ff', '#4fa6d9'], n: ['rainbow']
};
export const SPECIAL_NEED = { g: 1, h: 3, i: 5, j: 7, k: 9, l: 11, m: 13, n: 15 };   // trophies needed (= COLOR_NEED)
const RB_STOPS = ['#ff4d4d', '#ffd23c', '#4dd67a', '#4d8cff', '#b45cff'];
/** CSS for a cell (editor, swatches) */
export function avCss(c) {
  if (!c) return '';
  if (c === 'n') return `linear-gradient(135deg,${RB_STOPS.join(',')})`;
  if (SPECIAL[c]) { const [, l, m, d] = SPECIAL[c]; return `linear-gradient(135deg,${m} 0%,${l} 35%,${m} 55%,${d} 100%)`; }
  return '#' + c;
}
const specialDefs = used => used.map(c => c === 'n'
  ? `<linearGradient id="av-n" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="16" y2="16">${RB_STOPS.map((x, i) => `<stop offset="${i / (RB_STOPS.length - 1)}" stop-color="${x}"/>`).join('')}</linearGradient>`
  : (([, l, m, d]) => `<linearGradient id="av-${c}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="8" y2="8" spreadMethod="reflect"><stop offset="0" stop-color="${d}"/><stop offset=".45" stop-color="${m}"/><stop offset=".6" stop-color="${l}"/><stop offset=".75" stop-color="${m}"/><stop offset="1" stop-color="${d}"/></linearGradient>`)(SPECIAL[c])).join('');
const ALPH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_';
export const AV_MAX_COLORS = 63;
const V2 = /^2:([0-9a-n,]*):([0-9a-zA-Z_-]{256})$/;
const cellsCache = new Map();
/** the 256 cells of a saved drawing, or null if it is not one */
export function avCells(s) {
  if (typeof s !== 'string') return null;
  if (cellsCache.has(s)) return cellsCache.get(s);
  let out = null;
  if (/^[0-9a-n]{256}$/.test(s)) out = [...s].map(ch => { const i = parseInt(ch, 36); return i === 0 ? '' : i >= 16 ? ch : PALETTE[i].slice(1); });
  else {
    const m = V2.exec(s);
    if (m) {
      const cols = m[1] ? m[1].split(',') : [];
      if (cols.length <= AV_MAX_COLORS && cols.every(c => /^[0-9a-f]{6}$/.test(c) || (c.length === 1 && SPECIAL[c]))) {
        const cs = [...m[2]].map(ch => { const i = ALPH.indexOf(ch); return i === 0 ? '' : cols[i - 1]; });
        if (!cs.includes(undefined)) out = cs;
      }
    }
  }
  if (cellsCache.size > 400) cellsCache.clear();
  cellsCache.set(s, out);
  return out;
}
export const avOk = s => !!avCells(s);
const rgbOf = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
const dist = (a, b) => { const x = rgbOf(a), y = rgbOf(b); return (x[0] - y[0]) ** 2 * 2 + (x[1] - y[1]) ** 2 * 4 + (x[2] - y[2]) ** 2 * 3; };
/** at most max colours: the two closest colours are joined (the rarer one becomes the commoner one) until it fits */
export function avReduce(cells, max = AV_MAX_COLORS) {
  let cs = cells.slice();
  const from = new Set(cs.filter(Boolean)).size;
  for (;;) {
    const count = new Map(); cs.forEach(c => { if (c) count.set(c, (count.get(c) || 0) + 1); });
    if (count.size <= max) break;
    const hex = [...count.keys()].filter(c => c.length === 6);
    let best = null;
    for (let i = 0; i < hex.length; i++) for (let j = i + 1; j < hex.length; j++) { const d = dist(hex[i], hex[j]); if (!best || d < best[0]) best = [d, hex[i], hex[j]]; }
    if (!best) break;
    const [, a, b] = best, keep = count.get(a) >= count.get(b) ? a : b, drop = keep === a ? b : a;
    cs = cs.map(c => (c === drop ? keep : c));
  }
  return { cells: cs, from, to: new Set(cs.filter(Boolean)).size };
}
/** the cells → the saved text */
export function avEncode(cells) {
  const cs = avReduce(cells).cells, cols = [...new Set(cs.filter(Boolean))];
  return `2:${cols.join(',')}:${cs.map(c => (c ? ALPH[cols.indexOf(c) + 1] : '0')).join('')}`;
}
/** the avatar as an SVG (runs of one colour become one rectangle) */
const svgCache = new Map();
export function avatarSVG(a, size = 32, label = '') {
  const cs = avCells(a) || avCells(AV_TEMPLATES.knight), key = Array.isArray(a) ? cs.join(',') : String(a);
  let body = svgCache.get(key);
  if (!body) {
    const out = [], used = new Set();
    for (let y = 0; y < AV; y++) {
      let x = 0;
      while (x < AV) {
        const c = cs[y * AV + x]; let w = 1;
        while (x + w < AV && cs[y * AV + x + w] === c) w++;
        if (c) { if (SPECIAL[c]) used.add(c); out.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${SPECIAL[c] ? `url(#av-${c})` : '#' + c}"/>`); }
        x += w;
      }
    }
    body = (used.size ? `<defs>${specialDefs([...used])}</defs>` : '') + out.join('');
    if (svgCache.size > 400) svgCache.clear();
    svgCache.set(key, body);
  }
  return `<svg class="av" viewBox="0 0 16 16" width="${size}" height="${size}" style="width:${size}px;height:${size}px" shape-rendering="crispEdges" role="img" aria-label="${label}">${body}</svg>`;
}
/** flood fill from (x, y) with colour c (cells in, cells out) */
export function avFill(cells, x, y, c) {
  const a = cells.slice(), from = a[y * AV + x];
  if (from === c) return a;
  const st = [[x, y]];
  while (st.length) {
    const [px, py] = st.pop();
    if (px < 0 || py < 0 || px >= AV || py >= AV || a[py * AV + px] !== from) continue;
    a[py * AV + px] = c; st.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
  }
  return a;
}

/* ---------- CSV: 16 lines × 16 values (#RRGGBB, - = no colour, or a special colour's name) ---------- */
const NAME_TO = Object.fromEntries(Object.entries(SPECIAL).map(([k, v]) => [v[0], k]));
export const specialName = c => SPECIAL[c][0];
export function avToCSV(cells) {
  const cs = avCells(cells) || cells;
  return Array.from({ length: AV }, (_, y) => cs.slice(y * AV, y * AV + AV).map(c => (!c ? '-' : SPECIAL[c] ? SPECIAL[c][0] : '#' + c.toUpperCase())).join(',')).join('\n');
}
const EMPTY_WORDS = new Set(['', '-', '--', '.', '_', 'transparent', 'none', 'null', 'empty', 'clear', 'nan']);
/** one value → '' | 'rrggbb' | a special letter | undefined (not a colour) */
function cellOf(v) {
  const t = v.trim().replace(/^["'`]+|["'`]+$/g, '').trim().toLowerCase();
  if (EMPTY_WORDS.has(t)) return '';
  let m = /^(?:#|0x)?([0-9a-f]{6})([0-9a-f]{2})?$/.exec(t);
  if (m) return m[2] === '00' ? '' : m[1];
  m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(t);
  if (m) return m[1] + m[1] + m[2] + m[2] + m[3] + m[3];
  if (NAME_TO[t]) return NAME_TO[t];
  return undefined;
}
/** what the AI wrote → { cells, colored, rows, cols, bad, lock, colors } or null (nothing that looks like the grid).
 *  open(letter) = may this special colour be used; a locked one becomes its middle colour. */
export function avFromCSV(text, open = () => true) {
  const src = String(text || '').normalize('NFKC').replace(/```[a-z]*/gi, '\n');
  const rows = [];
  for (let line of src.split(/\r?\n/)) {
    line = line.trim().replace(/^\|+|\|+$/g, '');
    if (!line) continue;
    let parts = line.split(/[,\t;|]/);
    if (parts.length === 1) parts = line.split(/\s+/);
    if (parts.length < 4) continue;
    let vals = parts.map(cellOf);
    if (vals.length > AV && vals[0] === undefined) vals = vals.slice(1);   // a row number in front
    const ok = vals.filter(v => v !== undefined).length, real = vals.filter(v => v).length;
    if (ok / vals.length < 0.6 || (!real && !parts.some(p => /^\s*-\s*$/.test(p)))) continue;
    rows.push(vals);
  }
  if (!rows.length) return null;
  const res = { rows: rows.length, cols: 0, bad: 0, lock: 0 };
  const cells = [];
  for (let y = 0; y < AV; y++) {
    const r = rows[y] || [];
    if (y < rows.length && r.length !== AV) res.cols++;
    for (let x = 0; x < AV; x++) {
      let v = r[x];
      if (v === undefined) { if (x < r.length) res.bad++; v = ''; }
      if (v && SPECIAL[v] && !open(v)) { res.lock++; v = v === 'n' ? 'ff4d4d' : SPECIAL[v][2].slice(1); }
      cells.push(v);
    }
  }
  const red = avReduce(cells);
  return Object.assign(res, { cells: red.cells, colored: red.cells.filter(Boolean).length, colors: red.from > red.to ? red.to : 0 });
}

/* ---------- weapons: one for each rank-test subject ---------- */
export const WEAPON_OF = { basics: 'sword', filter: 'shield', sort: 'bow', change: 'hammer', agg: 'axe', func: 'staff', sub: 'boomerang', join: 'whip' };
export const SYNTAX_OF = { basics: 'SELECT', filter: 'WHERE', sort: 'ORDER BY', change: 'UPDATE', agg: 'GROUP BY', func: 'CASE', sub: 'WITH', join: 'JOIN' };
export const GRADE_COLOR = ['#c9ccd1', '#b9824a', '#9fa9b5', '#5ab0e6', '#f2c230'];   // none, wood, iron, steel, legend
const C_RANK = RK_RANKS.indexOf('C'), S_RANK = RK_RANKS.indexOf('S');
/** the grade (0–4) of a subject's weapon, from S.progress.rank */
export function weaponGrade(rank, ch) {
  const best = t => { const r = (rank || {})[rankKey(ch, t)]; return r && r.hist && r.hist.length ? RK_RANKS.indexOf(rankOf(r.best || 0)) : -1; };
  const [b, i, a] = RK_TIERS.map(best);
  if (a >= S_RANK) return 4;
  if (a >= C_RANK) return 3;
  if (i >= C_RANK) return 2;
  if (b >= C_RANK) return 1;
  return 0;
}
export const weapons = rank => Object.fromEntries(RK_CHAPTERS.map(ch => [ch, weaponGrade(rank, ch)]));
/** what the next grade needs: { tier, rank } or null at the top */
export function weaponNext(g) { return [{ tier: 'beginner', rank: 'C' }, { tier: 'intermediate', rank: 'C' }, { tier: 'advanced', rank: 'C' }, { tier: 'advanced', rank: 'S' }][g] || null; }

/* the weapons' pictures: 12 × 12, M = the blade (grade colour), H = handle, D = outline, G = gem */
const ICON = {
  sword: ['..........DD', '.........DMD', '........DMD.', '.......DMD..', '......DMD...', '.....DMD....', '..D.DMD.....', '...DMD......', '...GD.......', '..HDGD......', '.HH..D......', 'HH..........'],
  shield: ['..DDDDDDDD..', '.DMMMMMMMMD.', '.DMMMGGMMMD.', '.DMMGGGGMMD.', '.DMMMGGMMMD.', '.DMMMMMMMMD.', '.DMMMMMMMMD.', '..DMMMMMMD..', '..DMMMMMMD..', '...DMMMMD...', '....DMMD....', '.....DD.....'],
  bow: ['....DD......', '...DMH......', '..DM.H......', '..DM..H.....', '.DM...H.....', '.DM....DDDDG', '.DM....DDDDG', '.DM...H.....', '..DM..H.....', '..DM.H......', '...DMH......', '....DD......'],
  hammer: ['.DDDDDDDD...', '.DMMMMMMD...', '.DMMMMMMD...', '.DMMMMMMD...', '.DDDDHDDD...', '.....H......', '.....H......', '.....H......', '.....H......', '.....H......', '....GHG.....', '.....D......'],
  axe: ['....DDD.....', '...DMMMD....', '..DMMMMMD...', '..DMMMMMDH..', '..DMMMMMDH..', '...DMMMDH...', '....DDDH....', '.......H....', '......H.....', '.....H......', '....H.......', '...G........'],
  staff: ['....DGGD....', '...DGMMGD...', '...DGMMGD...', '....DGGD....', '.....HH.....', '.....HH.....', '.....HH.....', '.....HH.....', '.....HH.....', '.....HH.....', '.....HH.....', '.....DD.....'],
  boomerang: ['DDDD........', 'DMMMD.......', 'DMMMMD......', '.DMMMMD.....', '..DMMMMD....', '...DMMMMDDDD', '....DMMMMMMD', '.....DMMMMMD', '......DGGMMD', '.......DDDD.', '............', '............'],
  whip: ['HHH.........', 'HGH.........', 'HHH.........', '..DM........', '...MM.......', '....M...MM..', '....M..M..M.', '.....MM...M.', '..........M.', '.........M..', '.......MM...', '......M.....']
};
export function weaponSVG(kind, grade, size = 36) {
  const m = ICON[kind] || ICON.sword, col = { M: GRADE_COLOR[grade], H: grade ? '#7a4a26' : '#c9ccd1', D: grade ? '#1b1b25' : '#c9ccd1', G: grade >= 4 ? '#e23b3b' : grade ? '#f6d23c' : '#c9ccd1' }, out = [];
  m.forEach((row, y) => [...row].forEach((ch, x) => { if (col[ch]) out.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${col[ch]}"/>`); }));
  return `<svg class="wp g${grade}" viewBox="0 0 12 12" width="${size}" height="${size}" style="width:${size}px;height:${size}px" shape-rendering="crispEdges" aria-hidden="true">${out.join('')}</svg>`;
}

/* ---------- quests (HackerRank, paiza) ---------- */
const HR_PRACTICE = HR_PROBLEMS.filter(p => !p.mock && !p.ex);
export function quests(progress) {
  const hr = progress.hr || {}, ok = new Set(hr.ok || []), pz = (progress.pz || {}).ok || [];
  const areas = Object.fromEntries(HR_AREAS.map(a => { const ps = HR_PRACTICE.filter(p => p.area === a); return [a, { n: ps.filter(p => ok.has(p.id)).length, m: ps.length }]; }));
  const mocks = hr.mock || [];
  return { areas, hrN: HR_PRACTICE.filter(p => ok.has(p.id)).length, hrM: HR_PRACTICE.length, mockBest: mocks.length ? Math.max(...mocks.map(m => m.pts || 0)) : null, mockN: mocks.length,
    pzLv: pzReached(pz), pzCleared: PZ_LEVELS.filter(lv => pzCleared(pz, lv)), pzN: pz.length };
}

/* ---------- the whole hero, worked out from the progress ---------- */
export function heroOf(progress) {
  const w = weapons(progress.rank), lv = (progress.level && Number.isInteger(progress.level.lv)) ? progress.level.lv : 0, q = quests(progress);
  return { lv, w, q };
}
const gs = h => Object.values(h.w);
/** trophies: [id, tier (1 bronze, 2 silver, 3 gold), earned?] */
export const TROPHIES = [
  ['firstQuest', 1, h => h.q.hrN + h.q.pzN > 0],
  ['hr_sel', 2, h => h.q.areas.sel.n >= h.q.areas.sel.m],
  ['hr_rel', 2, h => h.q.areas.rel.n >= h.q.areas.rel.m],
  ['hr_agg', 2, h => h.q.areas.agg.n >= h.q.areas.agg.m],
  ['boss', 2, h => h.q.mockBest !== null && h.q.mockBest >= 2],
  ['bossPerfect', 3, h => h.q.mockBest === 4],
  ...PZ_LEVELS.map(lv => [`pz${lv}`, lv <= 2 ? 1 : lv <= 4 ? 2 : 3, h => h.q.pzCleared.includes(lv)]),
  ['firstWeapon', 1, h => gs(h).some(g => g >= 1)],
  ['allWeapons', 2, h => gs(h).every(g => g >= 1)],
  ['firstLegend', 3, h => gs(h).some(g => g >= 4)],
  ['allLegend', 3, h => gs(h).every(g => g >= 4)],
  ['lv3', 1, h => h.lv >= 3],
  ['lvMax', 3, h => h.lv >= 6]
];
export const trophiesOf = h => TROPHIES.filter(([, , ok]) => ok(h)).map(([id]) => id);
/** titles the student can choose: { id, key, vars } — 'novice' always */
export function titlesOf(h) {
  const out = [{ id: 'novice', key: 'hero.t.novice' }];
  if (h.lv >= 3) out.push({ id: 'lv3', key: 'hero.t.lv3' });
  if (h.lv >= 6) out.push({ id: 'lv6', key: 'hero.t.lv6' });
  RK_CHAPTERS.forEach(ch => { const g = h.w[ch];
    if (g >= 3) out.push({ id: 'use_' + ch, key: 'hero.t.user', vars: { x: SYNTAX_OF[ch] } });
    if (g >= 4) out.push({ id: 'mas_' + ch, key: 'hero.t.master', vars: { x: SYNTAX_OF[ch] } }); });
  if (gs(h).every(g => g >= 1)) out.push({ id: 'collector', key: 'hero.t.collector' });
  if (gs(h).every(g => g >= 4)) out.push({ id: 'sage', key: 'hero.t.sage' });
  if (h.q.hrN >= h.q.hrM) out.push({ id: 'hrHunter', key: 'hero.t.hrHunter' });
  if (h.q.mockBest === 4) out.push({ id: 'bossSlayer', key: 'hero.t.bossSlayer' });
  if (h.q.pzLv >= 5) out.push({ id: 'pzKing', key: 'hero.t.pzKing' });
  return out;
}
/** a title id → { key, vars } (for showing someone else's title) */
export function titleKey(id) {
  const m = /^(use|mas)_([a-z]+)$/.exec(id || '');
  if (m && SYNTAX_OF[m[2]]) return { key: m[1] === 'use' ? 'hero.t.user' : 'hero.t.master', vars: { x: SYNTAX_OF[m[2]] } };
  return { key: 'hero.t.' + (['novice', 'lv3', 'lv6', 'collector', 'sage', 'hrHunter', 'bossSlayer', 'pzKing'].includes(id) ? id : 'novice') };
}
/** what the student has earned, as ids: for the "you got …!" messages */
export function earnedIds(h) {
  const tr = trophiesOf(h).length;
  return [...COLOR_NEED.map((n, i) => (n && tr >= n ? `c:${i}` : null)).filter(Boolean), ...RK_CHAPTERS.flatMap(ch => Array.from({ length: h.w[ch] }, (_, i) => `w:${ch}:${i + 1}`)), ...Array.from({ length: h.lv }, (_, i) => `lv:${i + 1}`), ...trophiesOf(h).map(id => 't:' + id)];
}
/** the part the class sees (members.hero): avatar, title, level, weapon grades (8 digits), trophies */
export function heroPublic(progress) {
  const me = progress.hero || {}, h = heroOf(progress), titles = titlesOf(h).map(x => x.id);
  return { a: avOk(me.a) ? me.a : AV_TEMPLATES.knight, t: titles.includes(me.t) ? me.t : 'novice', lv: h.lv, w: RK_CHAPTERS.map(ch => h.w[ch]).join(''), tr: trophiesOf(h).length, h: heldOf(h.w, me.h) };
}
export const heroPublicOk = x => !!x && typeof x === 'object' && avOk(x.a);

/* ---------- how strong the hero looks: the 16 × 16 drawing stays the student's own; around it (24 × 24)
 *   the weapon in hand (the chosen one, else the strongest), a frame and a stand by Lv,
 *   sparkles for legendary weapons, something on the head for some titles ---------- */
/** the chapter whose weapon is held: the chosen one if earned, else the strongest (the first of the best) */
export function heldOf(w, want) {
  if (want && w[want] > 0) return want;
  let best = null; RK_CHAPTERS.forEach(ch => { if (w[ch] > 0 && (!best || w[ch] > w[best])) best = ch; });
  return best;
}
const LV_FRAME = [null, null, null, '#c07a3e', '#c07a3e', '#c9d1dc', '#ffc61a'];   // bronze from Lv3, silver Lv5, gold Lv6
const HEAD = {   // 8 × 4, drawn above the drawing
  crown: ['.y.y.y.y', '.yyyyyy.', '.yryyry.', '.yyyyyy.'],
  sagecrown: ['...p....', '.y.p.y..', '.yyyyy..', '.ypyyp..'],
  helm: ['..aaaa..', '.awwwwa.', 'a.aaaa.a', '........'],
  band: ['........', '........', 'rrrrrrrr', '.......r']
};
const HEAD_COL = { y: '#ffc61a', r: '#e23b3b', p: '#8a4fd1', a: '#9aa0a8', w: '#ffffff' };
const headOf = t => (t === 'lv6' || t === 'pzKing') ? 'crown' : t === 'sage' ? 'sagecrown' : t === 'bossSlayer' ? 'helm' : (/^(use|mas)_/.test(t || '') || t === 'hrHunter') ? 'band' : null;
/** the whole hero as an SVG: pub = heroPublic(…) or a classmate's members.hero */
export function heroSVG(pub, size = 96, label = '', still = false) {
  const x = pub || {}, lv = +x.lv || 0, grades = String(x.w || '').split('').map(Number), legend = grades.filter(g => g >= 4).length, out = [];
  // sparkles (legendary weapons): more weapons, more sparkles
  if (legend) {
    const spots = [[1, 3], [21, 2], [2, 13], [22, 11], [5, 1], [19, 19], [1, 20], [12, 0], [22, 17], [3, 8], [20, 6], [8, 22], [16, 22], [0, 16], [23, 5], [10, 1]];
    spots.slice(0, Math.min(spots.length, legend * 2)).forEach(([sx, sy], i) => out.push(`<rect class="${still ? '' : 'av-sp'}" style="animation-delay:${(i * 0.37) % 2}s" x="${sx}" y="${sy}" width="1" height="1" fill="${i % 3 ? '#ffe680' : '#ffffff'}"/>`));
  }
  // the stand (Lv), under the feet
  if (lv >= 1) out.push(`<rect x="6" y="20" width="12" height="1" fill="${lv >= 6 ? '#ffc61a' : 'rgba(0,0,0,.28)'}"/>`, lv >= 6 ? '<rect x="7" y="21" width="10" height="1" fill="#c48a00"/>' : '');
  // the frame (Lv)
  const fc = LV_FRAME[Math.min(lv, 6)];
  if (fc) { out.push(`<rect x=".5" y=".5" width="23" height="23" fill="none" stroke="${fc}" stroke-width="1"/>`); if (lv >= 6) [[0, 0], [23, 0], [0, 23], [23, 23]].forEach(([cx, cy]) => out.push(`<rect x="${cx}" y="${cy}" width="1" height="1" fill="#e23b3b"/>`)); }
  // the drawing
  out.push(`<svg x="4" y="4" width="16" height="16" viewBox="0 0 16 16">${avatarSVG(x.a, 16).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`);
  // the weapon in hand
  const held = x.h && WEAPON_OF[x.h] ? x.h : null, gi = held ? RK_CHAPTERS.indexOf(held) : -1;
  if (held && grades[gi] > 0) out.push(`<svg x="15" y="9" width="9" height="9" viewBox="0 0 12 12">${weaponSVG(WEAPON_OF[held], grades[gi], 9).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`);
  // on the head (title)
  const hd = HEAD[headOf(x.t)];
  if (hd) hd.forEach((row, y) => [...row].forEach((ch, xx) => { if (HEAD_COL[ch]) out.push(`<rect x="${8 + xx}" y="${y + 1}" width="1" height="1" fill="${HEAD_COL[ch]}"/>`); }));
  return `<svg class="hero-svg" viewBox="0 0 24 24" width="${size}" height="${size}" style="width:${size}px;height:${size}px" shape-rendering="crispEdges" role="img" aria-label="${label}">${out.join('')}</svg>`;
}
