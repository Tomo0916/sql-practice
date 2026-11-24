/* =========================================================
 * rank-ui.js — the screens of the rank tests (ランクテスト): the list (#/rank),
 * a test (#/rank/<subject>/<tier>) and its result. The rules and scores are in rank.js.
 * student.js gives this module its state and a few helpers with installRank().
 * ========================================================= */
import { RK_N, RK_SEC, RK_TIERS, RK_CHAPTERS, RK_RANKS, RK_FROM, rankKey, rankParse, rankOf, rankToNext, rankProblems, rankScore, rankRow, rankBetter } from './rank.js';
import { htmlLang, t, th, esc } from './i18n.js';
import { I, highlightSQL, lessonTitleHTML, problemHTML } from './ui.js';
import { LESSON_BY_KEY, randomCode } from './engine.js';
import * as backend from './backend.js';

/** from student.js: { S, render, save, chName, workspaceHTML, asgHit } */
let C = null;
export function installRank(ctx) { C = ctx; }
const L = () => C.S.settings.lang;
const T = (k, v) => t(k, L(), v);
const H = (k, v) => `<span class="tx">${th(k, L(), v && Object.fromEntries(Object.entries(v).map(([a, b]) => [a, esc(b)])))}</span>`;
export const rkTicking = () => !!rkTick;

/* ---------- the class ranking for students (Supabase rank_board): on the result page ---------- */
const boards = {};   // test → { rows } | { loading: true }
function loadBoard(test) {
  if (!C.S.klass || !backend.enabled) return;
  boards[test] = { loading: true };
  backend.rankBoard(C.S.klass.id, test).then(rows => { boards[test] = { rows }; }, () => { boards[test] = { rows: null }; })
    .then(() => { if (C.S.session && C.S.session.test === test && C.S.session.phase === 'done') C.render(); });
}
function boardHTML(test) {
  const b = boards[test];
  if (!C.S.klass || !b || b.rows === null) return '';   // not in a class, or the database has no rank_board yet
  if (b.loading) return `<section class="card rk-cboard"><h3>${H('rk.board')}</h3><p class="muted small">${H('rk.loading')}</p></section>`;
  const rows = b.rows, place = []; rows.forEach((r, i) => { place[i] = i && rows[i - 1].score === r.score && !!rows[i - 1].passed === !!r.passed ? place[i - 1] : i + 1; });
  const mi = rows.findIndex(r => r.me), show = rows.map((r, i) => i).filter(i => i < 10 || i === mi);
  return `<section class="card rk-cboard"><h3>${H('rk.board')}</h3><p class="muted small">${H('rk.boardSub')}</p>
    ${mi >= 0 ? `<p class="rk-myplace">${H('rk.myPlace', { n: place[mi], m: rows.length })}</p>` : ''}
    ${rows.length ? `<table class="wtable rk-board"><tbody>${show.map(i => { const r = rows[i];
      return `${i === mi && mi >= 10 ? '<tr><td colspan="4" class="muted">⋯</td></tr>' : ''}<tr class="${r.me ? 'me' : ''}"><td class="n">${place[i]}</td><td>${esc(r.nickname)}${r.me ? ` <span class="tag">${H('rk.you')}</span>` : ''}</td><td>${rkBadge(r.rank, r.passed)}</td><td class="n"><b>${r.score}</b></td></tr>`; }).join('')}</tbody></table>`
      : `<p class="muted small">${H('rk.boardNone')}</p>`}</section>`;
}

