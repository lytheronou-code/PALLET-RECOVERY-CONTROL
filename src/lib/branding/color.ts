const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(value: string | null | undefined): boolean {
  return !!value && HEX_COLOR_PATTERN.test(value);
}

// WCAG relative luminance -> pick black or white text, whichever gives the
// higher contrast ratio against the given background. This is the "derive
// contrast automatically" option (rather than rejecting arbitrary valid
// hex colors as unreadable): any well-formed brand color is accepted, and
// the portal always renders legible text on it.
export function getReadableTextColor(hex: string): "#000000" | "#FFFFFF" {
  if (!isValidHexColor(hex)) return "#000000";
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const linear = (channel: number) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  // Contrast ratio against black is (L + 0.05) / 0.05; against white it's
  // 1.05 / (L + 0.05). White text wins once the background is dark enough
  // that its own contrast ratio against black would exceed white's -- the
  // crossover works out to L <= ~0.179.
  return luminance > 0.179 ? "#000000" : "#FFFFFF";
}
