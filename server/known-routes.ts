const exactRoutes = new Set([
  "/",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/widerrufsbelehrung",
  "/beispiele",
  "/analysieren",
  "/faq",
  "/blog",
  "/feldpostbriefe-transkribieren",
  "/rezeptbuecher-transkribieren",
  "/kriegstagebuecher-transkribieren",
]);

const prefixRoutes = ["/app/", "/blog/", "/__/auth/"];

// Optionales Sprach-Präfix (/de, /en) abstreifen, bevor geprüft wird.
// Dänisch ist präfixlos; /de und /en spiegeln dieselben Routen.
const LANG_PREFIX = /^\/(de|en)(?=\/|$)/;

export function isKnownRoute(urlPath: string): boolean {
  const stripped = urlPath.replace(LANG_PREFIX, "");
  const path = stripped === "" ? "/" : stripped;
  if (exactRoutes.has(path)) return true;
  return prefixRoutes.some((prefix) => path.startsWith(prefix));
}