/* ---------- rank tests (#/rank, #/rank/<subject>/<tier>): how many ordering problems within a time limit, like e-typing's level check ---------- */
/** records of the first version (one test per tier, a different score) are dropped */
const rkClean = () => { const r = C.S.progress.rank, old = Object.keys(r || {}).filter(k => !rankParse(k)); if (old.length) { old.forEach(k => delete r[k]); C.save(); } };
/** a rank badge; passes add "(with passes)": the rank is not complete */
const rkBadge = (rank, passed, size = 'sm') => `<span class="rk-badge ${size} r-${rank}">${rank}</span>${passed ? `<span class="rk-withpass">${H('rk.withPass')}</span>` : ''}`;
const rkRec = t => ((C.S.progress.rank = C.S.progress.rank || {})[t] = C.S.progress.rank[t] || { best: 0, hist: [] });
let rkTick = null;
export function rkStopTick() { clearInterval(rkTick); rkTick = null; }
const rkMs = ses => Math.min((ses.tEnd || Date.now()) - ses.t0, ses.limit);
const rkLeft = ses => Math.max(0, ses.limit - ((ses.tEnd || Date.now()) - ses.t0));
const rkMin = tier => RK_SEC[tier] / 60;
const fmtMs = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
/** the counts so far: solved · misses · passed */
const rkCountsHTML = ses => { const ok = ses.items.filter(p => ses.done[p.id]).length, ms = Object.values(ses.miss).reduce((x, n) => x + n, 0), ps = ses.items.filter(p => ses.pass[p.id]).length;
  return `<div class="rk-counts"><span class="ok">○ ${H('rk.solved')} <b>${ok}</b></span><span class="ms">× ${H('rk.misses')} <b>${ms}</b></span><span>– ${H('rk.passed')} <b>${ps}</b></span></div>`; };
