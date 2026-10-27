/* =========================================================
 * app.js — the learning app (index.html)
 *
 * Everything on screen is drawn from `state` by render().
 * Changing the language only re-draws text: progress, drafts, results
 * and the current problem are kept, because they are stored by
 * language-independent problem IDs.
 * ========================================================= */

const state = {
  lang: detectLang(),
  set: currentSet(),
  engine: null,
  route: { view: 'home' },
  runs: {},            // problem id → { res, grade, error }  (kept in memory while the page is open)
  tab: 'user',
  step: null,          // index of step-by-step explanation, or null
  showData: {},        // table name → true
  presenter: !!Store.get(KEYS.presenter, false),
  progress: Store.get(KEYS.progress, null) || { solved: {}, drafts: {}, last: null }
};
const app = document.getElementById('app');

/* ---------- progress ---------- */
function saveProgress() { Store.set(KEYS.progress, state.progress); }
const isSolved = id => !!state.progress.solved[id];
function lessonStats(lesson) {
  const ids = Object.keys(state.progress.solved).filter(id => id.startsWith(lesson.key + ':'));
  const demo = ids.includes(lesson.key + ':demo');
  const practice = ids.filter(id => !id.endsWith(':demo')).length;
  return { demo, practice, done: demo && practice >= 3 };
}
function totals() {
  const solved = Object.keys(state.progress.solved).length;
  const done = LESSONS.filter(l => lessonStats(l).done).length;
  return { solved, done, all: LESSONS.length };
}

/* ---------- routing: #/  ·  #/l/<lesson>/<n> ---------- */
function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'l' && LESSON_BY_KEY[h[1]]) {
    const max = PRACTICE_COUNT;
    const idx = Math.min(max, Math.max(0, parseInt(h[2], 10) || 0));
    return { view: 'lesson', key: h[1], idx };
  }
  return { view: 'home' };
}
function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
window.addEventListener('hashchange', () => { state.route = parseRoute(); state.step = null; state.tab = 'user'; render(); window.scrollTo(0, 0); });

/* ---------- helpers ---------- */
const T = (k, v) => t(k, state.lang, v);
const lessonTitle = l => L10(l.title, state.lang);
const chapterOf = l => CHAPTERS.find(c => c.key === l.ch);
const chapterColor = key => `var(--c-${key})`;
function problemsOf(lesson) { return state.engine.lessonProblems(lesson, state.set.code); }
function currentProblem() {
  const lesson = LESSON_BY_KEY[state.route.key];
  const probs = problemsOf(lesson);
  return { lesson, probs, prob: probs[Math.min(state.route.idx, probs.length - 1)] };
}
function probLabel(prob) { return prob.kind === 'demo' ? T('lesson.demo') : T('lesson.practice', { n: prob.idx }); }
function probSub(prob) { return prob.kind === 'demo' ? T('lesson.demoSub') : pick(prob.label, state.lang); }
function defaultSql(prob) { return `SELECT * FROM ${prob.tables[0]};`; }

/* =========================================================
 * RENDER
 * ========================================================= */
function render() {
  document.documentElement.lang = state.lang;
  document.body.classList.toggle('presenter', state.presenter);
  const r = state.route;
  const header = headerHTML();
  if (!state.engine) { app.innerHTML = header + `<div class="loading"><div><div class="spinner"></div>${esc(T('misc.loading'))}</div></div>`; return; }
  let body;
  if (r.view === 'lesson') { body = lessonHTML(); }
  else { body = homeHTML(); document.title = 'SQL Practice'; }
  app.innerHTML = header + body;
  if (r.view === 'lesson') mountEditor();
}

function headerHTML() {
  const onHome = state.route.view === 'home';
  return `<header class="topbar"><div class="topbar-in">
    <a class="brand" href="#/"><span class="brand-mark">SQL</span><span>SQL Practice</span></a>
    <nav class="topnav">
      <a href="#/" class="${onHome ? 'on' : ''}">${esc(T('nav.home'))}</a>
      <a href="test.html">${ICONS.paper.replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-2px;margin-right:4px"')}<span>${esc(T('nav.test'))}</span></a>
    </nav>
    <div class="topbar-right">
      <button class="icon-btn" data-act="presenter" aria-pressed="${state.presenter}" title="${esc(T('pres.on'))}">${ICONS.screen}<span class="lbl">${esc(T('pres.on'))}</span></button>
      ${langSelectHTML(state.lang)}
    </div>
  </div></header>`;
}

