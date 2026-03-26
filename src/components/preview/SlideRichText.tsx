import { useRef, useState, useEffect } from 'react';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { RichEditableText } from './RichEditableText';
import { AlignToggle, type Align } from './AlignToggle';
import { FontSizeControl } from './FontSizeControl';

interface SlideRichTextProps {
  fieldKey: string;
  defaultValue: string;
  defaultSize?: number;
  customFields?: Record<string, string>;
  onFieldChange?: FieldChangeHandler;
  className?: string;
  style?: React.CSSProperties;
}

export function SlideRichText({
  fieldKey,
  defaultValue,
  defaultSize = 24,
  customFields,
  onFieldChange,
  className = '',
  style,
}: SlideRichTextProps) {
  const value = customFields?.[fieldKey] || defaultValue;
  const align = (customFields?.[`${fieldKey}.align`] as Align) || (style?.textAlign as Align) || 'left';
  const fontSize = Number(customFields?.[`${fieldKey}.size`]) || defaultSize;

  const mergedStyle: React.CSSProperties = {
    ...style,
    textAlign: align,
    fontSize: `${fontSize}px`,
  };

  if (!onFieldChange) {
    return (
      <div
        className={`${className} rich-text`}
        style={mergedStyle}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!hovered || !wrapperRef.current) {
      setPos(null);
      return;
    }
    const rect = wrapperRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setPos({
      left: rect.left,
      top: spaceBelow > 40 ? rect.bottom + 4 : rect.top - 32,
    });
  }, [hovered]);

  function handleEnter() {
    clearTimeout(hideTimer.current);
    setHovered(true);
  }

  function handleLeave() {
    hideTimer.current = setTimeout(() => setHovered(false), 500);
  }

  return (
    <div
      ref={wrapperRef}
      className="w-full relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <RichEditableText
        value={value}
        onChange={(v) => onFieldChange('custom', '', fieldKey, v)}
        className={className}
        style={mergedStyle}
      />
      {hovered && pos && (
        <div
          className="fixed z-50 flex gap-2"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          <AlignToggle fieldKey={`${fieldKey}.align`} align={align} onFieldChange={onFieldChange} />
          <FontSizeControl fieldKey={`${fieldKey}.size`} size={fontSize} onFieldChange={onFieldChange} />
        </div>
      )}
    </div>
  );
}
