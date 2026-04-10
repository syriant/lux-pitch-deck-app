import { useRef, useState, useEffect } from 'react';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { RichEditableText } from './RichEditableText';
import { AlignToggle, type Align } from './AlignToggle';
import { FontSizeControl } from './FontSizeControl';
import { SLIDE_DEFAULTS } from './slide-defaults';
import { useSlideEditorContext } from './SlideEditorContext';
import { useDeckRenderContext, substitutePlaceholders } from './DeckRenderContext';

interface SlideRichTextProps {
  fieldKey: string;
  /**
   * Slide-component-level fallback (for interpolated/computed defaults like
   * "...demand in ${destination}..."). When omitted, falls back to SLIDE_DEFAULTS[fieldKey].
   */
  defaultValue?: string;
  defaultSize?: number;
  customFields?: Record<string, string>;
  onFieldChange?: FieldChangeHandler;
  className?: string;
  style?: React.CSSProperties;
}

export function SlideRichText({
  fieldKey,
  defaultValue,
  defaultSize,
  customFields,
  onFieldChange,
  className = '',
  style,
}: SlideRichTextProps) {
  // Resolution: customFields (already merged with templateDefaults) > explicit defaultValue > factory constants
  const factory = SLIDE_DEFAULTS[fieldKey];
  const resolvedDefault = defaultValue ?? factory?.value ?? '';
  const resolvedDefaultSize = defaultSize ?? factory?.size ?? 24;

  const rawValue = customFields?.[fieldKey] || resolvedDefault;
  const align = (customFields?.[`${fieldKey}.align`] as Align) || (style?.textAlign as Align) || 'left';
  const fontSize = Number(customFields?.[`${fieldKey}.size`]) || resolvedDefaultSize;

  // Template editor context — when present, show a reset button on overridden fields
  // and skip placeholder substitution (so the admin sees the raw {key} syntax).
  const editorContext = useSlideEditorContext();
  const deckContext = useDeckRenderContext();
  const isTemplateEditorMode = editorContext.allowedKeys !== undefined;

  // Substitute {hotelName} / {destination} etc. placeholders for real deck rendering.
  const value = isTemplateEditorMode
    ? rawValue
    : substitutePlaceholders(rawValue, deckContext.placeholders);

  const mergedStyle: React.CSSProperties = {
    ...style,
    textAlign: align,
    fontSize: `${fontSize}px`,
  };

  const isOverriddenInTemplate =
    editorContext.templateDefaults?.[fieldKey] !== undefined ||
    editorContext.templateDefaults?.[`${fieldKey}.size`] !== undefined ||
    editorContext.templateDefaults?.[`${fieldKey}.align`] !== undefined;
  const canReset = isOverriddenInTemplate && editorContext.onResetTemplateDefault;

  // In template editor mode, only fields in the allowedKeys whitelist are editable.
  // Fields outside the whitelist render as read-only (no onFieldChange wiring).
  const isAllowedInTemplateEditor =
    !editorContext.allowedKeys || editorContext.allowedKeys.has(fieldKey);
  const effectiveOnFieldChange = isAllowedInTemplateEditor ? onFieldChange : undefined;

  if (!effectiveOnFieldChange) {
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
        onChange={(v) => effectiveOnFieldChange('custom', '', fieldKey, v)}
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
          <AlignToggle fieldKey={`${fieldKey}.align`} align={align} onFieldChange={effectiveOnFieldChange} />
          <FontSizeControl fieldKey={`${fieldKey}.size`} size={fontSize} onFieldChange={effectiveOnFieldChange} />
          {canReset && (
            <button
              type="button"
              onClick={() => editorContext.onResetTemplateDefault?.(fieldKey)}
              className="bg-white border border-gray-300 rounded shadow-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
              title="Reset to factory default"
            >
              ↺ Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
