import { type FieldChangeHandler } from '@/pages/DeckPreview';

export type Align = 'left' | 'center' | 'right';

const alignItems: { value: Align; icon: React.ReactNode }[] = [
  {
    value: 'left',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="2" width="14" height="1.5" rx=".5" />
        <rect x="1" y="6" width="10" height="1.5" rx=".5" />
        <rect x="1" y="10" width="12" height="1.5" rx=".5" />
        <rect x="1" y="14" width="8" height="1.5" rx=".5" />
      </svg>
    ),
  },
  {
    value: 'center',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="2" width="14" height="1.5" rx=".5" />
        <rect x="3" y="6" width="10" height="1.5" rx=".5" />
        <rect x="2" y="10" width="12" height="1.5" rx=".5" />
        <rect x="4" y="14" width="8" height="1.5" rx=".5" />
      </svg>
    ),
  },
  {
    value: 'right',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="2" width="14" height="1.5" rx=".5" />
        <rect x="5" y="6" width="10" height="1.5" rx=".5" />
        <rect x="3" y="10" width="12" height="1.5" rx=".5" />
        <rect x="7" y="14" width="8" height="1.5" rx=".5" />
      </svg>
    ),
  },
];

interface AlignToggleProps {
  fieldKey: string;
  align: Align;
  onFieldChange: FieldChangeHandler;
}

export function AlignToggle({ fieldKey, align, onFieldChange }: AlignToggleProps) {
  return (
    <div className="flex gap-0.5 rounded bg-black/50 p-0.5">
      {alignItems.map((item) => (
        <button
          type="button"
          key={item.value}
          onClick={() => onFieldChange('custom', '', fieldKey, item.value)}
          className={`p-1.5 rounded transition-colors ${
            align === item.value
              ? 'bg-white text-gray-900'
              : 'text-white/70 hover:text-white'
          }`}
        >
          {item.icon}
        </button>
      ))}
    </div>
  );
}
