/* =========================================================
 * editor.js — CodeMirror 6 SQL editor
 * autocomplete for the problem's tables/columns, Ctrl/⌘+Enter to run,
 * wavy underline at the position of an error.
 * ========================================================= */
import {
  EditorView, keymap, placeholder as cmPlaceholder, Decoration, EditorState, StateEffect, StateField,
  defaultKeymap, history, historyKeymap, indentWithTab, sql, SQLite, SQLDialect, autocompletion, completionKeymap,
  closeBrackets, closeBracketsKeymap, syntaxHighlighting, HighlightStyle, bracketMatching, tags
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

/**
 * @param {HTMLElement} parent
 * @param {{doc:string, schema:Object<string,string[]>, placeholder:string, label:string, onChange:Function, onRun:Function}} o
 */
export function createEditor(parent, o) {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: o.doc || '',
      extensions: [
        history(),
        closeBrackets(),
        bracketMatching(),
        sql({ dialect: Dialect, schema: o.schema || {}, upperCaseKeywords: true }),
        autocompletion({ activateOnTyping: true, icons: false }),
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
        EditorView.updateListener.of(u => { if (u.docChanged && o.onChange) o.onChange(u.state.doc.toString()); })
      ]
    })
  });
  return {
    view,
    get: () => view.state.doc.toString(),
    set(text) { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, selection: { anchor: text.length } }); },
    /** insert at the cursor; `back` moves the cursor left afterwards (e.g. inside quotes) */
    insert(text, back) {
      const { from, to } = view.state.selection.main;
      const before = view.state.doc.sliceString(Math.max(0, from - 1), from);
      const pad = before && !/\s|\(/.test(before) && !/^[,.)]/.test(text) ? ' ' : '';
      const ins = pad + text;
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
