import { type DeckPropertyFull, type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { EditableText } from '../EditableText';
import { SlideEditableText } from '../SlideEditableText';

const GREEN = '#00b2a0';
const MINT = '#dff0ee';

interface RegionStatsSlideProps {
  property?: DeckPropertyFull;
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
}

export function RegionStatsSlide({ property, deck, onFieldChange }: RegionStatsSlideProps) {
  const destination = property?.destination ?? property?.propertyName ?? 'Your Destination';
  const cf = deck?.customFields;
  const propKey = property?.id ?? 'empty';

  const metrics = [
    { icon: '🛏️', key: `region.${propKey}.roomNights`, def: '80 – 250', label: 'room nights per campaign' },
    { icon: '📅', key: `region.${propKey}.alos`, def: '3.35 days', label: 'ALOS' },
    { icon: '🌍', key: `region.${propKey}.intl`, def: '68%', label: 'bookings from international markets' },
    { icon: '📆', key: `region.${propKey}.window`, def: '95 days', label: 'booking window' },
    { icon: '👫', key: `region.${propKey}.demo`, def: '79% couples\n21% families', label: '' },
    { icon: '⬆️', key: `region.${propKey}.upgrade`, def: '45%', label: 'of members upgraded their packages' },
  ];

  return (
    <div className="h-full w-full flex" style={{ backgroundColor: MINT }}>
      <div className="flex-1 p-[5%] flex flex-col">
        <div className="mb-4">
          {property && onFieldChange ? (
            <EditableText
              value={destination}
              onChange={(v) => onFieldChange('property', property.id, 'destination', v)}
              className="text-xl font-bold leading-snug"
              as="h2"
            />
          ) : (
            <h2 className="text-xl font-bold leading-snug" style={{ color: '#333' }}>{destination}</h2>
          )}
          <h2 className="text-xl italic font-light" style={{ color: '#333' }}>
            & <span style={{ color: GREEN }}>Luxury Escapes</span>
          </h2>
        </div>

        <SlideEditableText
          fieldKey={`region.${propKey}.narrative`}
          defaultValue={`Consistent campaigns drive significant increases in production, showing the impact of keeping the destination top of mind and inspiring travelers to choose ${destination} for their next getaway.`}
          customFields={cf}
          onFieldChange={onFieldChange}
          className="text-[10px] leading-relaxed mb-5"
          as="p"
          multiline
        />

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
          {metrics.map((m) => (
            <div key={m.key} className="flex items-start gap-2">
              <span className="text-lg">{m.icon}</span>
              <div>
                <SlideEditableText
                  fieldKey={m.key}
                  defaultValue={m.def}
                  customFields={cf}
                  onFieldChange={onFieldChange}
                  className="text-xs font-bold whitespace-pre-line"
                  as="div"
                />
                {m.label && <div className="text-[9px]" style={{ color: '#777' }}>{m.label}</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto border-t pt-2" style={{ borderColor: GREEN }}>
          <p className="text-[9px] font-semibold" style={{ color: GREEN }}>Market Coverage</p>
          <SlideEditableText
            fieldKey={`region.${propKey}.coverage`}
            defaultValue={`Maximum two ${destination} hotels featured per month`}
            customFields={cf}
            onFieldChange={onFieldChange}
            className="text-[9px]"
            as="p"
          />
        </div>
      </div>

      <div className="w-[42%]" style={{
        background: 'linear-gradient(180deg, #a3c4bd, #8eb8b0, #c8ddd8)',
      }}>
        <div className="h-full w-full flex items-center justify-center text-white/50 text-xs">Destination photo</div>
      </div>
    </div>
  );
}
