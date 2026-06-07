import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Check, Coins, Loader2, CreditCard, ShieldCheck, Lock, Sparkles, User, Headphones, Star, Quote, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getCreditPackageDisplayName, type CreditPackageWithPromotion, type UserCredits } from "@shared/models/transcription";
import { trackBeginCheckout, trackViewItemList, type PurchaseItem } from "@/lib/gtag";
import { useEffect, useRef } from "react";

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export default function PricingPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: packages, isLoading: packagesLoading } = useQuery<
    CreditPackageWithPromotion[]
  >({
    queryKey: ["/api/packages"],
  });

  const hasPromotion = packages?.some((p) => p.discountPercent != null) ?? false;
  const promotionLabel = packages?.find((p) => p.promotionLabel)?.promotionLabel;
  const minCurrentPricePerCredit = packages?.length
    ? Math.min(...packages.map((pkg) => pkg.priceEur / pkg.pages))
    : 23.4;
  const minOriginalPricePerCredit = packages?.length
    ? Math.min(...packages.map((pkg) => (pkg.originalPriceEur ?? pkg.priceEur) / pkg.pages))
    : undefined;
  const maxDiscountPercent = packages?.reduce((max, pkg) => Math.max(max, pkg.discountPercent ?? 0), 0) ?? 0;

  const viewTrackedRef = useRef(false);
  useEffect(() => {
    if (packages && packages.length > 0 && !viewTrackedRef.current) {
      viewTrackedRef.current = true;
      const items: PurchaseItem[] = packages.map((pkg) => ({
        item_name: `${getCreditPackageDisplayName(pkg.name)} – ${pkg.pages} Credits`,
        item_category: "Credit-Paket",
        price: pkg.priceEur / 100,
        quantity: 1,
        discount: pkg.originalPriceEur != null ? (pkg.originalPriceEur - pkg.priceEur) / 100 : undefined,
        promotion_name: pkg.promotionLabel || undefined,
      }));
      trackViewItemList({
        items,
        promotionActive: hasPromotion,
        promotionLabel: promotionLabel ?? undefined,
      });
    }
  }, [packages, hasPromotion, promotionLabel]);

  const { data: credits } = useQuery<UserCredits>({
    queryKey: ["/api/credits"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (packageId: number) => {
      const res = await apiRequest("POST", "/api/checkout", { packageId });
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Zahlung konnte nicht gestartet werden.",
        variant: "destructive",
      });
    },
  });

  const benefits = [
    "Ihr Guthaben verfällt nicht",
    "Tagebücher, Briefe, Rezepte – alles willkommen",
    "PDF zum Drucken oder Verschenken inklusive",
    "Sichere Zahlung, Ihre Daten bleiben geschützt",
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-10">

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold mb-1" data-testid="text-pricing-title">
          Preise
        </h1>
        <p className="text-muted-foreground">
          Ihr Guthaben:{" "}
          <span className="font-semibold text-foreground">
            {credits?.credits ?? 0} {(credits?.credits ?? 0) === 1 ? "Credit" : "Credits"}
          </span>
          {" "}· Alle Preise inkl. gesetzlicher Mehrwertsteuer.
        </p>
      </div>

      {/* ── KI-SOFORT HERO ────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-background shadow-sm overflow-hidden">

        {/* Hero Header */}
        <div className="px-6 pt-6 pb-5 border-b border-primary/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-primary/90 text-white text-xs px-2 py-0.5">Empfohlen</Badge>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">Sofort fertig</Badge>
              </div>
              <h2 className="font-serif text-2xl font-bold flex items-center gap-2 mt-1">
                <Sparkles className="h-6 w-6 text-primary" />
                KI-Sofort Transkription
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                KI liest Ihre Handschrift — fertig in Sekunden. Wählen Sie Ihr Credit-Paket:
              </p>
              <p className="text-sm font-medium text-primary mt-2">
                1 Seite = 1 Credit
              </p>
            </div>
            <div className="text-right">
              {hasPromotion ? (
                <>
                  <span className="text-sm text-muted-foreground line-through block">
                    ab {formatPrice(minOriginalPricePerCredit ?? minCurrentPricePerCredit)} Euro pro Seite
                  </span>
                  <span className="font-serif text-2xl font-bold text-primary">
                    ab {formatPrice(minCurrentPricePerCredit)} Euro pro Seite
                  </span>
                </>
              ) : (
                <span className="font-serif text-2xl font-bold">ab {formatPrice(minCurrentPricePerCredit)} Euro pro Seite</span>
              )}
            </div>
          </div>

          {/* Features row */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4">
            {[
              "KI-Transkription",
              "3 Textversionen (original, ergänzt, interpretiert)",
              "PDF-Export",
              "Optional: Vorlesen & Download",
            ].map((f) => (
              <span key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-primary shrink-0" />
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Packages */}
        <div className="px-6 py-5">
          {hasPromotion && promotionLabel && (
            <div className="mb-4 rounded-lg border border-amber-300/60 dark:border-amber-600/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 flex items-center justify-center gap-2">
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                🎉 {promotionLabel} — Bis zu {maxDiscountPercent} % Rabatt!
              </span>
              <span className="text-xs text-amber-700 dark:text-amber-300">Nur für kurze Zeit.</span>
            </div>
          )}

          {packagesLoading ? (
            <div className="grid sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-56" />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              {packages?.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`p-5 relative transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                    pkg.popular
                      ? "ring-2 ring-primary shadow-md bg-primary/5 dark:bg-primary/10"
                      : "bg-white dark:bg-card"
                  }`}
                  data-testid={`card-package-${pkg.id}`}
                >
                  {pkg.discountPercent != null && (
                    <Badge className="absolute -top-2.5 right-3 bg-amber-600 hover:bg-amber-600 text-white text-xs">
                      -{pkg.discountPercent} %
                    </Badge>
                  )}
                  {pkg.popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs">
                      Beliebt
                    </Badge>
                  )}
                  <div className="text-center space-y-3">
                    <h3 className="font-serif text-lg font-bold">{getCreditPackageDisplayName(pkg.name)}</h3>
                    <p className="text-sm text-muted-foreground">{pkg.pages} Seiten</p>
                    <div>
                      {pkg.originalPriceEur != null && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatPrice(pkg.originalPriceEur)} EUR
                        </p>
                      )}
                      <span className="font-serif text-4xl font-bold text-primary">
                        {formatPrice(pkg.priceEur)}
                      </span>
                      <span className="text-muted-foreground ml-1 text-sm">EUR</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">inkl. MwSt.</span>
                    </div>
                    <p className="text-xs font-medium text-primary/80">
                      nur {formatPrice(pkg.priceEur / pkg.pages)} EUR pro Seite
                    </p>
                    <Button
                      className="w-full"
                      variant={pkg.popular ? "default" : "outline"}
                      disabled={checkoutMutation.isPending}
                      onClick={() => {
                        trackBeginCheckout({
                          value: pkg.priceEur / 100,
                          packageName: getCreditPackageDisplayName(pkg.name),
                          pages: pkg.pages,
                          discountPercent: pkg.discountPercent ?? 0,
                          promotionLabel: pkg.promotionLabel ?? "",
                          items: [
                            {
                              item_name: `${getCreditPackageDisplayName(pkg.name)} – ${pkg.pages} Credits`,
                              item_category: "Credit-Paket",
                              price: pkg.priceEur / 100,
                              quantity: 1,
                              discount: pkg.originalPriceEur != null ? (pkg.originalPriceEur - pkg.priceEur) / 100 : undefined,
                              promotion_name: pkg.promotionLabel || undefined,
                            },
                          ],
                        });
                        checkoutMutation.mutate(pkg.id);
                      }}
                      data-testid={`button-buy-package-${pkg.id}`}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          {pkg.discountPercent != null ? "Jetzt zuschlagen" : "Kaufen"}
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SEKUNDÄRE SERVICES ────────────────────────────────── */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">
          Weitere Service-Optionen
        </p>
        <div className="grid sm:grid-cols-2 gap-4">

          {/* KI-Geprüft */}
          <Card className="p-5 border border-border/60 bg-muted/20 dark:bg-muted/10 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">Beliebt</Badge>
                  <span className="text-xs text-muted-foreground">2–3 Werktage</span>
                </div>
                <h3 className="font-serif text-lg font-bold mb-0.5">KI-Geprüft</h3>
                <p className="font-semibold text-base mb-3">8,99 EUR/Seite</p>
                <ul className="text-xs text-muted-foreground space-y-1.5 mb-3">
                  {[
                    "KI-Transkription + Experten-Korrektur",
                    "Geprüfte Qualität",
                    "PDF-Export",
                  ].map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-primary shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-muted-foreground/70 leading-snug border-l-2 border-amber-300 dark:border-amber-600 pl-2 mb-4">
                  Vorbehalten: Wir prüfen, ob die KI-Qualität für eine Korrektur ausreicht.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/app/upload")}
            >
              Anfrage stellen
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Card>

          {/* Experten */}
          <Card className="p-5 border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10 hover:shadow-md transition-shadow">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-400">Höchste Qualität</Badge>
                <span className="text-xs text-muted-foreground">5–7 Werktage</span>
              </div>
              <h3 className="font-serif text-lg font-bold mb-0.5 flex items-center gap-2">
                <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Experten
              </h3>
              <p className="font-semibold text-base mb-3">ab 14,90 EUR/Seite</p>
              <ul className="text-xs text-muted-foreground space-y-1.5 mb-4">
                {[
                  "Vollständige menschliche Transkription",
                  "Höchste Genauigkeit",
                  "Auch schwer lesbare Dokumente",
                ].map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              className="w-full bg-amber-600 hover:bg-amber-700 text-white border-amber-700"
              onClick={() => navigate("/app/upload")}
            >
              Angebot anfordern
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Card>
        </div>
      </div>

      {/* Testimonials */}
      <div>
        <h2 className="font-serif text-lg font-semibold mb-4 text-center">Das sagen unsere Nutzer</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              text: "Endlich kann ich die Tagebücher meiner Großmutter lesen. Die KI hat sogar die schwierige Sütterlin-Schrift erkannt. Ein unbezahlbares Geschenk für unsere Familie.",
              name: "Monika K.",
              detail: "43 Seiten transkribiert",
            },
            {
              text: "Ich war skeptisch, aber die Qualität hat mich überzeugt. Die drei Textversionen sind genial – so kann ich sowohl den Originaltext als auch eine moderne Fassung lesen.",
              name: "Thomas R.",
              detail: "Briefe aus dem Jahr 1923",
            },
            {
              text: "Die Vorlesefunktion ist wunderbar. Meine Mutter kann die Briefe ihres Vaters jetzt als Hörbuch hören, obwohl sie seine Handschrift nie lesen konnte.",
              name: "Sabine M.",
              detail: "Feldpostbriefe als Geschenk",
            },
          ].map((testimonial) => (
            <Card key={testimonial.name} className="p-4">
              <div className="flex gap-0.5 mb-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <Quote className="h-4 w-4 text-muted-foreground/30 mb-1" />
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {testimonial.text}
              </p>
              <div className="border-t pt-2">
                <p className="text-sm font-medium">{testimonial.name}</p>
                <p className="text-xs text-muted-foreground">{testimonial.detail}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Mit Ihrer Bestellung akzeptieren Sie unsere{" "}
        <Link href="/agb" className="text-primary underline-offset-4 hover:underline">AGB</Link>
        {" "}und{" "}
        <Link href="/datenschutz" className="text-primary underline-offset-4 hover:underline">Datenschutzerklärung</Link>.
        {" "}Es gilt ein{" "}
        <Link href="/widerrufsbelehrung" className="text-primary underline-offset-4 hover:underline">14-tägiges Widerrufsrecht</Link>.
      </p>

      <Card className="p-6">
        <h2 className="font-serif text-lg font-semibold mb-4">
          Das ist in jedem Paket dabei
        </h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm">{benefit}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          <span>SSL-verschlüsselt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Sichere Zahlung</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5" />
          <span>Kreditkarte, Giropay, SEPA</span>
        </div>
      </div>
    </div>
  );
}