/* ---------- set code box ---------- */
function setBoxHTML() {
  const s = state.set;
  return `<div class="setbox">
    <div class="setbox-top">
      <span class="setbox-label">${esc(s.custom ? T('set.custom') : T('set.today'))}</span>
      <span class="setbox-code">${esc(s.code)}</span>
    </div>
    <div class="setbox-actions">
      <button class="btn btn-ghost btn-sm" data-act="newSet">${ICONS.shuffle}${esc(T('set.new'))}</button>
      ${s.custom ? `<button class="btn btn-ghost btn-sm" data-act="todaySet">${esc(T('set.backToday'))}</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-act="copyLink">${ICONS.link}${esc(T('set.copyLink'))}</button>
    </div>
    <form data-act="applySet">
      <input name="code" maxlength="16" placeholder="${esc(T('set.code'))}" aria-label="${esc(T('set.code'))}" autocomplete="off">
      <button class="btn btn-ghost btn-sm" type="submit">${esc(T('set.apply'))}</button>
    </form>
    <p class="tip">${esc(T('set.tip'))}</p>
  </div>`;
}

/* ---------- home ---------- */
function homeHTML() {
  const tot = totals();
  const last = state.progress.last;
  const contHash = last && LESSON_BY_KEY[last.key] ? `#/l/${last.key}/${last.idx || 0}` : `#/l/${LESSONS[0].key}/0`;
  const pct = Math.round(tot.done / tot.all * 100);
  return `<main class="wrap">
    <section class="hero">
      <div class="hero-text">
        <h1>${esc(T('home.title'))}</h1>
        <p>${esc(T('home.sub'))}</p>
        <a class="btn" href="${contHash}">${esc(last ? T('home.continue') : T('home.start'))} ${ICONS.next}</a>
        <div class="hero-deco" aria-hidden="true">SELECT *</div>
      </div>
      <div class="card stats">
        <div class="stat-row">
          <div class="stat"><b>${tot.solved}</b><span>${esc(T('home.solved'))}</span></div>
          <div class="stat"><b>${tot.done}<small class="muted" style="font-size:.9rem"> / ${tot.all}</small></b><span>${esc(T('home.lessonsDone', { a: tot.done, b: tot.all }))}</span></div>
        </div>
        <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
        ${setBoxHTML()}
      </div>
    </section>
    <section class="chapters">
      ${CHAPTERS.map((ch, ci) => {
        const ls = LESSONS.filter(l => l.ch === ch.key);
        return `<article class="card chapter" style="--cc:${chapterColor(ch.key)}">
          <div class="chapter-head"><div class="chapter-icon">${esc(ch.icon)}</div><div>
            <small>${esc(T('home.chapter', { n: ci + 1 }))} · ${esc(T('home.lessons', { n: ls.length }))}</small>
            <h2>${esc(T(ch.title))}</h2><p>${esc(T(ch.desc))}</p></div></div>
          <ul class="lesson-list">${ls.map(l => {
            const st = lessonStats(l);
            const probs = problemsOf(l);
            return `<li><a class="lesson-link ${st.done ? 'done' : ''}" href="#/l/${l.key}/0">
              <span class="lesson-num">${st.done ? '✓' : l.index + 1}</span>
              <span class="lesson-name">${esc(lessonTitle(l))}</span>
              <span class="dots" aria-hidden="true">${probs.map(p => `<i class="${p.kind === 'demo' ? 'demo ' : ''}${isSolved(p.id) ? 'on' : ''}"></i>`).join('')}</span>
            </a></li>`;
          }).join('')}</ul>
        </article>`;
      }).join('')}
    </section>
    <footer class="home-foot">
      <span>${esc(T('prog.saved'))}</span>
      <button class="linkbtn" data-act="resetProgress">${esc(T('prog.reset'))}</button>
    </footer>
  </main>`;
}

