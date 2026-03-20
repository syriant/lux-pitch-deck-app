import { useRef, useEffect, useCallback } from 'react';
import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { uploadUrl } from '@/api/upload.api';
import { SlideEditableText } from '../SlideEditableText';
import { SlideImage } from '../SlideImage';

interface ReachSlideProps {
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
  onGalleryAdd?: (url: string) => void;
}

// Verified circle centers via pixel scan of lux-map.png (1936x937)
// Africa has no circle in the image — it's a free-floating label
const CIRCLE_LABELS = [
  { name: 'North\nAmerica',  key: 'North America',  defaultMembers: '1.1M+', cx: 214, cy: 331 },
  { name: 'United\nKingdom', key: 'United Kingdom', defaultMembers: '700k+', cx: 763, cy: 140 },
  { name: 'Europe',          key: 'Europe',         defaultMembers: '180k+', cx: 733, cy: 390 },
  { name: 'Middle\nEast',    key: 'Middle East',    defaultMembers: '50k+',  cx: 1086, cy: 397 },
  { name: 'India',           key: 'India',          defaultMembers: '1M+',   cx: 1202, cy: 646 },
  { name: 'Asia',            key: 'Asia',           defaultMembers: '400k',  cx: 1401, cy: 349 },
  { name: 'Australia',       key: 'Australia',      defaultMembers: '5M+',   cx: 1574, cy: 598 },
  { name: 'New\nZealand',    key: 'New Zealand',    defaultMembers: '400k+', cx: 1813, cy: 758 },
];

const SRC_W = 1936;
const SRC_H = 937;

function drawMapWithLabels(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  customFields?: Record<string, string>,
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

  function drawLabel(name: string, key: string, defaultMembers: string, cx: number, cy: number) {
    const x = ix + cx * sx;
    const y = iy + cy * sy;
    const members = customFields?.[`reach.${key}`] ?? defaultMembers;
    const nameSize = Math.max(12, Math.round(20 * sx));
    const countSize = Math.max(16, Math.round(30 * sx));

    // Name lines
    const lines = name.split('\n');
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
    drawLabel(label.name, label.key, label.defaultMembers, label.cx, label.cy);
  }

  // Africa has no circle in the image — hidden for now
}

export function ReachSlide({ deck, onFieldChange, onGalleryAdd }: ReachSlideProps) {
  const cf = deck?.customFields;
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const bgImgUrl = cf?.['image.reach'] ? uploadUrl(cf['image.reach']) : null;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const redraw = useCallback(() => {
    if (canvasRef.current && imgRef.current) {
      drawMapWithLabels(canvasRef.current, imgRef.current, cf);
    }
  }, [cf]);

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
        {bgImgUrl ? (
          <div className="absolute inset-0" style={{ backgroundImage: `url(${bgImgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        ) : deck && onFieldChange ? (
          <div className="absolute inset-0">
            <SlideImage
              fieldKey="image.reach"
              customFields={cf}
              gallery={deck.gallery}
              onFieldChange={onFieldChange}
              onGalleryAdd={onGalleryAdd}
              className="w-full h-full"
              placeholderText="Select background image"
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#8eb8b0] to-[#c8ddd8]" />
        )}

        {/* White card overlay */}
        <div className="absolute left-[8%] right-[8%] top-[4%] bottom-[4%] bg-white/92 rounded-lg flex flex-col items-center px-[3%] py-[2.5%] overflow-hidden">
          <SlideEditableText
            fieldKey="reach.title"
            defaultValue="Our reach"
            customFields={cf}
            onFieldChange={onFieldChange}
            className="text-lg mb-0.5"
            style={{ fontFamily: 'Arial, "Helvetica Neue", sans-serif' }}
            as="h2"
          />
          <SlideEditableText
            fieldKey="reach.subtitle"
            defaultValue="9 million members globally trust Luxury Escapes"
            customFields={cf}
            onFieldChange={onFieldChange}
            className="text-[11px] text-gray-600 mb-3"
            as="p"
          />

          <canvas ref={canvasRef} className="flex-1 w-full" />
        </div>
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
