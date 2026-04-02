import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getFullDeck, type FullDeck } from '@/api/decks.api';
import { buildSlideList, type SlideDefinition } from '@/components/preview/slide-types';
import { SlideRenderer } from '@/components/preview/SlideRenderer';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Print-optimized page that renders all visible slides sequentially.
 * Used by Puppeteer on the API server to generate pixel-perfect PDFs.
 * Accepts ?token=JWT for authentication when opened by Puppeteer.
 */
export function DeckPrint() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [deck, setDeck] = useState<FullDeck | null>(null);
  const [slides, setSlides] = useState<SlideDefinition[]>([]);
  const [ready, setReady] = useState(false);

  // If a token is provided via query param (Puppeteer), set it in auth store
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      useAuthStore.setState({ accessToken: token, isAuthenticated: true });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const d = await getFullDeck(id);
        setDeck(d);

        const allSlides = buildSlideList(d);
        // Filter out hidden slides
        let hiddenSlideIds: string[] = [];
        try {
          const raw = d.customFields?.['hiddenSlides'];
          if (raw) hiddenSlideIds = JSON.parse(raw);
        } catch { /* ignore */ }
        setSlides(allSlides.filter((s) => !hiddenSlideIds.includes(s.id)));
        setReady(true);
      } catch (err) {
        console.error('Failed to load deck for print', err);
      }
    })();
  }, [id]);

  if (!ready || !deck) {
    return <div id="print-loading">Loading...</div>;
  }

  return (
    <>
      {/* Reset body styles for print */}
      <style>{`
        html, body, #root {
          margin: 0 !important;
          padding: 0 !important;
          width: 1024px !important;
          overflow: visible !important;
          background: white !important;
        }
        @media print {
          html, body, #root {
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-slide {
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
          .print-slide:last-child {
            page-break-after: auto !important;
          }
        }
      `}</style>
      <div id="print-ready">
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="print-slide"
            style={{
              width: 1024,
              height: 576,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <SlideRenderer slide={slide} deck={deck} />
          </div>
        ))}
      </div>
    </>
  );
}