/* ---------- lesson ---------- */
function lessonHTML() {
  const { lesson, probs, prob } = currentProblem();
  const ch = chapterOf(lesson);
  const st = lessonStats(lesson);
  const li = lesson.index;
  const prevL = LESSONS[li - 1], nextL = LESSONS[li + 1];
  document.title = `${lessonTitle(lesson)} · SQL Practice`;
  state.progress.last = { key: lesson.key, idx: prob.idx }; saveProgress();

  const side = `<aside class="side" style="--cc:${chapterColor(ch.key)}">
    <div class="card side-card">
      <div class="chap">${esc(T('lesson.of', { a: li + 1 }))} · ${esc(T(ch.title))}</div>
      <h1>${esc(lessonTitle(lesson))}</h1>
      <div class="point"><b>${esc(T('lesson.point'))}</b>${esc(L10(lesson.point, state.lang))}</div>
    </div>
    <div class="card">
      <div class="plist-title"><span>${esc(T('lesson.problems'))}</span><span>${probs.filter(p => isSolved(p.id)).length}/${probs.length}</span></div>
      <nav class="plist">${probs.map(p => `<a class="pitem ${p.kind} ${p.idx === prob.idx ? 'on' : ''} ${isSolved(p.id) ? 'solved' : ''}" href="#/l/${lesson.key}/${p.idx}" ${p.idx === prob.idx ? 'aria-current="page"' : ''}>
        <span class="ck"></span><span class="pt"><b>${esc(probLabel(p))}</b><span>${esc(probSub(p))}</span></span></a>`).join('')}</nav>
      ${st.done ? `<div class="done-banner">✓ ${esc(T('lesson.lessonDone'))}</div>` : `<div class="rule">${esc(T('lesson.rule'))}</div>`}
    </div>
    <div class="set-card">${setBoxHTML()}</div>
    <div class="lesson-nav">
      ${prevL ? `<a class="btn btn-ghost btn-sm" href="#/l/${prevL.key}/0">${ICONS.prev}${esc(T('btn.prevLesson'))}</a>` : ''}
      ${nextL ? `<a class="btn btn-ghost btn-sm" href="#/l/${nextL.key}/0">${esc(T('btn.nextLesson'))}${ICONS.next}</a>` : ''}
    </div>
  </aside>`;

  const main = `<div class="main">
    <section class="card prob">
      <div class="prob-top">
        <span class="tag ${prob.kind}">${esc(probLabel(prob))}</span>
        ${prob.kind === 'demo' ? `<span class="tag">${esc(T('lesson.demoSub'))}</span>` : `<span class="tag">${esc(pick(prob.label, state.lang))}</span>`}
        ${isSolved(prob.id) ? `<span class="tag" style="color:var(--ok)">✓ ${esc(T('fb.correct'))}</span>` : ''}
      </div>
      <p class="prob-text">${problemHTML(prob, state.lang)}</p>
      <div class="tables">${prob.tables.map(tableBlockHTML).join('')}</div>
    </section>
    ${prob.kind === 'demo' ? stepsHTML(prob) : ''}
    ${hintsHTML(lesson, prob)}
    ${editorHTML(lesson, prob)}
    <div id="fb">${feedbackHTML(lesson, probs, prob)}</div>
    ${resultsHTML(prob)}
    <div class="mobile-only">${setBoxHTML()}</div>
    <div class="lesson-nav mobile-only">
      ${prevL ? `<a class="btn btn-ghost btn-sm" href="#/l/${prevL.key}/0">${ICONS.prev}${esc(T('btn.prevLesson'))}</a>` : ''}
      ${nextL ? `<a class="btn btn-ghost btn-sm" href="#/l/${nextL.key}/0">${esc(T('btn.nextLesson'))}${ICONS.next}</a>` : ''}
    </div>
  </div>`;

  return `<main class="wrap">
    <div class="crumbs"><a href="#/">${esc(T('nav.home'))}</a><span>›</span><span>${esc(T(ch.title))}</span><span>›</span><span>${esc(lessonTitle(lesson))}</span></div>
    <div class="lesson-layout">${side}${main}</div>
  </main>`;
}

function tableBlockHTML(name) {
  const tbl = ALL_TABLES[name];
  const open = !!state.showData[name];
  const qualify = LESSON_BY_KEY[state.route.key].kind === 'join';
  return `<div>
    <div class="tbl-head">
      <span class="tbl-name">${ICONS.table}${esc(name)}</span>
      <span class="muted" style="font-size:.8rem">${esc(T('prob.rows', { n: tbl.rows.length }))}</span>
      <button class="btn btn-ghost btn-sm data-toggle" data-act="toggleData" data-t="${esc(name)}" aria-expanded="${open}">${esc(open ? T('prob.hideData') : T('prob.showData'))}</button>
    </div>
    <div class="cols" style="margin-top:6px" title="${esc(T('prob.colsTip'))}">${tbl.columns.map(([c, ty]) =>
      `<button class="col-chip" data-act="insert" data-text="${esc(qualify ? name + '.' + c : c)}">${esc(c)}<small>${ty === 'INTEGER' ? '123' : 'abc'}</small></button>`).join('')}</div>
    ${open ? `<div class="data-box" style="margin-top:8px">${gridHTML(state.engine.tableData(name), { rowNums: false })}</div>` : ''}
  </div>`;
}

