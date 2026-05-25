import { useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { type FieldChangeHandler } from '@/pages/DeckPreview';

interface DraggableSlideElementProps {
  // Position is persisted as `<fieldKey>.x`, `<fieldKey>.y`, `<fieldKey>.w`
  // custom fields — each a percentage of slide width/height. When x+y exist
  // the element renders absolutely positioned. The width is pinned at the
  // moment of drag-start so percentage-sized children (e.g. a logo with
  // `width: 35%` that resolves differently against flex vs slide-root) keep
  // the same visual size between flex flow and absolute mode.
  fieldKey: string;
  customFields: Record<string, string>;
  onFieldChange?: FieldChangeHandler;
  // Classes applied when not positioned (i.e. participating in parent layout).
  // When positioned we drop these and use absolute positioning instead.
  defaultClassName?: string;
  // Additional classes always applied (e.g. width/sizing).
  className?: string;
  // Inline style always applied (e.g. width: 35%).
  style?: React.CSSProperties;
  children: ReactNode;
}

// Pixels of mouse movement before we treat a mousedown as a drag rather than
// a click. Below the threshold we leave the underlying element alone so its
// own click handler (e.g. text edit, button) still fires.
const DRAG_THRESHOLD_PX = 4;

export function DraggableSlideElement({
  fieldKey,
  customFields,
  onFieldChange,
  defaultClassName,
  className,
  style,
  children,
}: DraggableSlideElementProps) {
  const xRaw = customFields[`${fieldKey}.x`];
  const yRaw = customFields[`${fieldKey}.y`];
  const wRaw = customFields[`${fieldKey}.w`];
  const xPct = xRaw !== undefined && xRaw !== '' ? Number(xRaw) : null;
  const yPct = yRaw !== undefined && yRaw !== '' ? Number(yRaw) : null;
  const wPct = wRaw !== undefined && wRaw !== '' ? Number(wRaw) : null;
  const isPositioned =
    xPct !== null && yPct !== null && Number.isFinite(xPct) && Number.isFinite(yPct);
  const hasPersistedW = wPct !== null && Number.isFinite(wPct);

  // Live position during an active drag. Overrides persisted x/y/w so the
  // element follows the pointer without round-tripping every mousemove.
  const [livePos, setLivePos] = useState<{ x: number; y: number; w: number } | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);

  const displayX = livePos ? livePos.x : xPct;
  const displayY = livePos ? livePos.y : yPct;
  const displayW = livePos ? livePos.w : (hasPersistedW ? wPct : null);
  const renderAbsolute = isPositioned || livePos !== null;

  function handleMouseDown(e: MouseEvent<HTMLDivElement>) {
    if (!onFieldChange) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't hijack clicks meant for interactive children (text editor, buttons,
    // inputs). The drag only starts if the pointer crosses DRAG_THRESHOLD_PX.
    if (target.closest('button, input, textarea, select, a, [contenteditable="true"]')) return;

    const slideRoot = elRef.current?.closest('[data-slide-root="true"]') as HTMLElement | null;
    if (!slideRoot || !elRef.current) return;

    const slideRect = slideRoot.getBoundingClientRect();
    const elRect = elRef.current.getBoundingClientRect();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    // Element's current top-left as % of slide. Works whether the element is
    // already absolutely positioned or still in flex flow.
    const startElLeftPct = ((elRect.left - slideRect.left) / slideRect.width) * 100;
    const startElTopPct = ((elRect.top - slideRect.top) / slideRect.height) * 100;
    // Capture the wrapper's visual width as a slide-relative percentage so we
    // can pin it through the flex→absolute transition. Constant for the
    // duration of this drag; ignores any size changes the caller applies.
    const pinnedWPct = (elRect.width / slideRect.width) * 100;

    let dragging = false;

    function handleMove(ev: globalThis.MouseEvent) {
      const dx = ev.clientX - startMouseX;
      const dy = ev.clientY - startMouseY;
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
        dragging = true;
      }
      const newX = startElLeftPct + (dx / slideRect.width) * 100;
      const newY = startElTopPct + (dy / slideRect.height) * 100;
      // Clamp loosely — let the user park things slightly off-slide if they
      // really want, but stop them from losing the element entirely.
      const clampedX = Math.max(-20, Math.min(110, newX));
      const clampedY = Math.max(-20, Math.min(110, newY));
      setLivePos({ x: clampedX, y: clampedY, w: pinnedWPct });
    }

    function handleUp() {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (!dragging) return;
      setLivePos((latest) => {
        if (latest && onFieldChange) {
          onFieldChange('custom', '', `${fieldKey}.x`, latest.x.toFixed(2));
          onFieldChange('custom', '', `${fieldKey}.y`, latest.y.toFixed(2));
          onFieldChange('custom', '', `${fieldKey}.w`, latest.w.toFixed(2));
        }
        return null;
      });
    }

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }

  const draggableCursor = onFieldChange ? 'cursor-move' : '';

  if (renderAbsolute) {
    // Inline `position: absolute` so it wins against any `relative` Tailwind
    // class the caller passed in className (e.g. CoverSlide's logo wrapper
    // uses `relative` to position its hover toolbar — in absolute mode that
    // class would otherwise override us and `left/top` would shift the
    // element off its natural flex slot instead of anchoring to the slide).
    // Caller's style first so our left/top/width win on overlap.
    const absoluteStyle: React.CSSProperties = {
      ...style,
      position: 'absolute',
      left: `${displayX}%`,
      top: `${displayY}%`,
      ...(displayW !== null ? { width: `${displayW}%` } : {}),
    };
    // Invisible spacer preserves the original flex slot so flex-1 siblings
    // (e.g. the map canvas on the Reach slide) don't grow to fill the gap
    // when the element goes absolute. Children render twice but the spacer
    // is hidden + non-interactive, and SlideRichText etc. are controlled by
    // props so there's no state divergence.
    const spacerStyle: React.CSSProperties = {
      ...style,
      visibility: 'hidden',
      pointerEvents: 'none',
    };
    return (
      <>
        <div aria-hidden className={className ?? ''} style={spacerStyle}>
          {children}
        </div>
        <div
          ref={elRef}
          onMouseDown={handleMouseDown}
          className={`${draggableCursor} ${className ?? ''}`}
          style={absoluteStyle}
        >
          {children}
        </div>
      </>
    );
  }

  return (
    <div
      ref={elRef}
      onMouseDown={handleMouseDown}
      className={`${defaultClassName ?? ''} ${draggableCursor} ${className ?? ''}`}
      style={style}
    >
      {children}
    </div>
  );
}

// Helper for callers that want a "reset position" affordance — clears the
// persisted x/y/w so the element returns to its default layout slot and
// natural width.
export function resetSlideElementPosition(
  fieldKey: string,
  onFieldChange: FieldChangeHandler,
) {
  onFieldChange('custom', '', `${fieldKey}.x`, '');
  onFieldChange('custom', '', `${fieldKey}.y`, '');
  onFieldChange('custom', '', `${fieldKey}.w`, '');
}
