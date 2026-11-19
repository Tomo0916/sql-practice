/* =========================================================
 * lecture-topics.js — what a lesson's problems use, as short topic names.
 * A lecture must cover every topic its lesson's problems can have
 * (slides and frames say `covers: [...]`); tools-next/check.mjs builds
 * many problems of each lesson and fails when a topic is not covered.
 * So when a lesson gets a new kind of problem, add its topic here and
 * a slide for it in the lecture.
 * ========================================================= */
const dirOf = ord => (ord === 'desc' || ord === 'za' ? 'desc' : 'asc');

export const TOPICS = {
  intro: p => [`read.${p.q}`],                               // value, which, col, rows, cols
  select: () => ['columns'],
  types: () => ['text', 'number'],
  alias: p => ['as', /\+/.test(p.expr) ? 'calc.plus' : /\* \d/.test(p.expr) ? 'calc.times' : 'calc.columns'],
  where: p => [`${typeof p.v === 'string' ? 'text' : 'num'}.${p.op}`],
  andor: p => [p.w],                                         // and, or, not
  between: p => [p.list ? 'in' : 'between'],
  like: () => ['contains'],
  null: p => [p.isn === 'IS NULL' ? 'isnull' : 'notnull'],
  orderby: p => [dirOf(p.ord), ...(p.two ? ['two'] : [])],
  distinct: p => ['distinct', dirOf(p.ord)],
  limit: p => ['limit', dirOf(p.ord), ...(p.skip ? ['offset'] : [])],
  insert: p => [p.cols.split(',').length > 4 ? 'cols.all' : 'cols.some'],
  update: p => [p.w],                                        // one (a value for one row), many (a calculation for several rows)
  delete: p => [p.c === 'id' ? 'id' : typeof p.v === 'string' ? 'text' : `cmp.${p.op}`],
  aggfn: p => ['count', p.f],                                // SUM, AVG, MAX, MIN
  groupby: p => ['group', p.f],
  having: p => [`having.${p.f}`],                            // COUNT, SUM, AVG, MAX, MIN
  wherehaving: () => ['where+having'],
  innercols: p => [p.rc === p.text ? 'right.text' : 'right.num'],   // which column of the right table is shown
  leftorder: p => ['limit', dirOf(p.ord)],
  // Lessons 19–28, 35, 36: one topic per kind of problem
  case: p => [p.x2 ? 'three' : 'two'],
  calc: p => [p.v],                                          // tax, ratio, avg
  coalesce: p => [p.v],                                      // fill, count
  strfn: p => [p.v],                                         // upper, len, substr, concat
  dates: p => [p.v],                                         // range, month, plus
  sub1: p => [p.v],                                          // gt, lt, max, min
  subin: p => [p.not ? 'notin' : 'in'],
  subfrom: p => [p.v],                                       // avgsum, maxsum, maxcnt, minavg
  with: p => [p.v],                                          // avg, big
  window: p => [p.v],                                        // rank, part, run, avg
  join3: p => [p.v],                                         // three, threeWhere, self, selfLeft, cross
  setops: p => [p.op.toLowerCase()],                         // union, intersect, except
};
/** the topics of one problem (lessons not listed yet: one topic, "main") */
export const topicsOf = (lessonKey, p) => (TOPICS[lessonKey] ? TOPICS[lessonKey](p) : ['main']);
