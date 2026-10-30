/* =========================================================
 * book.js — the printed textbooks (PDF, made by ../textbook/)
 * Each Lesson / Unit is a two-page spread. Lesson n of the Beginner
 * volume starts on page 6 + 2n; Unit Ak of the data-analysis
 * volume starts on page 6 + 2(k − 1).
 * ========================================================= */
export const TEXTBOOKS = [
  { key: 'beginner', file: 'book/sql-textbook-beginner.pdf', range: 'Lesson 0–18', mark: 'SQL', ready: true },
  { key: 'intermediate', range: 'Lesson 19–35', mark: 'SQL', ready: false },
  { key: 'advanced', range: 'Lesson 36–48', mark: 'SQL', ready: false },
  { key: 'analysis', file: 'book/data-analysis-textbook.pdf', range: 'Unit A1–A6', mark: 'DATA', ready: true }
];
/** units in the data-analysis textbook (the others come later) */
const ANALYSIS_IN_BOOK = 6;
/** first page of the Lesson in its textbook (null when the textbook is not out yet) */
export function textbookPage(lesson) {
  if (typeof lesson.no === 'string' && /^A\d+$/.test(lesson.no)) {
    const k = +lesson.no.slice(1);
    return k <= ANALYSIS_IN_BOOK ? 6 + 2 * (k - 1) : null;
  }
  return lesson.no >= 0 && lesson.no <= 18 ? 6 + 2 * lesson.no : null;
}
