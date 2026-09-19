import "server-only";

// Real IANA names via the runtime's own tzdata rather than a hand-maintained
// list (Node 18+ supports Intl.supportedValuesOf) -- this can only ever be
// as stale as the Node/ICU version this app runs on, never hand-drifted.
// Server-only: the full list (~400 entries) is only needed to populate the
// <select>, which is rendered server-side (src/components/timezone-select.tsx).
export function listTimezones(): string[] {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone");
  }
  return ["UTC", "Europe/Rome", "Europe/London", "America/New_York"];
}