function stepsHTML(prob) {
  if (!prob.steps.length) return '';
  if (state.step === null) {
    return `<div class="demo-box"><p>${esc(T('pres.tip'))}</p><button class="btn btn-ghost" data-act="stepStart">${ICONS.steps}${esc(T('pres.steps'))}</button></div>`;
  }
  const i = state.step, n = prob.steps.length;
  const [key, sql] = prob.steps[i];
  const prev = i > 0 ? prob.steps[i - 1][1] : '';
  let res = null, err = '';
  try { res = state.engine.exec(sql); } catch (e) { err = e.message; }
  return `<section class="card steps" aria-live="polite">
    <div class="steps-head">
      <b>${esc(T('pres.step', { a: i + 1, b: n }))}</b>
      <span class="step-pips">${prob.steps.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</span>
      <button class="btn btn-ghost btn-sm" style="margin-left:auto" data-act="stepClose">${esc(T('btn.close'))}</button>
    </div>
    <p class="step-text">${esc(T(key))}</p>
    <pre class="sql step-sql">${highlightDiff(prev, sql)}</pre>
    <div class="muted" style="font-size:.8rem;font-weight:700;margin-bottom:6px">${esc(T('pres.result'))} · ${esc(T('prob.rows', { n: res ? res.values.length : 0 }))}</div>
    <div class="data-box">${res ? gridHTML(res, { rowNums: true }) : `<div class="res-empty">${esc(err || T('res.noRows'))}</div>`}</div>
    <div class="step-actions">
      <button class="btn btn-ghost" data-act="stepPrev" ${i === 0 ? 'disabled' : ''}>${ICONS.prev}${esc(T('pres.prev'))}</button>
      ${i < n - 1 ? `<button class="btn btn-primary" data-act="stepNext">${esc(T('pres.next'))}${ICONS.next}</button>`
        : `<button class="btn btn-primary" data-act="useSql" data-sql="${esc(sql)}">${esc(T('hint.use'))}</button>`}
    </div>
  </section>`;
}

function hintsHTML(lesson, prob) {
  return `<div class="hints">
    <details class="hint"><summary><span class="hi">1</span>${esc(T('hint.syntax'))}</summary>
      <div class="hint-body"><pre class="sql">${highlightSQL(syntaxHint(lesson, state.lang))}</pre></div></details>
    <details class="hint"><summary><span class="hi">2</span>${esc(T('hint.blank'))}</summary>
      <div class="hint-body"><pre class="sql">${highlightSQL(prob.blank)}</pre>
      <button class="btn btn-ghost btn-sm" data-act="useSql" data-sql="${esc(prob.blank)}">${esc(T('hint.use'))}</button></div></details>
    <details class="hint"><summary><span class="hi">✓</span>${esc(T('hint.answer'))}</summary>
      <div class="hint-body"><pre class="sql">${highlightSQL(prob.sql)}</pre>
      <button class="btn btn-ghost btn-sm" data-act="useSql" data-sql="${esc(prob.sql)}">${esc(T('hint.use'))}</button></div></details>
  </div>`;
}

function editorHTML(lesson, prob) {
  const kws = lesson.keywords || [];
  return `<section class="card editor-card">
    <div class="kwbar"><span>${esc(T('ed.insert'))}</span>${kws.map(k => `<button class="kw-chip" data-act="insertKw" data-text="${esc(k)}">${esc(k)}</button>`).join('')}</div>
    <div class="editor"><pre aria-hidden="true" id="hl"></pre><textarea id="sql" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="${esc(T('ed.yourSql'))}" placeholder="${esc(T('ed.placeholder'))}"></textarea></div>
    <div class="actions">
      <button class="btn btn-primary" data-act="run">${ICONS.play}${esc(T('ed.run'))}</button>
      <button class="btn btn-ghost" data-act="reset">${ICONS.reset}${esc(T('ed.reset'))}</button>
      <span class="hint-key">${esc(T('ed.shortcut'))}</span>
    </div>
  </section>`;
}

