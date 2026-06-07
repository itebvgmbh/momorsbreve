import Stripe from "stripe";

export type StripeMode = "live" | "test";

let currentMode: StripeMode =
  (process.env.STRIPE_MODE as StripeMode) === "test" ? "test" : "live";

function createStripeInstance(secretKey: string | undefined): Stripe | null {
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

const stripeLive = createStripeInstance(process.env.STRIPE_SECRET_KEY_LIVE);
const stripeTest = createStripeInstance(process.env.STRIPE_SECRET_KEY_TEST);

if (!stripeLive && !stripeTest) {
  console.warn(
    "[Stripe] Weder STRIPE_SECRET_KEY_LIVE noch STRIPE_SECRET_KEY_TEST gesetzt. Stripe-Zahlungen sind deaktiviert."
  );
}

export function getStripeMode(): StripeMode {
  return currentMode;
}

export function setStripeMode(mode: StripeMode): void {
  if (mode !== "live" && mode !== "test") {
    throw new Error(`Ungültiger Stripe-Modus: ${mode}`);
  }
  currentMode = mode;
  console.log(`[Stripe] Modus gewechselt zu: ${mode}`);
}

export function getStripeInstance(): Stripe | null {
  return currentMode === "test" ? stripeTest : stripeLive;
}

export function getStripeOrThrow(): Stripe {
  const instance = getStripeInstance();
  if (!instance) {
    throw new Error(
      `Stripe ist nicht konfiguriert für Modus "${currentMode}". Bitte entsprechende Keys setzen.`
    );
  }
  return instance;
}

export function getStripePublicKey(): string | null {
  return currentMode === "test"
    ? process.env.STRIPE_PUBLIC_KEY_TEST || null
    : process.env.STRIPE_PUBLIC_KEY_LIVE || null;
}

export function getWebhookSecret(): string | undefined {
  const modeSpecific =
    currentMode === "test"
      ? process.env.STRIPE_WEBHOOK_SECRET_TEST
      : process.env.STRIPE_WEBHOOK_SECRET_LIVE;
  return modeSpecific || process.env.STRIPE_WEBHOOK_SECRET;
}

export { getStripeInstance as stripe };
