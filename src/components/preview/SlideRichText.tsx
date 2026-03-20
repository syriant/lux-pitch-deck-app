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
  const value = customFields?.[fieldKey] ?? defaultValue;
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

  return (
    <div className="group/text w-full relative">
      <RichEditableText
        value={value}
        onChange={(v) => onFieldChange('custom', '', fieldKey, v)}
        className={className}
        style={mergedStyle}
      />
      <div className="absolute left-0 top-full z-10 flex gap-2 mt-1 opacity-0 group-hover/text:opacity-100 transition-opacity">
        <AlignToggle fieldKey={`${fieldKey}.align`} align={align} onFieldChange={onFieldChange} />
        <FontSizeControl fieldKey={`${fieldKey}.size`} size={fontSize} onFieldChange={onFieldChange} />
      </div>
    </div>
  );
}
