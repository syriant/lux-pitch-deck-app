// === Luxury Escapes — Brand Refresh 2026 palette ===
// Single source of truth for slide preview / PDF brand colours (web `#` hex).
// Mirrors lux-pitch-deck-api/src/modules/export/brand.ts (bare hex) — keep the
// two in sync; a colour change should be made in both files.
export const OCEAN_TEAL = '#255158';    // hero / primary — deep ocean teal
export const SANDY_BEIGE = '#F9F7F1';   // light page background / panels
export const CORAL_GREEN = '#8ED9AE';   // positive accent / pill / badge
export const BURNT_ORANGE = '#C94F24';  // alert / negative / urgency
export const INK = '#363A45';           // body text
export const COMPASS_WHITE = '#FFFEFA'; // brand near-white
export const SOFT_LINE = '#E7E1D6';     // dividers / borders / gridlines

// Ocean Teal tint ramp — replaces the former mint-green tints used for image
// placeholders, scrims and gradient fills (lightest → hero).
export const TEAL_100 = '#D2DCDE';
export const TEAL_200 = '#B3C2C5';
export const TEAL_300 = '#879FA3';
export const TEAL_400 = '#5C7D82';
export const TEAL_500 = OCEAN_TEAL;

// Subtle alternating table-row fill (zebra striping) on light backgrounds.
export const ALT_ROW = '#EEF3F2';

// Legacy names — repointed to the refreshed palette so existing imports keep
// working. Prefer the semantic names above in new code.
export const GREEN = OCEAN_TEAL;     // was #00b2a0
export const MINT = SANDY_BEIGE;     // was #dff0ee
export const RED = BURNT_ORANGE;     // was #d44a4a
export const NAVY = OCEAN_TEAL;      // former dark header band → Ocean Teal
export const LIGHT_BG = SANDY_BEIGE; // was #F4F6FA
export const DARK = INK;             // was #1a1a1a / #333333
