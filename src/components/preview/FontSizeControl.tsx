import { type FieldChangeHandler } from '@/pages/DeckPreview';

interface FontSizeControlProps {
  fieldKey: string;
  size: number;
  min?: number;
  max?: number;
  step?: number;
  onFieldChange: FieldChangeHandler;
}

export function FontSizeControl({ fieldKey, size, min = 14, max = 72, step = 2, onFieldChange }: FontSizeControlProps) {
  return (
    <div className="flex items-center gap-0.5 rounded bg-black/50 p-0.5">
      <button
        onClick={() => onFieldChange('custom', '', fieldKey, String(Math.max(min, size - step)))}
        className="px-2 py-1 rounded text-white/70 hover:text-white text-sm font-bold transition-colors"
      >
        A−
      </button>
      <span className="px-1.5 py-1 text-[10px] text-white/60 tabular-nums">{size}</span>
      <button
        onClick={() => onFieldChange('custom', '', fieldKey, String(Math.min(max, size + step)))}
        className="px-2 py-1 rounded text-white/70 hover:text-white text-sm font-bold transition-colors"
      >
        A+
      </button>
    </div>
  );
}
