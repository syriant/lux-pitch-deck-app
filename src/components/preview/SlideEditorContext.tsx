import { createContext, useContext } from 'react';

/**
 * When a slide is rendered inside the admin Templates editor (not a regular deck preview),
 * this context provides extra capabilities like a "reset to factory" button on overridden fields.
 *
 * Regular deck previews don't provide this context — `SlideRichText` reads `useContext`
 * and gets the empty default, so the editor-only UI affordances stay hidden.
 */
export interface SlideEditorContextValue {
  /**
   * The map of currently-overridden template defaults. When a fieldKey is present here,
   * SlideRichText knows the value has been overridden by the admin and shows a reset button.
   */
  templateDefaults?: Record<string, string>;
  /** Called when the admin clicks the reset button on a templated field. */
  onResetTemplateDefault?: (fieldKey: string) => void;
  /**
   * Whitelist of fieldKeys that are allowed to be edited in the template editor.
   * Fields not in this set render as read-only (no hover tooltip, no edit cursor,
   * no persistence). Used to prevent edits to dynamic per-deck keys (like
   * `obj.primary.{id}`, `caseStudy.{id}.title`, etc.) and computed defaults
   * (like `obj.secondary.all`, `campOpt.body`) that can't meaningfully live in
   * template defaults.
   */
  allowedKeys?: Set<string>;
}

export const SlideEditorContext = createContext<SlideEditorContextValue>({});

export function useSlideEditorContext(): SlideEditorContextValue {
  return useContext(SlideEditorContext);
}