export function rkStart(test) {
  rkStopTick();
  const { ch, tier } = rankParse(test);
  const seed = randomCode(5), seen = new Set();
  C.S.session = { kind: 'rank', test, ch, tier, seed, seen, limit: RK_SEC[tier] * 1000, phase: 'count', n: 3, items: rankProblems(C.S.engine, ch, tier, seed, RK_N, 0, seen), made: 0, i: 0, done: {}, miss: {}, pass: {}, dur: {}, t0: 0, tShow: 0, tEnd: 0 };
  C.S.session.made = C.S.session.items.length ? C.S.session.items[C.S.session.items.length - 1].rn + 1 : 0;
  C.render(); window.scrollTo(0, 0);
  const ses = C.S.session;
  const tc = Date.now();
  rkTick = setInterval(() => {
    if (C.S.session !== ses) return rkStopTick();
    if (ses.phase === 'count') {
      const n = 3 - Math.floor((Date.now() - tc) / 800);
      if (n > 0) { if (n !== ses.n) { ses.n = n; const c = document.getElementById('rk-count'); if (c) c.textContent = n; } return; }
      ses.phase = 'run'; ses.t0 = ses.tShow = Date.now(); C.render(); return;
    }
    if (ses.phase !== 'run') return;
    if (rkLeft(ses) <= 0) return rkFinish();   // time is up
    const el = document.getElementById('rk-time'); if (el) { el.textContent = fmtMs(rkLeft(ses)); el.parentNode.classList.toggle('low', rkLeft(ses) <= 15000); }
  }, 250);
}
/** to the next problem (after a right answer or a pass); more problems are made as they run out */
export function rkNext() {
  const ses = C.S.session; if (!ses || ses.kind !== 'rank' || ses.phase !== 'run') return;
  if (rkLeft(ses) <= 0) return rkFinish();
  const p = ses.items[ses.i]; ses.dur[p.id] = Date.now() - ses.tShow;
  if (ses.i + 3 >= ses.items.length) { const more = rankProblems(C.S.engine, ses.ch, ses.tier, ses.seed, 5, ses.made, ses.seen); if (more.length) { ses.items.push(...more); ses.made = more[more.length - 1].rn + 1; } }
  if (ses.i + 1 >= ses.items.length) return rkFinish();
  ses.i += 1; ses.tShow = Date.now(); C.S.tab = 'user'; C.render(); window.scrollTo(0, 0);
}
/** the end: the time is up (the problem on screen counts only if it was solved) */
function rkFinish() {
  const ses = C.S.session; if (!ses || ses.kind !== 'rank' || ses.phase !== 'run') return;
  ses.tEnd = Date.now(); ses.phase = 'done'; rkStopTick();
  const cur = ses.items[ses.i]; if (cur && ses.dur[cur.id] === undefined) ses.dur[cur.id] = ses.tEnd - ses.tShow;
  ses.items = ses.items.slice(0, ses.i + 1);   // the problems that were shown
  const solved = ses.items.filter(p => ses.done[p.id]).length;
  const misses = Object.values(ses.miss).reduce((s, n) => s + n, 0), passed = ses.items.filter(p => ses.pass[p.id]).length;
  const r = Object.assign(rankScore(solved, misses), { test: ses.test, solved, passed, misses, ms: ses.limit, at: Date.now() });
  const rec = rkRec(ses.test), prev = rec.hist.length ? { score: rec.best, passed: rec.bestP || 0 } : null;
  r.newBest = !!prev && rankBetter(r, prev);
  if (!prev || r.newBest) { rec.best = r.score; rec.bestP = r.passed; }
  rec.hist = [{ s: r.score, r: r.rank, acc: r.acc, ok: r.solved, miss: r.misses, pass: r.passed, at: r.at }, ...rec.hist].slice(0, 10);
  C.save();
  if (C.S.klass && backend.enabled) backend.logAttempt(Object.assign({ class_id: C.S.klass.id }, rankRow(r)));
  loadBoard(ses.test);
  if (ses.asg && C.asgHit) ses.ru = C.asgHit(ses.asgType || 'rank', `${r.rank}${r.passed ? '*' : ''} ${r.score}`, { score: r.score, rank: r.rank, passed: r.passed, solved: r.solved, misses: r.misses });
  ses.res = r; C.render(); window.scrollTo(0, 0);
}
const rkName = ses => `${C.chName(ses.ch)} · ${H('rk.tier.' + ses.tier)}`;
function rankHubHTML() {
  rkClean();
  return `<main class="wrap rk-page">
    <section class="card rk-head"><h1>🏅 ${H('rk.title')}</h1><p class="muted">${H('rk.sub', { n: RK_N })}</p>
      <ul class="rk-rules"><li>${H('rk.rule1')}</li><li>${H('rk.rule2')}</li><li>${H('rk.rule3')}</li><li>${H('rk.rule4')}</li></ul></section>
    <section class="card rk-grid-card"><table class="rk-grid"><thead><tr><th>${H('rk.chapter')}</th>${RK_TIERS.map((t, i) => `<th class="t${i}">${H('rk.tier.' + t)} <span class="tag">⏱ ${H('rk.limit', { m: rkMin(t) })}</span><small>${H('rk.tierDesc.' + t)}</small></th>`).join('')}</tr></thead><tbody>
      ${RK_CHAPTERS.map((ch, ci) => `<tr style="--cc:var(--c-${ch})"><th><span class="rk-chdot"></span>${H('home.chapter', { n: ci + 1 })} ${C.chName(ch)}</th>${RK_TIERS.map(t => { const rec = rkRec(rankKey(ch, t));
        return `<td><a class="rk-cell" href="#/rank/${ch}/${t}">${rec.hist.length ? `<span>${rkBadge(rankOf(rec.best), rec.bestP)}</span><b>${rec.best}</b>` : `<span class="muted">${H('rk.start')}</span>`}</a></td>`; }).join('')}</tr>`).join('')}
    </tbody></table></section>
    <section class="card"><h3>${H('rk.ranks')}</h3><div class="rk-scale">${RK_RANKS.map((r, i) => `<span><span class="rk-badge r-${r}">${r}</span><small>${RK_FROM[i]}${i + 1 < RK_RANKS.length ? '–' + (RK_FROM[i + 1] - 1) : '+'}</small></span>`).join('')}</div><p class="muted small">${H('rk.formula')}</p></section>
  </main>`;
}
export function rankHTML() {
  const test = C.S.route.test;
  document.title = `${T('rk.title')} · SQL Practice`;
  if (!test) { if (C.S.session && C.S.session.kind === 'rank') { rkStopTick(); C.S.session = null; } return rankHubHTML(); }
  if (!C.S.session || C.S.session.kind !== 'rank' || C.S.session.test !== test) { rkStopTick(); C.S.session = Object.assign({ kind: 'rank', test, phase: 'ready', items: [], i: 0, done: {}, miss: {}, pass: {}, dur: {} }, rankParse(test)); }
  const ses = C.S.session, tier = ses.tier;
  const head = `<div class="session-head rk-bar"><h1>🏅 ${rkName(ses)}</h1>${ses.phase === 'run' ? `${rkCountsHTML(ses)}<span class="rk-time${rkLeft(ses) <= 15000 ? ' low' : ''}">⏱ ${H('rk.left')} <b id="rk-time">${fmtMs(rkLeft(ses))}</b></span>` : ''}</div>`;
  if (ses.phase === 'ready') return `<main class="wrap narrow">${head}<section class="card rk-ready"><p>${H('rk.readyAbout', { c: T('ch.' + ses.ch).replace(/\{([^|}]+)\|[^}]+\}/g, '$1'), m: rkMin(tier) })}</p><p class="muted">${H('rk.tierDesc.' + tier)}</p>
      <ul class="rk-rules"><li>${H('rk.rule1')}</li><li>${H('rk.rule2')}</li><li>${H('rk.rule3')}</li><li>${H('rk.rule4')}</li></ul>
      <div class="row-btns"><button class="btn btn-primary btn-lg" data-act="rkGo">${H('rk.go')}</button><a class="btn btn-ghost" href="#/rank">${H('rk.back')}</a></div></section></main>`;
  if (ses.phase === 'count') return `<main class="wrap narrow">${head}<section class="card rk-ready"><div class="rk-countdown" id="rk-count">${ses.n}</div><p class="muted center">${H('rk.readySub')}</p></section></main>`;
  if (ses.phase === 'done' && ses.res) return rankDoneHTML(ses);
  const prob = ses.items[ses.i], lesson = LESSON_BY_KEY[prob.lesson];
  return `<main class="wrap">${head}
    <div class="session-layout">
      <aside class="card side-card" style="--cc:var(--c-${lesson.ch})"><div class="rk-qn">Q${ses.i + 1}</div><div class="chap">${C.chName(lesson.ch)}</div><h2>${lessonTitleHTML(lesson, L())}</h2>
        ${ses.miss[prob.id] ? `<p class="rk-misscount">${H('rk.missN', { n: ses.miss[prob.id] })}</p>` : ''}
        <p class="muted small">${H('rk.passHint')}</p><button class="btn btn-ghost" data-act="rkPass">${H('rk.pass')} ⏭</button></aside>
      <div class="main" id="ws">${C.workspaceHTML(prob)}</div>
    </div></main>`;
}
function rankDoneHTML(ses) {
  const r = ses.res, next = rankToNext(r.score), rec = rkRec(ses.test);
  const byCh = {};   // by lesson (the test is one subject)
  ses.items.forEach(p => { const ch = p.lesson, b = (byCh[ch] = byCh[ch] || { n: 0, ok: 0, pass: 0, miss: 0, ms: 0 }); b.n++; if (ses.done[p.id]) b.ok++; if (ses.pass[p.id]) b.pass++; b.miss += ses.miss[p.id] || 0; b.ms += ses.dur[p.id] || 0; });
  const chs = Object.keys(byCh), good = c => byCh[c].ok === byCh[c].n && !byCh[c].miss, weak = c => byCh[c].pass || byCh[c].miss >= byCh[c].n;
  const weakLessons = [...new Set(ses.items.filter(p => ses.pass[p.id] || (ses.miss[p.id] || 0) >= 2).map(p => p.lesson))];
  return `<main class="wrap rk-page">
    <section class="card rk-result">
      <small class="muted">${rkName(ses)}</small>
      <div class="rk-main"><span class="rk-badge big r-${r.rank}">${r.rank}</span>${r.passed ? `<span class="rk-withpass big">${H('rk.withPass')}</span>` : ''}<div><small>${H('rk.score')}</small><b class="rk-score">${r.score}</b>${r.newBest ? `<span class="tag ok">${H('rk.newBest')}</span>` : ''}</div></div>
      ${r.passed ? `<p class="rk-passnote">${H('rk.passNote', { r: r.rank })}</p>` : ''}
      ${ses.ru ? `<p class="ru-msg ${ses.ru.clear ? 'ok' : ''}">${ses.ru.clear ? (ses.ru.next ? H('as.ru.clearNext', { t: T('rk.tier.' + ses.ru.next).replace(/\{([^|}]+)\|[^}]+\}/g, '$1') }) : H('as.ru.allClear')) : H('as.ru.notClear', { r: ses.ru.pass })}</p>` : ''}
      <p class="muted">${next === null ? H('rk.top') : H('rk.toNext', { n: next, r: RK_RANKS[RK_RANKS.indexOf(r.rank) + 1] })}</p>
      <div class="rk-figs"><span><small>${H('rk.solved')}</small><b>${r.solved}</b></span><span><small>${H('rk.acc')}</small><b>${r.acc}%</b></span><span><small>${H('rk.time')}</small><b>${fmtMs(r.ms)}</b></span><span><small>${H('rk.passed')}</small><b>${r.passed}</b></span><span><small>${H('rk.misses')}</small><b>${r.misses}</b></span></div>
      <p class="muted small">${H('rk.formula')}</p>
      ${ses.asg ? `<div class="row-btns"><a class="btn btn-primary" href="#/live">📬 ${H('as.back')}</a></div>` : `<div class="row-btns"><button class="btn btn-primary" data-act="rkAgain">${I.repeat}${H('rk.again')}</button><a class="btn btn-ghost" href="#/rank">${H('rk.back')}</a></div>`}
      ${C.S.klass ? `<p class="muted small">${H('rk.sent')}</p>` : ''}
    </section>
    <div class="rk-side">
      ${boardHTML(ses.test)}
      <section class="card"><h3>${H('rk.byLesson')}</h3><table class="wtable"><thead><tr><th>${H('rk.lesson')}</th><th class="n">${H('rk.solved')}</th><th class="n">${H('rk.passed')}</th><th class="n">${H('rk.misses')}</th><th class="n">${H('rk.perQ')}</th><th></th></tr></thead><tbody>
        ${chs.map(c => { const b = byCh[c]; return `<tr><td><a href="#/lecture/${c}">${lessonTitleHTML(LESSON_BY_KEY[c], L())}</a></td><td class="n">${b.ok}/${b.n}</td><td class="n">${b.pass}</td><td class="n">${b.miss}</td><td class="n">${Math.round(b.ms / b.n / 1000)}s</td><td>${good(c) ? `<span class="tag ok">${H('rk.strong')}</span>` : weak(c) ? `<span class="tag bad">${H('rk.weak')}</span>` : ''}</td></tr>`; }).join('')}
      </tbody></table>
      ${weakLessons.length ? `<p class="small"><b>${H('rk.study')}</b> ${weakLessons.map(k => `<a href="#/lecture/${k}">${lessonTitleHTML(LESSON_BY_KEY[k], L())}</a>`).join('、')}</p>` : `<p class="muted small">${H('rk.noWeak')}</p>`}</section>
      <section class="card"><h3>${H('rk.history')}</h3>${rec.hist.length ? `<table class="wtable"><thead><tr><th>${H('rk.when')}</th><th>${H('rk.rank')}</th><th class="n">${H('rk.score')}</th><th class="n">${H('rk.solved')}</th><th class="n">${H('rk.misses')}</th></tr></thead><tbody>${rec.hist.map(h => `<tr><td class="muted small">${esc(new Date(h.at).toLocaleString(htmlLang(L())))}</td><td>${rkBadge(h.r, h.pass)}</td><td class="n"><b>${h.s}</b></td><td class="n">${h.ok ?? ''}</td><td class="n">${h.miss ?? ''}</td></tr>`).join('')}</tbody></table>` : ''}</section>
    </div>
    <h2 class="bs-h2">${H('rk.review')}</h2>
    ${ses.items.map((p, i) => { const ok = !!ses.done[p.id], l = LESSON_BY_KEY[p.lesson];
      return `<details class="card lv-rv ${ok ? 'ok' : 'ng'}"><summary><b>${ok ? '○' : '–'} Q${i + 1}</b><span style="--cc:var(--c-${l.ch})">${lessonTitleHTML(l, L())}</span><span class="muted small">${ses.pass[p.id] ? H('rk.passed') : !ok ? H('rk.timeUp') : ''} ${ses.miss[p.id] ? H('rk.missN', { n: ses.miss[p.id] }) : ''} · ${Math.round((ses.dur[p.id] || 0) / 1000)}s</span></summary>
        <p class="prob-text">${problemHTML(p, L())}</p><div class="muted small">${H('cq.good')}</div><pre class="sql">${highlightSQL(p.sql)}</pre></details>`; }).join('')}
  </main>`;
}

/* for the checks only */
export const _rkTest = { boardHTML, setBoard: (test, rows) => { boards[test] = { rows }; } };
