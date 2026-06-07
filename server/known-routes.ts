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

export function isKnownRoute(urlPath: string): boolean {
  if (exactRoutes.has(urlPath)) return true;
  return prefixRoutes.some((prefix) => urlPath.startsWith(prefix));
}
