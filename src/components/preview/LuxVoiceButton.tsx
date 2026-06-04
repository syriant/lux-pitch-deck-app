import { useState, useRef, useEffect, useCallback } from 'react';
import { rewriteVoice } from '@/api/voice.api';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface LuxVoiceButtonProps {
  fieldKey: string;
  /** Current (placeholder-substituted) HTML shown in the field. */
  currentValue: string;
  /** Whether a pre-rewrite original has been captured (enables revert). */
  hasStoredOriginal: boolean;
  deckId?: string;
  hotelName?: string;
  destination?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Apply a chosen suggestion to the field. */
  onApply: (text: string) => void;
  /** Restore the captured original. */
  onRevert: () => void;
}

const POPOVER_WIDTH = 340;

export function LuxVoiceButton({
  fieldKey,
  currentValue,
  hasStoredOriginal,
  deckId,
  hotelName,
  destination,
  open,
  onOpenChange,
  onApply,
  onRevert,
}: LuxVoiceButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxBodyH: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [variations, setVariations] = useState<string[]>([]);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await rewriteVoice({
        fieldKey,
        text: currentValue,
        // Only send a real (persisted) deck id. The template-preview editor
        // uses a sentinel id ('template-preview'); sending it would record a
        // non-UUID deckId in llm_usage and break the usage admin's deck lookup.
        deckId: deckId && UUID_RE.test(deckId) ? deckId : undefined,
        hotelName: hotelName || undefined,
        destination: destination || undefined,
      });
      setVariations(res.variations);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, [fieldKey, currentValue, deckId, hotelName, destination]);

  // On open: anchor the popover and fetch suggestions once.
  useEffect(() => {
    if (!open) return;
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 12));
      const top = rect.bottom + 6;
      // Room remaining below the button minus header + bottom gutter. Without
      // this the body's max-h: 55vh ignores how far down the button sits, so
      // the 3rd suggestion gets clipped below the viewport when the button is
      // mid-page.
      const HEADER_H = 42;
      const BOTTOM_GUTTER = 16;
      const maxBodyH = Math.max(160, window.innerHeight - top - HEADER_H - BOTTOM_GUTTER);
      setPos({ top, left, maxBodyH });
    }
    if (variations.length === 0 && !loading && !error) {
      void fetchSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (popRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      onOpenChange(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        className="bg-white border border-gray-300 rounded shadow-md px-2 py-1 text-xs text-[#00897b] hover:bg-[#dff0ee] hover:text-[#00695f] cursor-pointer font-medium whitespace-nowrap"
        title="Rewrite in the LUX voice"
      >
        ✨ LUX voice
      </button>

      {open && pos && (
        <div
          ref={popRef}
          className="fixed z-[60] bg-white border border-gray-200 rounded-lg shadow-xl text-left"
          style={{ top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">✨ LUX voice suggestions</span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="p-3 overflow-y-auto space-y-2" style={{ maxHeight: pos.maxBodyH }}>
            {loading && (
              <div className="py-6 text-center text-sm text-gray-500">Applying the LUX voice…</div>
            )}

            {!loading && error && (
              <div className="text-sm text-red-600">
                {error}
                <button
                  type="button"
                  onClick={() => void fetchSuggestions()}
                  className="ml-2 underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error &&
              variations.map((variation, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onApply(variation)}
                  className="block w-full text-left border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 hover:border-[#00b2a0] hover:bg-[#dff0ee]/40 cursor-pointer rich-text"
                  title="Use this version"
                  dangerouslySetInnerHTML={{ __html: variation }}
                />
              ))}

            {!loading && !error && variations.length === 0 && (
              <div className="py-4 text-center text-sm text-gray-500">No suggestions returned.</div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => void fetchSuggestions()}
              disabled={loading}
              className="text-xs text-gray-600 hover:text-gray-900 cursor-pointer disabled:opacity-50"
            >
              ↻ Regenerate
            </button>
            {hasStoredOriginal && (
              <button
                type="button"
                onClick={onRevert}
                className="text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
                title="Revert to the original text"
              >
                ↺ Revert to original
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function extractMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const data = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message;
    if (typeof data === 'string') return data;
    if (Array.isArray(data) && typeof data[0] === 'string') return data[0];
  }
  return 'Could not generate suggestions. Please try again.';
}