function feedbackHTML(lesson, probs, prob) {
  const run = state.runs[prob.id];
  if (!run) return '';
  if (run.error) {
    const code = run.error.code;
    const title = code === 'empty' || code === 'onlySelect' ? T('fb.notYet') : T('fb.error');
    const msg = code === 'empty' ? T('fb.empty') : code === 'onlySelect' ? T('fb.onlySelect') : '';
    return `<div class="fb bad" role="alert"><div class="fb-icon">!</div><div class="fb-body"><h3>${esc(title)}</h3>
      ${msg ? `<p>${esc(msg)}</p>` : `<pre>${esc(run.error.message)}</pre>`}</div></div>`;
  }
  const g = run.grade;
  if (g.ok) {
    const isLast = prob.idx >= probs.length - 1;
    const nextL = LESSONS[lesson.index + 1];
    const nextBtn = !isLast ? `<button class="btn btn-ok fb-next" data-act="nextProb">${esc(T('btn.next'))}${ICONS.next}</button>`
      : nextL ? `<a class="btn btn-ok fb-next" href="#/l/${nextL.key}/0">${esc(T('btn.nextLesson'))}${ICONS.next}</a>` : '';
    const done = lessonStats(lesson).done && run.justCompleted;
    return `<div class="fb ok" role="status"><div class="fb-icon">${ICONS.check.replace('<svg', '<svg style="width:18px;height:18px"')}</div>
      <div class="fb-body"><h3>${esc(T('fb.correct'))}</h3><p>${esc(done ? T('lesson.lessonDone') : T('fb.correctSub'))}</p></div>${nextBtn}</div>`;
  }
  const msg = {
    noResult: T('fb.noResult'),
    cols: T('fb.cols', { a: g.a, b: g.b }),
    rows: T('fb.rows', { a: g.a, b: g.b }),
    order: T('fb.order'),
    values: T('fb.values') + ' ' + T('fb.compare')
  }[g.reason];
  return `<div class="fb bad" role="alert"><div class="fb-icon">?</div><div class="fb-body"><h3>${esc(T('fb.notYet'))}</h3><p>${esc(msg)}</p></div></div>`;
}

function resultsHTML(prob) {
  const run = state.runs[prob.id];
  const exp = state.engine.exec(prob.sql);
  const user = run && run.res;
  const tabBtn = (k, label, res) => `<button class="res-tab ${state.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}" role="tab" aria-selected="${state.tab === k}">${esc(label)}${res ? `<span class="count">${res.values.length}</span>` : ''}</button>`;
  let body;
  if (state.tab === 'expected') body = gridHTML(exp, { rowNums: true });
  else if (!run || run.error) body = `<div class="res-empty">${esc(T('res.notRun'))}</div>`;
  else if (!user.columns.length || !user.values.length) body = `<div class="res-empty">${esc(T('res.noRows'))}</div>`;
  else body = gridHTML(user, { rowNums: true });
  return `<section class="card results">
    <div class="res-tabs" role="tablist">${tabBtn('user', T('res.yours'), run && !run.error ? user : null)}${tabBtn('expected', T('res.expected'), exp)}</div>
    <div class="res-body">${body}</div>
  </section>`;
}

/* ---------- editor ---------- */
function mountEditor() {
  const ta = document.getElementById('sql'), hl = document.getElementById('hl');
  if (!ta) return;
  const { prob } = currentProblem();
  const draft = state.progress.drafts[prob.id];
  ta.value = draft !== undefined ? draft : defaultSql(prob);
  const sync = () => {
    hl.innerHTML = highlightSQL(ta.value) + '\n';
    ta.style.height = 'auto';
    ta.style.height = Math.max(140, ta.scrollHeight) + 'px';
  };
  let timer = null;
  ta.addEventListener('input', () => {
    sync();
    clearTimeout(timer);
    timer = setTimeout(() => { state.progress.drafts[prob.id] = ta.value; saveProgress(); }, 300);
  });
  ta.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runQuery(); }
    else if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); insertAtCursor('  '); }
  });
  sync();
}
function insertAtCursor(text, cursorBack) {
  const ta = document.getElementById('sql');
  if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
  ta.value = v.slice(0, s) + text + v.slice(e);
  const pos = s + text.length - (cursorBack || 0);
  ta.focus();
  ta.setSelectionRange(pos, pos);
  ta.dispatchEvent(new Event('input'));
}
function insertKeyword(k) {
  const ta = document.getElementById('sql');
  const before = ta.value.slice(0, ta.selectionStart);
  const pad = before && !/\s$/.test(before) && !/^[,.]/.test(k) ? ' ' : '';
  if (k === "'%%'") return insertAtCursor(pad + "'%%'", 2);
  if (k === "= ''") return insertAtCursor(pad + "= ''", 1);
  if (/\(\)$/.test(k)) return insertAtCursor(pad + k, 1);
  if (k === ',' || k === '.') return insertAtCursor(k === ',' ? ', ' : '.');
  insertAtCursor(pad + k + ' ');
}

