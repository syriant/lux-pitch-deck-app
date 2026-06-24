/**
 * SYR-70 piece 7 (CJK) — shared slide font stack with a Japanese fallback.
 *
 * Slides render Latin copy in Arial (unchanged); for Japanese decks the CJK
 * glyphs fall through to a JP face. "Noto Sans JP" is self-hosted via @font-face
 * in index.css so it is available in BOTH the browser preview and the
 * server-side PDF (Chromium has no system JP font); "Noto Sans CJK JP" matches
 * the fonts-noto-cjk package if installed on the server; the remaining faces let
 * a user's own OS (Windows/macOS) preview with its native JP font.
 */
export const SLIDE_FONT_STACK =
  'Arial, "Helvetica Neue", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic", "Hiragino Sans", Meiryo, sans-serif';
