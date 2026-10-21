import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, snippet, snippetCompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { bracketMatching, foldGutter, foldKeymap, HighlightStyle, indentOnInput, indentUnit, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { linter, lintGutter, type Diagnostic } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers, placeholder as cmPlaceholder } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { API, FIELDS } from '../lib/pluginKit';

export interface CodeEditorHandle {
  /** puts a snippet (with ${fields}) at the cursor, on a line of its own */
  insertSnippet(template: string): void;
  /** puts the cursor on a line (1 = the first) and selects it */
  goto(line: number): void;
  focus(): void;
}

/** the colours come from the theme: the editor dresses like the rest of the app */
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: 'var(--code-keyword)' },
  { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--code-string)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--code-number)' },
  { tag: [t.lineComment, t.blockComment], color: 'var(--code-comment)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--code-function)' },
  { tag: [t.propertyName], color: 'var(--code-property)' },
  { tag: [t.definition(t.variableName)], color: 'var(--code-definition)' },
  { tag: [t.operator, t.punctuation, t.bracket], color: 'var(--code-punct)' },
]);

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: 'var(--code-size, 13.5px)', background: 'transparent', color: 'var(--fg)' },
  '.cm-scroller': { fontFamily: 'var(--font-mono, ui-monospace, monospace)', lineHeight: '1.6' },
  '.cm-content': { caretColor: 'var(--accent)', padding: '10px 0' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '.cm-gutters': { background: 'transparent', color: 'var(--fg-faint)', border: 'none', borderRight: '1px solid var(--border)' },
  '.cm-activeLine': { background: 'color-mix(in srgb, var(--accent) 7%, transparent)' },
  '.cm-activeLineGutter': { background: 'transparent', color: 'var(--accent)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { background: 'color-mix(in srgb, var(--accent) 28%, transparent) !important' },
  '.cm-matchingBracket': { background: 'color-mix(in srgb, var(--accent) 22%, transparent)', outline: 'none' },
  '.cm-selectionMatch': { background: 'color-mix(in srgb, var(--accent) 14%, transparent)' },
  '.cm-tooltip': { background: 'var(--material-solid, var(--bg-elev))', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' },
  '.cm-tooltip-autocomplete > ul > li': { padding: '3px 10px', fontFamily: 'var(--font-mono, ui-monospace, monospace)' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { background: 'var(--accent)', color: 'var(--accent-fg)' },
  '.cm-completionDetail': { fontStyle: 'normal', opacity: 0.7, marginLeft: '8px' },
  '.cm-completionInfo': { padding: '8px 10px', maxWidth: '320px', fontFamily: 'inherit', lineHeight: '1.45' },
  '.cm-snippetField': { background: 'color-mix(in srgb, var(--accent) 16%, transparent)', borderRadius: '3px' },
  '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy var(--danger, #d24)' },
  '.cm-lintRange-warning': { backgroundImage: 'none', textDecoration: 'underline wavy var(--warning, #c90)' },
  '.cm-diagnostic': { fontFamily: 'inherit' },
  '.cm-panels': { background: 'var(--bg-elev)', color: 'var(--fg)' },
  '.cm-foldPlaceholder': { background: 'var(--fill)', border: 'none', color: 'var(--fg-faint)' },
});

/** `thevtt.`, `state.` and `entry.`: what can come after the dot */
function apiCompletions(ctx: CompletionContext): CompletionResult | null {
  const m = ctx.matchBefore(/(thevtt|state|entry)\.\w*$/);
  if (m) {
    const [obj] = m.text.split('.');
    const from = m.from + obj!.length + 1;
    if (obj === 'thevtt')
      return {
        from,
        options: API.map((a) => snippetCompletion(a.snippet, { label: a.name, detail: a.signature.replace(/^\w+/, ''), info: a.doc, type: a.name === 'state' ? 'property' : 'function', boost: 2 })),
        validFor: /^\w*$/,
      };
    return { from, options: FIELDS[obj!]!.map((f) => ({ label: f.name, info: f.doc, type: 'property' })), validFor: /^\w*$/ };
  }
  // at the start of a word: `thevtt` itself, and whole pieces by their Italian name
  const word = ctx.matchBefore(/\w+$/);
  if (!word && !ctx.explicit) return null;
  return {
    from: word?.from ?? ctx.pos,
    options: [
      { label: 'thevtt', type: 'variable', info: 'Tutto quello che l’estensione può fare', boost: 3 },
      snippetCompletion("thevtt.command('${nome}', '${Cosa fa}', (args, state) => {\n\t${}\n});", { label: 'comando', detail: 'nuovo /comando', type: 'keyword' }),
      snippetCompletion("thevtt.button('${Etichetta}', (state) => {\n\t${}\n});", { label: 'pulsante', detail: 'sulla barra delle macro', type: 'keyword' }),
      snippetCompletion("thevtt.on('log', (entry) => {\n\t${}\n});", { label: 'quando', detail: 'reagisce alla chat', type: 'keyword' }),
    ],
    validFor: /^\w*$/,
  };
}

const KNOWN = new Set(API.map((a) => a.name));

/** syntax mistakes as you type, and `thevtt.` names that don't exist */
const checks = linter(
  (view) => {
    const out: Diagnostic[] = [];
    syntaxTree(view.state).iterate({
      enter: (n) => {
        if (n.type.isError) {
          const from = Math.max(0, Math.min(n.from, view.state.doc.length - 1));
          out.push({ from, to: Math.max(from + 1, n.to), severity: 'error', message: 'Qui qualcosa non torna: manca una parentesi, una virgola o delle virgolette?' });
        }
      },
    });
    const text = view.state.doc.toString();
    for (const m of text.matchAll(/thevtt\.(\w+)/g)) {
      if (!KNOWN.has(m[1]!)) out.push({ from: m.index!, to: m.index! + m[0].length, severity: 'warning', message: `thevtt.${m[1]} non esiste. Puoi usare: ${[...KNOWN].join(', ')}` });
    }
    if (!/^\s*\/\/\s*@name\s+\S/m.test(text)) out.push({ from: 0, to: Math.min(1, text.length), severity: 'warning', message: 'Manca il nome: aggiungi in cima // @name Nome' });
    return out;
  },
  { delay: 350 },
);

/** A pleasant JavaScript editor for extensions. */
export const CodeEditor = forwardRef<CodeEditorHandle, { value: string; onChange(v: string): void; onSave?(): void; label: string; placeholder?: string }>(function CodeEditor(
  { value, onChange, onSave, label, placeholder },
  ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // the latest callbacks, without rebuilding the editor
  const cb = useRef({ onChange, onSave });
  cb.current = { onChange, onSave };

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          foldGutter(),
          lintGutter(),
          history(),
          drawSelection(),
          indentOnInput(),
          indentUnit.of('  '),
          EditorState.tabSize.of(2),
          bracketMatching(),
          closeBrackets(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          javascript(),
          javascriptLanguage.data.of({ autocomplete: apiCompletions }),
          autocompletion({ activateOnTyping: true, icons: false }),
          syntaxHighlighting(highlight),
          checks,
          theme,
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': label, spellcheck: 'false', autocapitalize: 'off' }),
          ...(placeholder ? [cmPlaceholder(placeholder)] : []),
          keymap.of([
            { key: 'Mod-s', preventDefault: true, run: () => (cb.current.onSave?.(), true) },
            ...closeBracketsKeymap,
            ...completionKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...defaultKeymap,
            indentWithTab,
          ]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) cb.current.onChange(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // a value from outside (a template, the header form): replace without losing the undo history
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  useImperativeHandle(ref, () => ({
    insertSnippet(template: string) {
      const v = view.current;
      if (!v) return;
      const { from } = v.state.selection.main;
      const line = v.state.doc.lineAt(from);
      // on an empty line where the cursor is, otherwise on a new line after it
      const blank = !line.text.trim();
      const at = blank ? line.from : line.to;
      const prefix = blank ? '' : '\n';
      snippet(prefix + template)(v, null, at, blank ? line.to : at);
      v.focus();
    },
    goto(n: number) {
      const v = view.current;
      if (!v) return;
      const line = v.state.doc.line(Math.min(Math.max(1, n), v.state.doc.lines));
      v.dispatch({ selection: { anchor: line.from, head: line.to }, scrollIntoView: true });
      v.focus();
    },
    focus() {
      view.current?.focus();
    },
  }));

  return <div ref={host} className="code-editor" translate="no" />;
});
