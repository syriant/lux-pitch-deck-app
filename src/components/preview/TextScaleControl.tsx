import { type FieldChangeHandler } from '@/pages/DeckPreview';

/**
 * Clamp a stored per-slide text scale (integer percent, stored as a string in
 * customFields) to 50–200, defaulting to 100. The API templates mirror this in
 * brand.ts readTextScale — keep the two in sync.
 */
export function readTextScale(customFields: Record<string, string> | undefined, fieldKey: string): number {
  return Math.min(200, Math.max(50, Number(customFields?.[fieldKey]) || 100));
}

/**
 * The shared A− / % / A+ cluster for per-slide text scaling. Renders nothing
 * outside edit mode. Each slide stores its own `<prefix>.textScale` key; the
 * matching PPTX template reads the same key. Excluded from reset-edits wipes
 * by convention (see DealOptionsSlide).
 */
export function TextScaleControl({
  fieldKey,
  customFields,
  onFieldChange,
  title,
  label,
}: {
  fieldKey: string;
  customFields?: Record<string, string>;
  onFieldChange?: FieldChangeHandler;
  title?: string;
  /** Tiny prefix label — for slides with more than one scale control. */
  label?: string;
}) {
  if (!onFieldChange) return null;
  const scale = readTextScale(customFields, fieldKey);
  return (
    <div className="flex items-center gap-1" title={title ?? 'Scale all text on this slide'}>
      {label && <span className="text-[10px] text-gray-500">{label}</span>}
      <button
        type="button"
        onClick={() => onFieldChange('custom', '', fieldKey, String(Math.max(50, scale - 10)))}
        className="text-[11px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer"
      >
        A−
      </button>
      <span className="text-[10px] text-gray-500 w-9 text-center tabular-nums">{scale}%</span>
      <button
        type="button"
        onClick={() => onFieldChange('custom', '', fieldKey, String(Math.min(200, scale + 10)))}
        className="text-[11px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer"
      >
        A+
      </button>
    </div>
  );
}
