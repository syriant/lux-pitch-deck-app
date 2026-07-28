import { type FieldChangeHandler } from '@/pages/DeckPreview';

interface FontSizeControlProps {
  fieldKey: string;
  size: number;
  min?: number;
  max?: number;
  step?: number;
  onFieldChange: FieldChangeHandler;
}

// One-decimal snap: keeps fractional steps (the tactical table control steps by
// 0.5) while cleaning float artefacts (e.g. a stored 22.880000000000003) so
// they can't persist or display.
function snap(v: number): number {
  return Math.round(v * 10) / 10;
}

export function FontSizeControl({ fieldKey, size, min = 6, max = 72, step = 1, onFieldChange }: FontSizeControlProps) {
  return (
    <div className="flex items-center gap-0.5 rounded bg-black/50 p-0.5">
      <button
        type="button"
        onClick={() => onFieldChange('custom', '', fieldKey, String(snap(Math.max(min, size - step))))}
        className="px-2 py-1 rounded text-white/70 hover:text-white text-sm font-bold transition-colors"
      >
        A−
      </button>
      <span className="px-1.5 py-1 text-[10px] text-white/60 tabular-nums">{snap(size)}</span>
      <button
        type="button"
        onClick={() => onFieldChange('custom', '', fieldKey, String(snap(Math.min(max, size + step))))}
        className="px-2 py-1 rounded text-white/70 hover:text-white text-sm font-bold transition-colors"
      >
        A+
      </button>
    </div>
  );
}
