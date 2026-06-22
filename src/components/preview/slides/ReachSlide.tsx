import { useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { uploadUrl } from '@/api/upload.api';
import { getReachStats, type ReachStat } from '@/api/reach-stats.api';
import { SlideRichText } from '../SlideRichText';
import { SlideImage } from '../SlideImage';
import { SLIDE_DEFAULTS } from '../slide-defaults';
import { DraggableSlideElement, resetSlideElementPosition } from '../DraggableSlideElement';
import { t, dateLocaleTag } from '../labels';

const TITLE_FIELD_KEY = 'reach.title';
const SUBTITLE_FIELD_KEY = 'reach.subtitle';

function isPositioned(cf: Record<string, string>, fieldKey: string): boolean {
  const x = cf[`${fieldKey}.x`];
  const y = cf[`${fieldKey}.y`];
  return x !== undefined && x !== '' && y !== undefined && y !== '';
}

interface ReachSlideProps {
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
  onGalleryAdd?: (url: string) => void;
}

// Verified circle centers via pixel scan of lux-map.png (1936x937)
// Member counts come from SLIDE_DEFAULTS (key: `reach.{key}`)
// Africa has no circle in the image — it's a free-floating label
const CIRCLE_LABELS = [
  { name: 'North\nAmerica',  key: 'North America',  cx: 214,  cy: 331 },
  { name: 'United\nKingdom', key: 'United Kingdom', cx: 763,  cy: 140 },
  { name: 'Europe',          key: 'Europe',         cx: 733,  cy: 390 },
  { name: 'Middle\nEast',    key: 'Middle East',    cx: 1086, cy: 397 },
  { name: 'India',           key: 'India',          cx: 1202, cy: 646 },
  { name: 'Asia',            key: 'Asia',           cx: 1401, cy: 349 },
  { name: 'Australia',       key: 'Australia',      cx: 1574, cy: 598 },
  { name: 'New\nZealand',    key: 'New Zealand',    cx: 1813, cy: 758 },
];

const SRC_W = 1936;
const SRC_H = 937;

function drawMapWithLabels(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  reachByRegion: Record<string, string>,
  locale?: string,
): void {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) return;
  const ctx = maybeCtx;

  const dpr = window.devicePixelRatio || 1;
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  canvas.width = cw * dpr;
  canvas.height = ch * dpr;
  ctx.scale(dpr, dpr);

  // Fit image with object-contain logic
  const imgAspect = SRC_W / SRC_H;
  const canAspect = cw / ch;
  let iw: number, ih: number, ix: number, iy: number;
  if (canAspect > imgAspect) {
    ih = ch;
    iw = ih * imgAspect;
    ix = (cw - iw) / 2;
    iy = 0;
  } else {
    iw = cw;
    ih = iw / imgAspect;
    ix = 0;
    iy = (ch - ih) / 2;
  }

  ctx.drawImage(img, ix, iy, iw, ih);

  const sx = iw / SRC_W;
  const sy = ih / SRC_H;

  function drawLabel(key: string, cx: number, cy: number) {
    const x = ix + cx * sx;
    const y = iy + cy * sy;
    const fullKey = `reach.${key}`;
    const members = reachByRegion[key] ?? SLIDE_DEFAULTS[fullKey]?.value ?? '';
    const nameSize = Math.max(12, Math.round(20 * sx));
    const countSize = Math.max(16, Math.round(30 * sx));

    // Name lines — translate via key; wrap on whitespace (English names break on \n).
    const lines = t(key, locale).split(/\n|\s+/);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `${nameSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lineH = nameSize * 1.2;
    const totalH = lines.length * lineH + countSize * 1.2;
    const startY = y - totalH / 2 + lineH / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, x, startY + i * lineH);
    });

    // Member count (green)
    ctx.fillStyle = '#00b2a0';
    ctx.font = `bold ${countSize}px Arial, sans-serif`;
    ctx.fillText(members, x, startY + lines.length * lineH + countSize * 0.4);
  }

  // Draw circle labels
  for (const label of CIRCLE_LABELS) {
    drawLabel(label.key, label.cx, label.cy);
  }

  // Africa has no circle in the image — hidden for now
}

export function ReachSlide({ deck, onFieldChange, onGalleryAdd }: ReachSlideProps) {
  const cf = { ...deck?.templateDefaults, ...deck?.customFields };
  const locale = deck?.renderLocale;
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString(dateLocaleTag(deck?.renderLocale), { day: 'numeric', month: 'long', year: 'numeric' });
  const bgImgUrl = cf?.['image.reach'] ? uploadUrl(cf['image.reach']) : null;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const { data: reachStats } = useQuery<ReachStat[]>({
    queryKey: ['reach-stats'],
    queryFn: getReachStats,
    staleTime: 5 * 60 * 1000,
  });

  const reachByRegion = (reachStats ?? []).reduce<Record<string, string>>((acc, r) => {
    acc[r.region] = r.label;
    return acc;
  }, {});

  const globalLabel = reachByRegion['Global'];
  const subtitleDefault = globalLabel
    ? `${globalLabel} members globally trust Luxury Escapes`
    : undefined;

  const titlePositioned = isPositioned(cf, TITLE_FIELD_KEY);
  const subtitlePositioned = isPositioned(cf, SUBTITLE_FIELD_KEY);

  const redraw = useCallback(() => {
    if (canvasRef.current && imgRef.current) {
      drawMapWithLabels(canvasRef.current, imgRef.current, reachByRegion, locale);
    }
  }, [reachByRegion, locale]);

  useEffect(() => {
    const img = new Image();
    img.src = '/lux-map.png';
    img.onload = () => {
      imgRef.current = img;
      redraw();
    };
  }, [redraw]);

  useEffect(() => {
    window.addEventListener('resize', redraw);
    return () => window.removeEventListener('resize', redraw);
  }, [redraw]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 relative">
        {/* Background image */}
        {bgImgUrl && (
          <div className="absolute inset-0" style={{ backgroundImage: `url(${bgImgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        )}
        {deck && onFieldChange && onGalleryAdd && (
          <div className="absolute top-2 right-2 z-10">
            <SlideImage
              fieldKey="image.reach"
              customFields={cf}
              gallery={deck.gallery}
              onFieldChange={onFieldChange}
              onGalleryAdd={onGalleryAdd}
              className="w-8 h-8 rounded"
              placeholderText="+"
            />
          </div>
        )}
        {!bgImgUrl && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#8eb8b0] to-[#c8ddd8]" />
        )}

        {/* White card overlay — data-slide-root="true" makes this the
            positioning context for draggable children. Title/subtitle x/y/w
            overrides are therefore CARD-relative, not slide-relative; the
            PPTX template shifts them by the card's slide offset. */}
        <div data-slide-root="true" className="absolute left-[8%] right-[8%] top-[4%] bottom-[4%] bg-white/92 rounded-lg flex flex-col items-center px-[3%] py-[2.5%] overflow-hidden">
          <DraggableSlideElement
            fieldKey={TITLE_FIELD_KEY}
            customFields={cf}
            onFieldChange={onFieldChange}
            className="mb-0.5 w-full group/title"
          >
            <SlideRichText
              fieldKey="reach.title"
              customFields={cf}
              onFieldChange={onFieldChange}
              style={{ fontFamily: 'Arial, "Helvetica Neue", sans-serif', textAlign: 'center' }}
            />
            {onFieldChange && titlePositioned && (
              <button
                type="button"
                onClick={() => resetSlideElementPosition(TITLE_FIELD_KEY, onFieldChange)}
                className="absolute -top-7 right-0 rounded bg-black/60 px-2 py-1 text-[10px] text-white/90 hover:text-white opacity-0 group-hover/title:opacity-100 transition-opacity"
                title="Move title back to default position"
              >
                ↺ Reset position
              </button>
            )}
          </DraggableSlideElement>
          <DraggableSlideElement
            fieldKey={SUBTITLE_FIELD_KEY}
            customFields={cf}
            onFieldChange={onFieldChange}
            className="mb-3 w-full group/subtitle"
          >
            <SlideRichText
              fieldKey="reach.subtitle"
              defaultValue={subtitleDefault}
              customFields={cf}
              onFieldChange={onFieldChange}
              className="text-gray-600"
              style={{ textAlign: 'center' }}
            />
            {onFieldChange && subtitlePositioned && (
              <button
                type="button"
                onClick={() => resetSlideElementPosition(SUBTITLE_FIELD_KEY, onFieldChange)}
                className="absolute -top-7 right-0 rounded bg-black/60 px-2 py-1 text-[10px] text-white/90 hover:text-white opacity-0 group-hover/subtitle:opacity-100 transition-opacity"
                title="Move subtitle back to default position"
              >
                ↺ Reset position
              </button>
            )}
          </DraggableSlideElement>

          <canvas ref={canvasRef} className="flex-1 w-full" />
        </div>
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
