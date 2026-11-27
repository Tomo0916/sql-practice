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
export const PALETTE = ['', '#1b1b25', '#ffffff', '#ffe0bd', '#e8b48a', '#a0663f', '#e23b3b', '#f08a24', '#f6d23c', '#5cc25a', '#2f7a43', '#7fd3f5', '#3463d6', '#8a4fd1', '#7a4a26', '#9aa0a8'];
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
export const avOk = s => typeof s === 'string' && /^[0-9a-f]{256}$/.test(s);
/** the avatar as an SVG (runs of one colour become one rectangle) */
const svgCache = new Map();
export function avatarSVG(a, size = 32, label = '') {
  const s = avOk(a) ? a : AV_TEMPLATES.knight, key = s + '|' + size;
  let body = svgCache.get(s);
  if (!body) {
    const out = [];
    for (let y = 0; y < AV; y++) {
      let x = 0;
      while (x < AV) {
        const c = parseInt(s[y * AV + x], 16); let w = 1;
        while (x + w < AV && s[y * AV + x + w] === s[y * AV + x]) w++;
        if (c) out.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${PALETTE[c]}"/>`);
        x += w;
      }
    }
    body = out.join(''); svgCache.set(s, body);
  }
  void key;
  return `<svg class="av" viewBox="0 0 16 16" width="${size}" height="${size}" style="width:${size}px;height:${size}px" shape-rendering="crispEdges" role="img" aria-label="${label}">${body}</svg>`;
}
/** mirror the left half onto the right (for symmetrical drawing) */
export const avMirror = s => { const a = [...s]; for (let y = 0; y < AV; y++) for (let x = 0; x < AV / 2; x++) a[y * AV + AV - 1 - x] = a[y * AV + x]; return a.join(''); };
/** flood fill from (x, y) with colour c */
export function avFill(s, x, y, c) {
  const a = [...s], from = a[y * AV + x], to = c.toString(16);
  if (from === to) return s;
  const st = [[x, y]];
  while (st.length) {
    const [px, py] = st.pop();
    if (px < 0 || py < 0 || px >= AV || py >= AV || a[py * AV + px] !== from) continue;
    a[py * AV + px] = to; st.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
  }
  return a.join('');
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
  return [...RK_CHAPTERS.flatMap(ch => Array.from({ length: h.w[ch] }, (_, i) => `w:${ch}:${i + 1}`)), ...Array.from({ length: h.lv }, (_, i) => `lv:${i + 1}`), ...trophiesOf(h).map(id => 't:' + id)];
}
/** the part the class sees (members.hero): avatar, title, level, weapon grades (8 digits), trophies */
export function heroPublic(progress) {
  const me = progress.hero || {}, h = heroOf(progress), titles = titlesOf(h).map(x => x.id);
  return { a: avOk(me.a) ? me.a : AV_TEMPLATES.knight, t: titles.includes(me.t) ? me.t : 'novice', lv: h.lv, w: RK_CHAPTERS.map(ch => h.w[ch]).join(''), tr: trophiesOf(h).length };
}
export const heroPublicOk = x => !!x && typeof x === 'object' && avOk(x.a);
