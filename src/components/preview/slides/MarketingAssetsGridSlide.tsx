import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { type DeckPropertyFull, type FullDeck, type DeckOption } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { t, dateLocaleTag } from '../labels';
import { getDealTierRules, type DealTierRule } from '@/api/deal-tiers.api';
import { SlideRichText } from '../SlideRichText';

const GREEN = '#00b2a0';
const MINT = '#dff0ee';
const RED = '#d44a4a';

interface MarketingAssetsGridSlideProps {
  property?: DeckPropertyFull;
  deck?: FullDeck;
  // Pre-chunked subset of channels for this slide (set by buildSlideList).
  // When omitted, the component computes the full channel list itself —
  // backwards-compat path for slide defs predating pagination.
  channels?: string[];
  onFieldChange?: FieldChangeHandler;
}

function groupByOption(options: DeckOption[]): Map<number, DeckOption[]> {
  const map = new Map<number, DeckOption[]>();
  for (const opt of options) {
    const group = map.get(opt.optionNumber) ?? [];
    group.push(opt);
    map.set(opt.optionNumber, group);
  }
  return map;
}

// Find the deal-tier rules for a property's grade + destination, indexed by tier
// (1, 2, 3). Falls back to grade-only matching if no destination match exists.
function findRulesByTier(rules: DealTierRule[], property: DeckPropertyFull): Record<number, DealTierRule | undefined> {
  if (!property.grade) return {};
  const sameGrade = rules.filter((r) => r.grade === property.grade);
  let matches = sameGrade;
  if (property.destination) {
    const exact = sameGrade.filter((r) => r.destination === property.destination);
    if (exact.length > 0) matches = exact;
    else {
      const partial = sameGrade.filter(
        (r) => property.destination!.toLowerCase().includes(r.destination.toLowerCase())
          || r.destination.toLowerCase().includes(property.destination!.toLowerCase()),
      );
      if (partial.length > 0) matches = partial;
    }
  }
  const byTier: Record<number, DealTierRule | undefined> = {};
  for (const tier of [1, 2, 3] as const) {
    byTier[tier] = matches.find((r) => r.tier === tier);
  }
  return byTier;
}

