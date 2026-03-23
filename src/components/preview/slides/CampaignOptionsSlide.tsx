import { type FullDeck, type DeckOption } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { SlideRichText } from '../SlideRichText';
import { SlideImage } from '../SlideImage';

const GREEN = '#00b2a0';

interface CampaignOptionsSlideProps {
  deck: FullDeck;
  onFieldChange?: FieldChangeHandler;
  onGalleryAdd?: (url: string) => void;
}

const ORDINALS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];

function buildOptionSummary(opt: DeckOption, index: number): string {
  const label = opt.tierLabel || `Option ${ORDINALS[index] ?? index + 1}`;
  const parts: string[] = [];
  if (opt.roomType) parts.push(opt.roomType);
  if (opt.nights) parts.push(`${opt.nights} night${opt.nights > 1 ? 's' : ''}`);
  if (opt.sellPrice) parts.push(`from $${Number(opt.sellPrice).toLocaleString()}`);
  if (opt.inclusions?.length) parts.push(`includes ${opt.inclusions.join(', ')}`);
  return `<strong>${label}:</strong> ${parts.join(' · ') || 'details to be confirmed'}`;
}

function buildBodyFromOptions(options: DeckOption[]): string {
  const sorted = [...options].sort((a, b) => a.optionNumber - b.optionNumber);
  // Group by optionNumber to get unique options (multiple room types per option)
  const seen = new Map<number, DeckOption>();
  for (const opt of sorted) {
    if (!seen.has(opt.optionNumber)) seen.set(opt.optionNumber, opt);
  }
  const unique = Array.from(seen.values());

  const optionLines = unique
    .map((opt, i) => `<li>${buildOptionSummary(opt, i)}</li>`)
    .join('\n');

  return `From reviewing your rates in market and applied learnings from recent campaigns we have prepared ${unique.length} tailored option${unique.length !== 1 ? 's' : ''} for your review.

<ul style="padding-left:20px;margin:8px 0">
${optionLines}
</ul>`;
}

const fallbackBody = `From reviewing your rates in market and applied learnings from recent campaigns I have prepared three tailored options for your review.

<ul style="padding-left:20px;margin:8px 0">
<li><strong>Option One:</strong> details to be confirmed</li>
<li><strong>Option Two:</strong> details to be confirmed</li>
<li><strong>Option Three:</strong> details to be confirmed</li>
</ul>`;

const defaultFooter = `<strong>Rates provided are inclusive of taxes and fees, and Luxury Escapes' marketing investment.</strong>`;

export function CampaignOptionsSlide({ deck, onFieldChange, onGalleryAdd }: CampaignOptionsSlideProps) {
  const cf = deck?.customFields;
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const allOptions = deck.properties.flatMap((p) => p.options);
  const bodyDefault = allOptions.length > 0 ? buildBodyFromOptions(allOptions) : fallbackBody;
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: '#dff0ee' }}>
      <div className="flex-1 flex p-[4%] gap-[3%]">
        {/* Left column — headline + body text */}
        <div className="flex-1 flex flex-col">
          {onFieldChange && cf?.['campOpt.body'] && allOptions.length > 0 && (
            <button
              onClick={() => onFieldChange('custom', '', 'campOpt.body', bodyDefault)}
              className="mb-2 text-[10px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer"
              title="Reset body text to match current deal options"
            >
              Refresh from options
            </button>
          )}

          <SlideRichText
            fieldKey="campOpt.headline"
            defaultValue="Your tailored campaign options"
            defaultSize={28}
            customFields={cf}
            onFieldChange={onFieldChange}
            className="font-bold leading-snug mb-3"
            style={{ color: GREEN }}
          />

          <SlideRichText
            fieldKey="campOpt.body"
            defaultValue={bodyDefault}
            defaultSize={13}
            customFields={cf}
            onFieldChange={onFieldChange}
            className="leading-[1.5] flex-1"
            style={{ color: '#333' }}
          />

          <SlideRichText
            fieldKey="campOpt.footer"
            defaultValue={defaultFooter}
            defaultSize={14}
            customFields={cf}
            onFieldChange={onFieldChange}
            className="leading-snug mt-3"
            style={{ color: '#333' }}
          />
        </div>

        {/* Right column — hotel image */}
        <SlideImage
          fieldKey="image.campaignOptions"
          customFields={cf}
          gallery={deck?.gallery}
          onFieldChange={onFieldChange}
          onGalleryAdd={onGalleryAdd}
          className="w-[35%] h-[90%] overflow-hidden"
          placeholderText="Hotel photo"
        />
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-[3%] py-2 bg-white/70">
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-bold text-gray-900">{hotelName}</span>
          <span className="text-[10px] text-gray-600 ml-1"><strong>updated</strong> {date}</span>
        </div>
        <div className="flex items-center gap-3">
          <img src="/le-logo-white.svg" alt="Luxury Escapes" className="h-3.5 invert" />
        </div>
      </div>
    </div>
  );
}
