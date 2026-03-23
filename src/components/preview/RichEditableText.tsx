import { useState, useRef, useCallback, useEffect } from 'react';

interface RichEditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}

function FormatButton({ label, cmd, className, onFormat }: { label: React.ReactNode; cmd: string; className?: string; onFormat: (cmd: string) => void }) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onFormat(cmd);
      }}
      className={`px-2 py-1 rounded text-white/80 hover:text-white hover:bg-white/20 text-xs transition-colors ${className ?? ''}`}
      title={cmd.charAt(0).toUpperCase() + cmd.slice(1)}
    >
      {label}
    </button>
  );
}

function FormatToolbar({ onFormat }: { onFormat: (cmd: string) => void }) {
  return (
    <div className="flex gap-0.5 rounded bg-black/60 p-0.5 mb-1">
      <FormatButton label="B" cmd="bold" className="font-bold" onFormat={onFormat} />
      <FormatButton label="U" cmd="underline" className="underline" onFormat={onFormat} />
      <FormatButton label={<span className="bg-[#00b2a0] text-white px-0.5 rounded-sm">H</span>} cmd="highlight" onFormat={onFormat} />
      <FormatButton label="✕" cmd="removeFormat" className="text-white/50" onFormat={onFormat} />
    </div>
  );
}

export function RichEditableText({
  value,
  onChange,
  className = '',
  style,
  placeholder = 'Click to edit',
}: RichEditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Clear local override once props catch up
  useEffect(() => {
    if (localValue !== null && value === localValue) {
      setLocalValue(null);
    }
  }, [value, localValue]);

  useEffect(() => {
    if (editing && editorRef.current) {
      editorRef.current.innerHTML = value;
      editorRef.current.focus();
    }
  }, [editing]); // intentionally exclude value — we set innerHTML only on edit start

  const handleFormat = useCallback((cmd: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    if (cmd === 'removeFormat') {
      const text = range.toString();
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      sel.removeAllRanges();
      return;
    }

    if (range.collapsed) return;

    const tagMap: Record<string, string> = { bold: 'B', underline: 'U', highlight: 'MARK' };
    const tagName = tagMap[cmd];
    if (!tagName) return;

    // Walk up from selection to find if already wrapped in this tag
    let node: Node | null = range.commonAncestorContainer;
    let wrappingEl: HTMLElement | null = null;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === tagName) {
        wrappingEl = node as HTMLElement;
        break;
      }
      node = node.parentNode;
    }

    if (wrappingEl) {
      // Unwrap: replace the element with its contents
      const parent = wrappingEl.parentNode;
      if (parent) {
        while (wrappingEl.firstChild) {
          parent.insertBefore(wrappingEl.firstChild, wrappingEl);
        }
        parent.removeChild(wrappingEl);
        parent.normalize();
      }
      sel.removeAllRanges();
      return;
    }

    const wrapper = document.createElement(tagName);
    if (cmd === 'highlight') {
      wrapper.style.backgroundColor = '#00b2a0';
      wrapper.style.color = '#ffffff';
      wrapper.style.padding = '0 2px';
      wrapper.style.borderRadius = '2px';
    }
    try {
      range.surroundContents(wrapper);
    } catch {
      const fragment = range.extractContents();
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);
    }
    sel.removeAllRanges();
  }, []);

  function readEditorHtml(): string {
    if (!editorRef.current) return value;
    return editorRef.current.innerHTML
      .replace(/<div>/gi, '<br>')
      .replace(/<\/div>/gi, '')
      .replace(/^<br>/, '');
  }

  function commit() {
    const html = readEditorHtml();
    if (html !== value) {
      setLocalValue(html);
      onChange(html);
    }
    setEditing(false);
  }

  function handleBlur(e: React.FocusEvent) {
    // Don't commit if focus moved to another element within our wrapper (e.g. toolbar)
    const related = e.relatedTarget as Node | null;
    if (related && wrapperRef.current?.contains(related)) {
      return;
    }
    // If relatedTarget is null (clicked non-focusable element), use a short delay
    // to check if focus returns to the wrapper (e.g. toolbar mousedown preventDefault)
    if (!related) {
      requestAnimationFrame(() => {
        if (!wrapperRef.current?.contains(document.activeElement)) {
          commit();
        }
      });
      return;
    }
    commit();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      if (editorRef.current) {
        editorRef.current.innerHTML = value;
      }
      setEditing(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand(e.shiftKey ? 'outdent' : 'indent', false);
    }
  }

  if (editing) {
    return (
      <div ref={wrapperRef} className="w-full">
        <FormatToolbar onFormat={handleFormat} />
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`${className} bg-white/80 border border-[#01B18B] rounded px-2 py-1 outline-none ring-1 ring-[#01B18B]/40 min-h-[80px] w-full rich-text`}
          style={{ ...style, color: style?.color ?? '#333' }}
        />
      </div>
    );
  }

  const displayValue = localValue ?? value;
  const hasContent = displayValue && displayValue !== '<br>';

  return (
    <div
      onClick={() => setEditing(true)}
      className={`${className} rich-text cursor-pointer hover:outline hover:outline-1 hover:outline-[#01B18B]/40 hover:outline-offset-2 rounded transition-all ${!hasContent ? 'text-gray-400 italic' : ''}`}
      style={style}
      title="Click to edit"
      dangerouslySetInnerHTML={{ __html: hasContent ? displayValue : placeholder }}
    />
  );
}
