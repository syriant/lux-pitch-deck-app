import { useState, useRef, useEffect } from 'react';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div';
  placeholder?: string;
  multiline?: boolean;
}

export function EditableText({
  value,
  onChange,
  className = '',
  style,
  as: Tag = 'span',
  placeholder = 'Click to edit',
  multiline = false,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft.trim() !== value) {
      onChange(draft.trim());
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !multiline) {
      commit();
    }
    if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
  }

  if (editing) {
    const inputClasses = `${className} bg-white/80 border border-[#01B18B] rounded px-1 outline-none ring-1 ring-[#01B18B]/40`;

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className={`${inputClasses} resize-none w-full`}
          style={style}
          rows={5}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={inputClasses}
        style={style}
      />
    );
  }

  return (
    <Tag
      onClick={() => setEditing(true)}
      className={`${className} cursor-pointer hover:outline hover:outline-1 hover:outline-[#01B18B]/40 hover:outline-offset-2 rounded transition-all ${!value ? 'text-gray-400 italic' : ''}`}
      style={style}
      title="Click to edit"
    >
      {value || placeholder}
    </Tag>
  );
}