function runQuery() {
  const ta = document.getElementById('sql');
  const { lesson, prob } = currentProblem();
  const sql = ta.value;
  state.progress.drafts[prob.id] = sql;
  let run;
  try {
    const res = state.engine.runUser(sql);
    const g = grade(res, state.engine.exec(prob.sql), prob.ordered);
    run = { res, grade: g };
    if (g.ok && !isSolved(prob.id)) {
      const before = lessonStats(lesson).done;
      state.progress.solved[prob.id] = Date.now();
      run.justCompleted = !before && lessonStats(lesson).done;
    }
  } catch (e) {
    run = { error: { code: e.code || 'sql', message: e.message } };
  }
  state.runs[prob.id] = run;
  state.tab = 'user';
  saveProgress();
  render();
  const fb = document.getElementById('fb');
  if (fb && fb.firstElementChild) {
    const r = fb.getBoundingClientRect();
    if (r.bottom > window.innerHeight || r.top < 70) fb.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT' || el.tagName === 'FORM') return;
  const act = el.dataset.act;
  const actions = {
    presenter() { state.presenter = !state.presenter; Store.set(KEYS.presenter, state.presenter); render(); },
    run: runQuery,
    reset() { const { prob } = currentProblem(); delete state.progress.drafts[prob.id]; delete state.runs[prob.id]; saveProgress(); render(); },
    insert() { insertAtCursor(el.dataset.text); },
    insertKw() { insertKeyword(el.dataset.text); },
    useSql() { const ta = document.getElementById('sql'); ta.value = el.dataset.sql; ta.dispatchEvent(new Event('input')); ta.focus(); ta.scrollIntoView({ block: 'center', behavior: 'smooth' }); },
    tab() { state.tab = el.dataset.tab; render(); },
    toggleData() { const n = el.dataset.t; state.showData[n] = !state.showData[n]; render(); },
    stepStart() { state.step = 0; render(); },
    stepNext() { state.step++; render(); },
    stepPrev() { state.step = Math.max(0, state.step - 1); render(); },
    stepClose() { state.step = null; render(); },
    nextProb() { const { lesson, prob } = currentProblem(); go(`#/l/${lesson.key}/${prob.idx + 1}`); },
    newSet() { changeSet(randomCode()); },
    todaySet() { changeSet(null); },
    copyLink() {
      const u = new URL(location.href);
      u.search = `?set=${encodeURIComponent(state.set.code)}`;
      const done = () => toast(T('set.copied'));
      if (navigator.clipboard) navigator.clipboard.writeText(u.toString()).then(done, () => prompt('', u.toString()));
      else prompt('', u.toString());
    },
    resetProgress() {
      if (!confirm(T('prog.confirm'))) return;
      state.progress = { solved: {}, drafts: {}, last: null }; state.runs = {}; saveProgress(); render();
    }
  };
  if (actions[act]) { e.preventDefault(); actions[act](); }
});
document.addEventListener('change', e => {
  if (e.target.matches('[data-act="lang"]')) {
    // keep whatever is typed in the editor
    const ta = document.getElementById('sql');
    if (ta && state.route.view === 'lesson') { const { prob } = currentProblem(); state.progress.drafts[prob.id] = ta.value; saveProgress(); }
    state.lang = e.target.value; applyLang(state.lang); render();
  }
});
document.addEventListener('submit', e => {
  if (e.target.matches('[data-act="applySet"]')) {
    e.preventDefault();
    const code = normCode(new FormData(e.target).get('code'));
    if (code) changeSet(code);
  }
});
function changeSet(code) {
  if (code) { state.set = { code, custom: true }; Store.set(KEYS.set, { code }); }
  else { state.set = { code: todayCode(), custom: false }; Store.del(KEYS.set); }
  // drop ?set= from the address so a reload keeps the choice made here
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  state.runs = {}; state.step = null;
  render();
  toast(`${state.set.custom ? T('set.custom') : T('set.today')}: ${state.set.code}`);
}

/* ---------- start ---------- */
state.route = parseRoute();
applyLang(state.lang);
render();
loadEngine().then(engine => { state.engine = engine; render(); }).catch(err => {
  console.error(err);
  app.innerHTML = headerHTML() + `<div class="loading"><div>${esc(T('misc.loadError'))}</div></div>`;
});