function CheckIcon({ cls = 'w-8 h-8' }: { cls?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${cls} mx-auto`} aria-label="Included">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke={GREEN} strokeWidth="1.5" />
      <path
        d="M7 12.5l3.2 3.2L17 9"
        fill="none"
        stroke={GREEN}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon({ cls = 'w-8 h-8' }: { cls?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${cls} mx-auto`} aria-label="Not included">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke={RED} strokeWidth="1.5" />
      <path
        d="M8 8l8 8M16 8l-8 8"
        fill="none"
        stroke={RED}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MarketingAssetsGridSlide({ property, deck, channels: chunkedChannels, onFieldChange }: MarketingAssetsGridSlideProps) {
  const cf = { ...deck?.templateDefaults, ...deck?.customFields };
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString(dateLocaleTag(deck?.renderLocale), { day: 'numeric', month: 'long', year: 'numeric' });

  const { data: rules = [], isLoading } = useQuery<DealTierRule[]>({
    queryKey: ['deal-tier-rules'],
    queryFn: getDealTierRules,
    staleTime: 5 * 60 * 1000,
  });

  const hasOptions = property && property.options.length > 0;
  const rulesByTier = property ? findRulesByTier(rules, property) : {};

  const groups = property ? groupByOption(property.options) : new Map<number, DeckOption[]>();
  const optNums = Array.from(groups.keys()).sort();
  const optionLabels = optNums.map((num) => {
    const first = groups.get(num)![0];
    return first.tierLabel ?? `Option ${num === 1 ? 'One' : num === 2 ? 'Two' : 'Three'}`;
  });

  // Channels are normally pre-chunked by buildSlideList (so the slide strip
  // and rendered slide agree on pagination). Compute here if not provided.
  const channels = chunkedChannels ?? (() => {
    const set = new Set<string>();
    for (const tier of [1, 2, 3] as const) {
      const rule = rulesByTier[tier];
      if (rule) for (const ch of Object.keys(rule.assetEntitlements)) set.add(ch);
    }
    return Array.from(set).filter((ch) =>
      optNums.some((num) => groups.get(num)![0].marketingAssets?.[ch] === true),
    );
  })();

  // Marketing Assets is capped at 2 slides, so a heavy deck can put more than
  // the comfortable 6 channels on one slide. Scale the text/padding/ticks down
  // by row count so the table still fits the fixed slide height.
  const rowCount = channels.length;
  // Global text-size modifier for the whole grid (50–200%). fontPx is the table
  // base size (channel names + column headers inherit it), so scaling it + the
  // description default covers all the slide's text.
  const propId = property?.id ?? 'empty';
  const textScale = Math.min(200, Math.max(50, Number(cf[`mktgAssets.${propId}.textScale`]) || 100));
  const scale = textScale / 100;
  const fontPx = Math.round((rowCount <= 7 ? 9 : rowCount <= 10 ? 8 : rowCount <= 13 ? 7 : 6) * scale);
  const descSize = Math.round(9 * scale);
  const cellPad = rowCount <= 7 ? 12 : rowCount <= 10 ? 4 : rowCount <= 13 ? 3 : 2;
  const iconCls = rowCount <= 7 ? 'w-8 h-8' : rowCount <= 10 ? 'w-6 h-6' : rowCount <= 13 ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      <div className="px-[5%] pt-[4%] pb-3 flex items-start justify-between">
        <SlideRichText
          fieldKey="mktgAssets.headline"
          defaultValue="Marketing Assets"
          defaultSize={20}
          customFields={cf}
          onFieldChange={onFieldChange}
          className="font-bold"
          style={{ color: GREEN }}
        />
        {onFieldChange && (
          <div className="flex items-center gap-1 ml-2 shrink-0" title="Scale all text on this slide">
            <button
              type="button"
              onClick={() => onFieldChange('custom', '', `mktgAssets.${propId}.textScale`, String(Math.max(50, textScale - 10)))}
              className="text-[11px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer"
            >
              A−
            </button>
            <span className="text-[10px] text-gray-500 w-9 text-center tabular-nums">{textScale}%</span>
            <button
              type="button"
              onClick={() => onFieldChange('custom', '', `mktgAssets.${propId}.textScale`, String(Math.min(200, textScale + 10)))}
              className="text-[11px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer"
            >
              A+
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 mx-[5%] mb-[5%] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <p className="text-sm text-gray-400">{t('Loading deal tier rules...', deck?.renderLocale)}</p>
        </div>
      ) : !hasOptions ? (
        <div className="flex-1 mx-[5%] mb-[5%] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-400">{t('No deal options configured', deck?.renderLocale)}</p>
            <p className="text-[10px] text-gray-300 mt-1">{t('Upload a pricing tool in the wizard (Step 2)', deck?.renderLocale)}</p>
          </div>
        </div>
      ) : channels.length === 0 ? (
        <div className="flex-1 mx-[5%] mb-[5%] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-400">{t('No marketing assets selected', deck?.renderLocale)}</p>
            <p className="text-[10px] text-gray-300 mt-1">{t("Tick assets per option in Step 6, or set the property's grade and destination if no entitlements load", deck?.renderLocale)}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 px-[5%] pb-2 overflow-hidden">
          {(() => {
            // Asset name + description live in the left column; each option
            // column only shows ✓/✗. Pin column widths with table-fixed so
            // chunked slides line up at the same boundaries.
            const optionColPct = 18;
            const labelColPct = 100 - optionColPct * optNums.length;
            return (
          <table className="w-full border-collapse table-fixed" style={{ fontSize: fontPx }}>
            <colgroup>
              <col style={{ width: `${labelColPct}%` }} />
              {optNums.map((num) => (
                <col key={num} style={{ width: `${optionColPct}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="p-2 text-left" />
                {optionLabels.map((label, i) => (
                  <th
                    key={i}
                    className="p-3 text-center font-bold text-white"
                    style={{ backgroundColor: GREEN, borderLeft: '2px solid white' }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.map((channel, ri) => {
                const rowBg = ri % 2 === 0 ? 'bg-[#edf7f5]' : 'bg-white';
                // Pick the first non-empty description across the 3 tiers.
                // Today they're consistent across tiers; if that ever changes,
                // we'd need to revisit this consolidation.
                let description = '';
                for (const tier of [1, 2, 3] as const) {
                  const v = rulesByTier[tier]?.assetEntitlements?.[channel];
                  if (v && v.trim() && !/^(✓|yes|y)$/i.test(v.trim())) { description = v; break; }
                }
                const slug = slugify(channel);
                // Channel name is translatable per deck (i18n overlay populates the .name key).
                const channelName = cf?.[`mktgAssets.${property!.id}.${slug}.name`] || channel;
                return (
                  <tr key={channel}>
                    <td className={`align-top ${rowBg}`} style={{ padding: cellPad }}>
                      <div className="font-bold mb-0.5" style={{ color: GREEN }}>{channelName}</div>
                      {description && (
                        <SlideRichText
                          fieldKey={`mktgAssets.${property!.id}.${slug}.desc`}
                          defaultValue={description}
                          defaultSize={descSize}
                          customFields={cf}
                          onFieldChange={onFieldChange}
                          className="text-left"
                          style={{ color: '#1a1a1a' }}
                        />
                      )}
                    </td>
                    {optNums.map((num, ci) => {
                      const rep = groups.get(num)![0];
                      const included = rep.marketingAssets?.[channel] === true;
                      const cellKey = `mktgAssets.${property!.id}.${slugify(channel)}.opt${num}`;
                      return (
                        <td
                          key={ci}
                          className={`align-middle text-center ${rowBg}`}
                          style={{ borderLeft: '2px solid white', padding: cellPad }}
                        >
                          <MarketingAssetCell
                            included={included}
                            fieldKey={cellKey}
                            customFields={cf}
                            defaultSize={fontPx}
                            onFieldChange={onFieldChange}
                            iconCls={iconCls}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
            );
          })()}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-[3%] py-2 bg-white/70 mt-auto">
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

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// A marketing-assets grid cell. The big ✓/✗ icon (driven by the option's
// Step-6 marketingAssets flag) always shows by default, so it can never be
// "lost". A PCM can add an optional caption beneath it (e.g. "2–4 hero
// position") or hide the icon for a text-only cell — both reversible via the
// hover toolbar. The caption (keyed per channel+option) and the `.hideIcon`
// flag flow to the PPTX/PDF export. Edit affordances only render when
// onFieldChange is set (i.e. not in the print/export path).
function MarketingAssetCell({
  included,
  fieldKey,
  customFields,
  defaultSize,
  onFieldChange,
  iconCls,
}: {
  included: boolean;
  fieldKey: string;
  customFields?: Record<string, string>;
  defaultSize: number;
  onFieldChange?: FieldChangeHandler;
  iconCls: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [adding, setAdding] = useState(false);

  const raw = customFields?.[fieldKey] ?? '';
  // Older versions seeded the override with a bare ✓/✕ glyph to enter edit
  // mode; treat those (and empty/<br>/whitespace) as "no caption" so the icon
  // shows through instead of a stray glyph.
  const captionEmpty = !raw.trim() || raw.trim() === '<br>' || /^(?:✓|✕|✗|&nbsp;|\s)+$/i.test(raw.trim());
  const hasCaption = !captionEmpty;
  const hideIcon = customFields?.[`${fieldKey}.hideIcon`] === 'true';
  const icon = included ? <CheckIcon cls={iconCls} /> : <CrossIcon cls={iconCls} />;

  const caption = (
    <SlideRichText
      fieldKey={fieldKey}
      defaultValue=""
      defaultSize={defaultSize}
      customFields={customFields}
      onFieldChange={onFieldChange}
      className="min-h-[1.1em]"
      style={{ textAlign: 'center' }}
    />
  );

  // Static (export/print) path — no editing affordances.
  if (!onFieldChange) {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5">
        {!hideIcon && icon}
        {hasCaption && caption}
      </div>
    );
  }

  // Show the caption editor when there's text, while adding a note, or when the
  // icon is hidden with nothing else — so the cell is never blank.
  const showCaption = hasCaption || adding || (hideIcon && captionEmpty);

  return (
    <div
      className="relative w-full flex flex-col items-center justify-center gap-0.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!hideIcon && icon}
      {showCaption && caption}
      {hovered && (
        <div className="absolute -top-2 right-0 z-10 flex gap-1">
          {!showCaption && (
            <button
              type="button"
              title="Add a note beneath the icon"
              onClick={() => setAdding(true)}
              className="rounded border border-gray-300 bg-white px-1 py-0.5 text-[9px] leading-none text-gray-600 shadow hover:bg-gray-50"
            >
              + note
            </button>
          )}
          {(hasCaption || adding) && (
            <button
              type="button"
              title="Remove the note (revert to the icon)"
              onClick={() => { onFieldChange('custom', '', fieldKey, ''); setAdding(false); }}
              className="rounded border border-gray-300 bg-white px-1 py-0.5 text-[9px] leading-none text-gray-600 shadow hover:bg-gray-50"
            >
              − note
            </button>
          )}
          <button
            type="button"
            title={hideIcon ? 'Show the tick/cross icon' : 'Hide the icon (text only)'}
            onClick={() => onFieldChange('custom', '', `${fieldKey}.hideIcon`, hideIcon ? '' : 'true')}
            className="rounded border border-gray-300 bg-white px-1 py-0.5 text-[9px] leading-none text-gray-600 shadow hover:bg-gray-50"
          >
            {hideIcon ? 'Show icon' : 'Hide icon'}
          </button>
        </div>
      )}
    </div>
  );
}
