import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { EditableText } from './EditableText';

interface SlideEditableTextProps {
  fieldKey: string;
  defaultValue: string;
  customFields?: Record<string, string>;
  onFieldChange?: FieldChangeHandler;
  className?: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div';
  multiline?: boolean;
  placeholder?: string;
}

/**
 * Editable text that reads from customFields (if overridden) or falls back to defaultValue.
 * Saves changes to deck.customFields via the 'custom' entity type.
 */
export function SlideEditableText({
  fieldKey,
  defaultValue,
  customFields,
  onFieldChange,
  className = '',
  as = 'span',
  multiline = false,
  placeholder,
}: SlideEditableTextProps) {
  const value = customFields?.[fieldKey] ?? defaultValue;
  const Tag = as;

  if (!onFieldChange) {
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <EditableText
      value={value}
      onChange={(v) => onFieldChange('custom', '', fieldKey, v)}
      className={className}
      as={as}
      multiline={multiline}
      placeholder={placeholder}
    />
  );
}
