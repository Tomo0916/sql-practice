/* =========================================================
 * lecture-ui.js — the lecture viewer: slides, and tables whose rows
 * move between frames (kept, removed, sorted, gathered into groups).
 * One click / → / space = next frame; ← = back; A = play by itself.
 * ========================================================= */
import { th, esc, rubyHTML } from './i18n.js';
import { highlightSQL, fmtCell, syntaxHint } from './ui.js';
import { LECTURES, ltext } from './lectures.js';

const cl = lang => (['ja', 'easy', 'en'].includes(lang) ? lang : 'en');
const tx = (x, lang) => rubyHTML(ltext(x, cl(lang)));

/** the slides of a lesson's lecture as a flat list of steps: [{slide, frame}] */
export function lectureSteps(key) {
  const L = LECTURES[key];
  if (!L) return [];
  return L.slides.flatMap((s, i) => (s.type === 'anim' ? s.frames.map((_, f) => ({ slide: i, frame: f })) : [{ slide: i, frame: 0 }]));
}

function sqlHTML(sql, mark) {
  let h = highlightSQL(sql);
  if (mark) {
    const m = highlightSQL(mark);
    if (h.includes(m)) h = h.replace(m, `<mark>${m}</mark>`);
  }
  return `<pre class="sql lec-sql">${h}</pre>`;
}
export function tableHTML(st) {
  const tmpl = st.cols.map(c => (/name/.test(c) ? 'minmax(150px, 2fr)' : 'minmax(70px, 1fr)')).join(' ');
  const hl = new Set(st.hl);
  const ccls = c => (hl.has(c) ? 'hl' : st.dim && hl.size ? 'dim' : '');
  return `<div class="lt" style="--cols:${tmpl}">
    <div class="lt-head">${st.cols.map(c => `<span class="${ccls(c)}">${esc(c)}</span>`).join('')}</div>
    <div class="lt-body">${st.rows.map(r => `<div class="lt-row ${r.cls || ''}" data-k="${esc(r.k)}">${r.cells.map((v, i) => `<span class="${ccls(st.cols[i])} ${typeof v === 'number' ? 'num' : ''}">${fmtCell(v)}</span>`).join('')}${r.cls === 'pass' ? '<i class="lt-mark">✓</i>' : r.cls === 'fail' ? '<i class="lt-mark">✕</i>' : ''}</div>`).join('')}</div>
    <div class="lt-foot">${st.rows.length} rows</div></div>`;
}

/** the HTML of one step (the frame of a slide) */
export function lectureStepHTML(lesson, step, engine, lang) {
  const L = LECTURES[lesson.key], s = L.slides[step.slide];
  if (s.type === 'syntax') {
    return `<div class="lec-slide lec-syntax"><h2>${th('lec.syntax', lang)}</h2>
      <pre class="sql lec-big">${highlightSQL(syntaxHint(lesson, lang))}</pre>
      <ul class="lec-notes">${s.notes.map(n => `<li>${tx(n, lang)}</li>`).join('')}</ul></div>`;
  }
  if (s.type === 'anim') {
    const f = s.frames[step.frame];
    return `<div class="lec-slide lec-anim"><h2>${tx(s.title, lang)}<small class="muted">${step.frame + 1} / ${s.frames.length}</small></h2>
      <div class="lec-grid"><div class="lec-left">${sqlHTML(f.sql, f.mark)}<p class="lec-cap">${tx(f.cap, lang)}</p></div>
      <div class="lec-table" data-anim>${tableHTML(f.table(engine))}</div></div></div>`;
  }
  if (s.type === 'points') return `<div class="lec-slide"><h2>${th('lesson.point', lang)}</h2><ol class="lec-points">${s.items.map(n => `<li>${tx(n, lang)}</li>`).join('')}</ol></div>`;
  if (s.type === 'mistake') {
    return `<div class="lec-slide"><h2>${th('lec.mistake', lang)}</h2>
      <div class="lec-mx"><span class="x">✕</span><pre class="sql wrong">${highlightSQL(s.wrong)}</pre></div>
      <p class="lec-why">${tx(s.why, lang)}</p>
      <div class="lec-mx"><span class="o">○</span><pre class="sql">${highlightSQL(s.right)}</pre></div></div>`;
  }
  if (s.type === 'practice') return `<div class="lec-slide lec-end"><div class="empty-icon">✓</div><h2>${th('lec.practiceTitle', lang)}</h2><p class="muted">${tx(L.goal, lang)}</p>
    <a class="btn btn-primary" href="#/l/${lesson.key}/0">${th('lec.toPractice', lang)}</a></div>`;
  return '';
}

/**
 * Show a step inside `box`. When the step is the next frame of the same animated slide,
 * the rows move: kept rows slide to their new place, removed rows fade out (or fly into
 * their group row), new rows fade in.
 */
export function paintStep(box, html, sameSlide, merge) {
  const old = box.querySelector('[data-anim]');
  if (!sameSlide || !old) { box.innerHTML = html; return; }
  const before = new Map();
  old.querySelectorAll('.lt-row').forEach(r => before.set(r.dataset.k, { rect: r.getBoundingClientRect(), node: r.cloneNode(true) }));
  const hostRect = old.getBoundingClientRect();
  box.innerHTML = html;
  const neu = box.querySelector('[data-anim]');
  if (!neu) return;
  const hostNow = neu.getBoundingClientRect();
  const seen = new Set();
  neu.querySelectorAll('.lt-row').forEach(r => {
    const b = before.get(r.dataset.k);
    seen.add(r.dataset.k);
    if (!b) { r.classList.add('lt-in'); return; }
    const n = r.getBoundingClientRect();
    const dx = b.rect.left - n.left, dy = b.rect.top - n.top;
    if (!dx && !dy) return;
    r.style.transition = 'none'; r.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => requestAnimationFrame(() => { r.style.transition = 'transform .7s cubic-bezier(.2,.7,.2,1)'; r.style.transform = ''; }));
  });
  // rows that are gone: a copy stays where it was and fades out, or flies into its group's row
  neu.style.position = 'relative';
  for (const [k, b] of before) {
    if (seen.has(k)) continue;
    const g = b.node; g.classList.add('lt-ghost');
    Object.assign(g.style, { position: 'absolute', left: (b.rect.left - hostNow.left) + 'px', top: (b.rect.top - hostNow.top) + 'px', width: b.rect.width + 'px' });
    neu.appendChild(g);
    const target = merge && merge[k] != null ? neu.querySelector(`.lt-row[data-k="${CSS.escape(String(merge[k]))}"]`) : null;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      g.style.transition = 'transform .7s ease, opacity .7s ease';
      if (target) { const t = target.getBoundingClientRect(); g.style.transform = `translate(${t.left - b.rect.left}px, ${t.top - b.rect.top}px) scale(.96)`; }
      else g.style.transform = 'translateX(40px)';
      g.style.opacity = '0';
    }));
    setTimeout(() => g.remove(), 800);
  }
  void hostRect;
}
