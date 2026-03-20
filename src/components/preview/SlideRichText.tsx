import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { RichEditableText } from './RichEditableText';

interface SlideRichTextProps {
  fieldKey: string;
  defaultValue: string;
  customFields?: Record<string, string>;
  onFieldChange?: FieldChangeHandler;
  className?: string;
  style?: React.CSSProperties;
}

export function SlideRichText({
  fieldKey,
  defaultValue,
  customFields,
  onFieldChange,
  className = '',
  style,
}: SlideRichTextProps) {
  const value = customFields?.[fieldKey] ?? defaultValue;

  if (!onFieldChange) {
    return (
      <div
        className={`${className} rich-text`}
        style={style}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  return (
    <RichEditableText
      value={value}
      onChange={(v) => onFieldChange('custom', '', fieldKey, v)}
      className={className}
      style={style}
    />
  );
}
