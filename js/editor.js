/* =========================================================
 * editor.js — CodeMirror 6 SQL editor
 * autocomplete for the problem's tables/columns, Ctrl/⌘+Enter to run,
 * wavy underline at the position of an error.
 * ========================================================= */
import {
  EditorView, keymap, placeholder as cmPlaceholder, Decoration, EditorState, StateEffect, StateField,
  defaultKeymap, history, historyKeymap, indentWithTab, sql, SQLite, SQLDialect, autocompletion, completionKeymap,
  closeBrackets, closeBracketsKeymap, syntaxHighlighting, HighlightStyle, bracketMatching, tags, python
} from '../vendor/codemirror.js';

const style = HighlightStyle.define([
  { tag: tags.keyword, class: 'tok-kw' },
  { tag: [tags.string, tags.special(tags.string)], class: 'tok-str' },
  { tag: tags.number, class: 'tok-num' },
  { tag: [tags.function(tags.variableName), tags.standard(tags.name)], class: 'tok-fn' },
  { tag: tags.comment, class: 'muted' },
  { tag: tags.invalid, class: 'tok-bad' }
]);

/* only the words students need — keeps autocomplete short and relevant */
const Dialect = SQLDialect.define(Object.assign({}, SQLite.spec, {
  keywords: 'select from where and or not in is null like between distinct order by asc desc limit offset group having as join inner left on',
  builtin: 'count sum avg max min',
  types: ''
}));

const setMark = StateEffect.define();
const markField = StateField.define({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) if (e.is(setMark)) deco = e.value;
    if (tr.docChanged) deco = Decoration.none;
    return deco;
  },
  provide: f => EditorView.decorations.from(f)
});
const errMark = Decoration.mark({ class: 'cm-err' });
const indentUnit4 = EditorState.tabSize.of(4);

/**
 * @param {HTMLElement} parent
 * @param {{lang?:'python', doc:string, schema:Object<string,string[]>, placeholder:string, label:string, onChange:Function, onRun:Function}} o
 */
/* where the cursor was in each problem's editor (o.key): kept when the page is drawn again, so a quick-input button
 * still goes where the student put the cursor; touched = the student has clicked or typed in it */
const cursors = new Map();
/* a quick-input button does not take the focus from the editor (the cursor stays; on a tablet the keyboard stays open) */
if (typeof document !== 'undefined') document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('.kw-chip') && document.activeElement && document.activeElement.closest && document.activeElement.closest('.cm-editor')) e.preventDefault(); }, true);
export function createEditor(parent, o) {
  const doc0 = o.doc || '', kept = o.key ? cursors.get(o.key) : null;
  const sel0 = kept && kept.doc === doc0 ? { anchor: Math.min(kept.anchor, doc0.length), head: Math.min(kept.head, doc0.length) } : undefined;
  let touched = !!(kept && kept.doc === doc0 && kept.touched);
  const remember = st => { if (o.key) { const m = st.selection.main; cursors.set(o.key, { anchor: m.anchor, head: m.head, touched, doc: st.doc.toString() }); } };
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: doc0, selection: sel0,
      extensions: [
        history(),
        closeBrackets(),
        bracketMatching(),
        ...(o.lang === 'python' ? [python(), indentUnit4] : [sql({ dialect: Dialect, schema: o.schema || {}, upperCaseKeywords: true }), autocompletion({ activateOnTyping: true, icons: false })]),
        syntaxHighlighting(style),
        markField,
        cmPlaceholder(o.placeholder || ''),
        EditorView.lineWrapping,
        keymap.of([
          { key: 'Mod-Enter', run: () => { o.onRun && o.onRun(); return true; } },
          { key: 'Shift-Enter', run: () => { o.onRun && o.onRun(); return true; } },
          ...closeBracketsKeymap, ...completionKeymap, ...historyKeymap, indentWithTab, ...defaultKeymap
        ]),
        EditorView.contentAttributes.of({ 'aria-label': o.label || 'SQL', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' }),
        EditorView.domEventHandlers({ mousedown: () => { touched = true; }, touchstart: () => { touched = true; }, keydown: () => { touched = true; } }),
        EditorView.updateListener.of(u => { if (u.docChanged && o.onChange) o.onChange(u.state.doc.toString()); if (u.docChanged || u.selectionSet) remember(u.state); })
      ]
    })
  });
  return {
    view,
    get: () => view.state.doc.toString(),
    set(text) { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, selection: { anchor: text.length } }); },
    /** insert at the cursor; `back` moves the cursor left afterwards (e.g. inside quotes) */
    insert(text, back) {
      let { from, to } = view.state.selection.main;
      if (!touched && from === 0 && to === 0 && view.state.doc.length) {   // never clicked or typed into: add at the end (before the last ;)
        const doc = view.state.doc.toString(), end = doc.replace(/\s*;?\s*$/, '').length; from = to = end;
      }
      const before = view.state.doc.sliceString(Math.max(0, from - 1), from);
      const pad = o.lang !== 'python' && before && !/\s|\(/.test(before) && !/^[,.)]/.test(text) ? ' ' : '';   // Python: exactly as given (df[ "a" ] …)
      const ins = pad + text;
      touched = true;
      view.dispatch({ changes: { from, to, insert: ins }, selection: { anchor: from + ins.length - (back || 0) } });
      view.focus();
    },
    mark(from, to) {
      const len = view.state.doc.length;
      if (from == null || from >= len) { view.dispatch({ effects: setMark.of(Decoration.none) }); return; }
      view.dispatch({ effects: setMark.of(Decoration.set([errMark.range(from, Math.min(len, Math.max(from + 1, to)))])) });
    },
    focus: () => view.focus(),
    destroy: () => view.destroy()
  };
}
