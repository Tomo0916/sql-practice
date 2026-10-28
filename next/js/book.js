/* =========================================================
 * book.js — the printed textbooks (PDF, made by ../textbook/)
 * Each Lesson is a two-page spread; Lesson n of the Beginner
 * volume starts on page 6 + 2n.
 * ========================================================= */
export const TEXTBOOKS = [
  { key: 'beginner', file: 'book/sql-textbook-beginner.pdf', from: 0, to: 18, ready: true },
  { key: 'intermediate', from: 19, to: 35, ready: false },
  { key: 'advanced', from: 36, to: 48, ready: false }
];
/** first page of the Lesson in its textbook (null when the textbook is not out yet) */
export function textbookPage(lesson) {
  return lesson.no >= 0 && lesson.no <= 18 ? 6 + 2 * lesson.no : null;
}
