declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
  }
}

const GA4_MEASUREMENT_ID = "G-Q6VFLSZXVP";
const ADS_CONVERSION_ID = "AW-10885539460";
const ADS_CONVERSION_LABEL = "OisCCKrF4v4YEITN0MYo";
const META_PIXEL_ID = "1701477651273920";

const GCLID_KEY = "ot_gclid";
const GCLID_TIMESTAMP_KEY = "ot_gclid_ts";
const GCLID_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 Tage

// ---------------------------------------------------------------------------
// gtag-Wrapper: nutzt window.gtag (von index.html definiert), fällt sonst
// auf dataLayer.push() zurück. WICHTIG: dataLayer erwartet ein
// Arguments-ähnliches Objekt, kein verschachteltes Array.
// ---------------------------------------------------------------------------

function gtag(...args: unknown[]) {
  if (typeof window.gtag === "function") {
    window.gtag(...args);
    return;
  }
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(arguments);
}

function fbq(...args: unknown[]) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq(...args);
  }
}

function logConversion(label: string, payload: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof console !== "undefined") {
    console.info(`[OT Conversion] ${label}`, payload);
  }
}

// ---------------------------------------------------------------------------
// gclid-Persistierung: beim Landing aus der URL lesen und in localStorage
// speichern, damit es nach dem Stripe-Redirect noch verfügbar ist.
// ---------------------------------------------------------------------------

export function captureGclid() {
  try {
    const params = new URLSearchParams(window.location.search);
    const gclid = params.get("gclid");
    if (gclid) {
      localStorage.setItem(GCLID_KEY, gclid);
      localStorage.setItem(GCLID_TIMESTAMP_KEY, String(Date.now()));
    }
  } catch {
    // localStorage nicht verfügbar
  }
}

function getStoredGclid(): string | null {
  try {
    const gclid = localStorage.getItem(GCLID_KEY);
    const ts = localStorage.getItem(GCLID_TIMESTAMP_KEY);
    if (!gclid || !ts) return null;
    if (Date.now() - Number(ts) > GCLID_TTL_MS) {
      localStorage.removeItem(GCLID_KEY);
      localStorage.removeItem(GCLID_TIMESTAMP_KEY);
      return null;
    }
    return gclid;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Consent helpers (Google Consent Mode v2)
// ---------------------------------------------------------------------------

export function ensureConsentRestored() {
  try {
    const stored = localStorage.getItem("cookie-consent");
    if (stored === "all") {
      gtag("consent", "update", {
        analytics_storage: "granted",
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
      });
      fbq("consent", "grant");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function updateConsent(granted: boolean) {
  gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
  });
  if (granted) {
    fbq("consent", "grant");
    fbq("track", "PageView");
  } else {
    fbq("consent", "revoke");
  }
}

// ---------------------------------------------------------------------------
// E-Commerce: purchase (GA4 + Google Ads Conversion)
// ---------------------------------------------------------------------------

export interface PurchaseItem {
  item_name: string;
  item_category: string;
  price: number;
  quantity: number;
  discount?: number;
  promotion_name?: string;
}

export function trackPurchaseConversion(params: {
  value: number;
  currency?: string;
  transactionId?: string;
  items?: PurchaseItem[];
  promotionActive?: boolean;
  promotionLabel?: string;
}) {
  const consentGranted = ensureConsentRestored();

  const fire = () => {
    const currency = params.currency ?? "EUR";
    const gclid = getStoredGclid();

    const adsPayload: Record<string, unknown> = {
      send_to: `${ADS_CONVERSION_ID}/${ADS_CONVERSION_LABEL}`,
      value: params.value,
      currency,
      transaction_id: params.transactionId,
    };
    if (gclid) adsPayload.gclid = gclid;

    logConversion("Google Ads conversion", adsPayload);
    gtag("event", "conversion", adsPayload);

    const ga4Payload: Record<string, unknown> = {
      send_to: GA4_MEASUREMENT_ID,
      transaction_id: params.transactionId,
      value: params.value,
      currency,
      items: params.items,
      promotion_active: params.promotionActive ?? false,
      promotion_label: params.promotionLabel ?? "",
    };

    logConversion("GA4 purchase", ga4Payload);
    gtag("event", "purchase", ga4Payload);
  };

  if (consentGranted) {
    // Kurze Verzögerung, damit gtag.js den Consent-Update verarbeiten kann
    // bevor das Conversion-Event gefeuert wird.
    setTimeout(fire, 100);
  } else {
    fire();
  }
}

// ---------------------------------------------------------------------------
// E-Commerce: begin_checkout (GA4)
// ---------------------------------------------------------------------------

export function trackBeginCheckout(params?: {
  value?: number;
  currency?: string;
  packageName?: string;
  pages?: number;
  discountPercent?: number;
  promotionLabel?: string;
  items?: PurchaseItem[];
}) {
  gtag("event", "begin_checkout", {
    send_to: GA4_MEASUREMENT_ID,
    value: params?.value,
    currency: params?.currency ?? "EUR",
    items: params?.items,
    package_name: params?.packageName ?? "",
    package_pages: params?.pages ?? 0,
    discount_percent: params?.discountPercent ?? 0,
    promotion_label: params?.promotionLabel ?? "",
  });
  fbq("track", "InitiateCheckout", {
    value: params?.value,
    currency: params?.currency ?? "EUR",
    content_name: params?.packageName,
    num_items: params?.pages,
  });
}

// ---------------------------------------------------------------------------
// E-Commerce: view_item_list (GA4) — fired when pricing page loads
// ---------------------------------------------------------------------------

export function trackViewItemList(params: {
  items: PurchaseItem[];
  promotionActive: boolean;
  promotionLabel?: string;
}) {
  gtag("event", "view_item_list", {
    send_to: GA4_MEASUREMENT_ID,
    item_list_name: "Credit-Pakete",
    items: params.items,
    promotion_active: params.promotionActive,
    promotion_label: params.promotionLabel ?? "",
  });
}

// ---------------------------------------------------------------------------
// Meta Pixel: Purchase
// ---------------------------------------------------------------------------

export function trackMetaPurchase(params: {
  value: number;
  currency?: string;
  contentName?: string;
  contentIds?: string[];
}) {
  fbq("track", "Purchase", {
    value: params.value,
    currency: params.currency ?? "EUR",
    content_name: params.contentName,
    content_ids: params.contentIds,
    content_type: "product",
  });
}

// ---------------------------------------------------------------------------
// Meta Pixel: InitiateCheckout
// ---------------------------------------------------------------------------

export function trackMetaInitiateCheckout(params?: {
  value?: number;
  currency?: string;
  contentName?: string;
  numItems?: number;
}) {
  fbq("track", "InitiateCheckout", {
    value: params?.value,
    currency: params?.currency ?? "EUR",
    content_name: params?.contentName,
    num_items: params?.numItems,
  });
}

// ---------------------------------------------------------------------------
// Legacy alias
// ---------------------------------------------------------------------------

/** @deprecated Verwende trackBeginCheckout() mit Parametern. */
export function trackBuchungConversion() {
  trackBeginCheckout();
}
