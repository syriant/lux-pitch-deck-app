import { type FullDeck, type DeckOption } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { SlideRichText } from '../SlideRichText';
import { SlideImage } from '../SlideImage';
import { t, optionColumnLabel, dateLocaleTag } from '../labels';

const GREEN = '#00b2a0';

interface CampaignOptionsSlideProps {
  deck: FullDeck;
  onFieldChange?: FieldChangeHandler;
  onGalleryAdd?: (url: string) => void;
}

function buildOptionSummary(opt: DeckOption, index: number, hasSelected: boolean, locale?: string): string {
  const label = opt.tierLabel || optionColumnLabel(index + 1, locale);
  const tbc = t('details to be confirmed', locale);
  // No rows selected for this option — keep the bullet but blank the detail,
  // matching the "keep the column, show empty" choice from Step 2.
  if (!hasSelected) return `<strong>${label}:</strong> ${tbc}`;
  const parts: string[] = [];
  if (opt.roomType) parts.push(opt.roomType);
  if (opt.nights) parts.push(`${opt.nights} ${opt.nights > 1 ? t('nights', locale) : t('night', locale)}`);
  if (opt.sellPrice) parts.push(`${t('from', locale)} $${Number(opt.sellPrice).toLocaleString()}`);
  if (opt.inclusions?.length) parts.push(`${t('includes', locale)} ${opt.inclusions.join(', ')}`);
  return `<strong>${label}:</strong> ${parts.join(' · ') || tbc}`;
}

function buildBodyFromOptions(options: DeckOption[], locale?: string): string {
  const sorted = [...options].sort((a, b) => a.optionNumber - b.optionNumber);
  // Group by optionNumber. Pick the first SELECTED row as the representative so
  // the summary reflects the user's Step 2 ticks; fall back to the first row
  // when none are selected so the option label still appears.
  const seen = new Map<number, { rep: DeckOption; hasSelected: boolean }>();
  for (const opt of sorted) {
    const cur = seen.get(opt.optionNumber);
    if (!cur) {
      seen.set(opt.optionNumber, { rep: opt, hasSelected: opt.selected });
    } else if (!cur.hasSelected && opt.selected) {
      seen.set(opt.optionNumber, { rep: opt, hasSelected: true });
    }
  }
  const unique = Array.from(seen.values());

  const optionLines = unique
    .map(({ rep, hasSelected }, i) => `<li>${buildOptionSummary(rep, i, hasSelected, locale)}</li>`)
    .join('\n');

  const optWord = unique.length === 1 ? t('option', locale) : t('options', locale);
  const intro = t('From reviewing your rates in market and applied learnings from recent campaigns we have prepared {n} tailored {opt} for your review.', locale)
    .replace('{n}', String(unique.length)).replace('{opt}', optWord);

  return `${intro}

<ul style="padding-left:20px;margin:8px 0">
${optionLines}
</ul>`;
}

function buildFallbackBody(locale?: string): string {
  const intro = t('From reviewing your rates in market and applied learnings from recent campaigns I have prepared three tailored options for your review.', locale);
  const tbc = t('details to be confirmed', locale);
  const items = [1, 2, 3]
    .map((n) => `<li><strong>${optionColumnLabel(n, locale)}:</strong> ${tbc}</li>`)
    .join('\n');
  return `${intro}

<ul style="padding-left:20px;margin:8px 0">
${items}
</ul>`;
}

export function CampaignOptionsSlide({ deck, onFieldChange, onGalleryAdd }: CampaignOptionsSlideProps) {
  const cf = { ...deck?.templateDefaults, ...deck?.customFields };
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const allOptions = deck.properties.flatMap((p) => p.options);
  const locale = deck?.renderLocale;
  const bodyDefault = allOptions.length > 0 ? buildBodyFromOptions(allOptions, locale) : buildFallbackBody(locale);
  const date = new Date().toLocaleDateString(dateLocaleTag(deck?.renderLocale), { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: '#dff0ee' }}>
      <div className="flex-1 flex p-[4%] gap-[3%]">
        {/* Left column — headline + body text */}
        <div className="flex-1 flex flex-col">
          {onFieldChange && cf?.['campOpt.body'] && allOptions.length > 0 && (
            <button
              type="button"
              onClick={() => onFieldChange('custom', '', 'campOpt.body', bodyDefault)}
              className="mb-2 text-[10px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer"
              title="Reset body text to match current deal options"
            >
              Refresh from options
            </button>
          )}

          <SlideRichText
            fieldKey="campOpt.headline"
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
          <span className="text-[10px] text-gray-600 ml-1"><strong>{t('updated', deck?.renderLocale)}</strong> {date}</span>
        </div>
        <div className="flex items-center gap-3">
          <img src="/le-logo-white.svg" alt="Luxury Escapes" className="h-3.5 invert" />
        </div>
      </div>
    </div>
  );
}
