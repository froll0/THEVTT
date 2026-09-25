import { Placeholder } from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import {
  Bold,
  Columns3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Rows3,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { useEffect } from 'react';

/**
 * Rich text for journals, notes and recaps: stored as HTML. Anything shown is
 * parsed through the editor's schema, so only the formatting it knows about
 * (headings, emphasis, lists, tables…) ever reaches the page.
 */

const BLOCK_START = /^\s*<(p|h[1-6]|ul|ol|table|blockquote|hr|pre|div)[\s>/]/i;

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Older plain-text content becomes paragraphs. */
export function toHtml(value: string): string {
  if (!value) return '';
  if (BLOCK_START.test(value)) return value;
  return value
    .split('\n')
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

/** The words of a rich text, for previews and search. */
export function plainText(value: string): string {
  if (!value || !BLOCK_START.test(value)) return value ?? '';
  // DOMParser builds an inert document: nothing in it runs or loads
  const doc = new DOMParser().parseFromString(value.replace(/<\/(p|h[1-6]|li|tr|blockquote)>/gi, '$& '), 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

const extensions = (placeholder?: string) => [
  StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }),
  TableKit.configure({ table: { resizable: false } }),
  ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
];

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive('heading', { level: 1 }) ? 'h1' : e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3' : 'p',
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      table: e.isActive('table'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();
  const btn = (label: string, on: boolean, run: () => void, icon: React.ReactNode, disabled = false) => (
    <button type="button" className={`rt-btn ${on ? 'on' : ''}`} title={label} aria-label={label} aria-pressed={on} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={run}>
      {icon}
    </button>
  );
  return (
    <div className="rt-toolbar" role="toolbar" aria-label="Formattazione">
      <select
        className="rt-select"
        aria-label="Stile del paragrafo"
        value={s.block}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'p') chain().setParagraph().run();
          else chain().setHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
        }}
      >
        <option value="p">Paragrafo</option>
        <option value="h1">Titolo</option>
        <option value="h2">Sottotitolo</option>
        <option value="h3">Titoletto</option>
      </select>
      <span className="rt-sep" />
      {btn('Grassetto (Ctrl+B)', s.bold, () => chain().toggleBold().run(), <Bold size={14} />)}
      {btn('Corsivo (Ctrl+I)', s.italic, () => chain().toggleItalic().run(), <Italic size={14} />)}
      {btn('Sottolineato (Ctrl+U)', s.underline, () => chain().toggleUnderline().run(), <UnderlineIcon size={14} />)}
      {btn('Barrato', s.strike, () => chain().toggleStrike().run(), <Strikethrough size={14} />)}
      <span className="rt-sep" />
      {btn('Elenco puntato', s.bullet, () => chain().toggleBulletList().run(), <List size={14} />)}
      {btn('Elenco numerato', s.ordered, () => chain().toggleOrderedList().run(), <ListOrdered size={14} />)}
      {btn('Citazione', s.quote, () => chain().toggleBlockquote().run(), <Quote size={14} />)}
      {btn('Linea di separazione', false, () => chain().setHorizontalRule().run(), <Minus size={14} />)}
      <span className="rt-sep" />
      {btn('Inserisci tabella', s.table, () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), <TableIcon size={14} />, s.table)}
      {s.table && (
        <>
          {btn('Aggiungi riga', false, () => chain().addRowAfter().run(), <Rows3 size={14} />)}
          {btn('Aggiungi colonna', false, () => chain().addColumnAfter().run(), <Columns3 size={14} />)}
          <button type="button" className="rt-btn text" onMouseDown={(e) => e.preventDefault()} onClick={() => chain().deleteRow().run()}>
            − riga
          </button>
          <button type="button" className="rt-btn text" onMouseDown={(e) => e.preventDefault()} onClick={() => chain().deleteColumn().run()}>
            − colonna
          </button>
          {btn('Elimina tabella', false, () => chain().deleteTable().run(), <Trash2 size={14} />)}
        </>
      )}
      <span className="rt-grow" />
      {btn('Annulla (Ctrl+Z)', false, () => chain().undo().run(), <Undo2 size={14} />, !s.canUndo)}
      {btn('Ripeti (Ctrl+Y)', false, () => chain().redo().run(), <Redo2 size={14} />, !s.canRedo)}
    </div>
  );
}

/** A word-processor-like editor. Remount it (key) to load another document. */
export function RichEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  ariaLabel,
  className = '',
  onReady,
}: {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  /** hands out the editor, for commands from outside the toolbar */
  onReady?: (editor: Editor) => void;
}) {
  const editor = useEditor({
    extensions: extensions(placeholder),
    content: toHtml(value),
    editorProps: { attributes: { class: 'rt-content', 'aria-label': ariaLabel ?? 'Testo', role: 'textbox', 'aria-multiline': 'true' } },
    // an empty document reads as empty, not as an empty paragraph
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
    onBlur: () => onBlur?.(),
  });
  useEffect(() => {
    if (editor) onReady?.(editor);
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!editor) return null;
  return (
    <div className={`rt ${className}`}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="rt-scroll" />
    </div>
  );
}

/** Rich text for reading. */
export function RichView({ value, className = '' }: { value: string; className?: string }) {
  const editor = useEditor({ extensions: extensions(), content: toHtml(value), editable: false, editorProps: { attributes: { class: 'rt-content' } } });
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.commands.setContent(toHtml(value), { emitUpdate: false });
  }, [editor, value]);
  if (!editor) return null;
  return <EditorContent editor={editor} className={`rt-view ${className}`} />;
}
