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
import { useTranslation } from "react-i18next";

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export default function PricingPage() {
  const { t } = useTranslation();
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
        title: t("pricing.errorTitle"),
        description: error.message || t("pricing.checkoutError"),
        variant: "destructive",
      });
    },
  });

  const benefits = [
    t("pricing.benefitNoExpiry"),
    t("pricing.benefitAllWelcome"),
    t("pricing.benefitPdfIncluded"),
    t("pricing.benefitSecurePayment"),
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-10">

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold mb-1" data-testid="text-pricing-title">
          {t("pricing.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("pricing.yourBalance")}{" "}
          <span className="font-semibold text-foreground">
            {credits?.credits ?? 0} {(credits?.credits ?? 0) === 1 ? t("pricing.creditOne") : t("pricing.creditMany")}
          </span>
          {" "}· {t("pricing.allPricesInclVat")}
        </p>
      </div>

      {/* ── KI-SOFORT HERO ────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-background shadow-sm overflow-hidden">

        {/* Hero Header */}
        <div className="px-6 pt-6 pb-5 border-b border-primary/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-primary/90 text-white text-xs px-2 py-0.5">{t("pricing.badgeRecommended")}</Badge>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">{t("pricing.badgeInstantlyReady")}</Badge>
              </div>
              <h2 className="font-serif text-2xl font-bold flex items-center gap-2 mt-1">
                <Sparkles className="h-6 w-6 text-primary" />
                {t("pricing.heroTitle")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("pricing.heroSubtitle")}
              </p>
              <p className="text-sm font-medium text-primary mt-2">
                {t("pricing.onePageOneCredit")}
              </p>
            </div>
            <div className="text-right">
              {hasPromotion ? (
                <>
                  <span className="text-sm text-muted-foreground line-through block">
                    {t("pricing.fromPricePerPage", { price: formatPrice(minOriginalPricePerCredit ?? minCurrentPricePerCredit) })}
                  </span>
                  <span className="font-serif text-2xl font-bold text-primary">
                    {t("pricing.fromPricePerPage", { price: formatPrice(minCurrentPricePerCredit) })}
                  </span>
                </>
              ) : (
                <span className="font-serif text-2xl font-bold">{t("pricing.fromPricePerPage", { price: formatPrice(minCurrentPricePerCredit) })}</span>
              )}
            </div>
          </div>

          {/* Features row */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4">
            {[
              t("pricing.featureAiTranscription"),
              t("pricing.featureThreeVersions"),
              t("pricing.featurePdfExport"),
              t("pricing.featureReadAloud"),
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
                🎉 {promotionLabel} — {t("pricing.promotionUpTo", { percent: maxDiscountPercent })}
              </span>
              <span className="text-xs text-amber-700 dark:text-amber-300">{t("pricing.promotionLimitedTime")}</span>
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
                      {t("pricing.badgePopular")}
                    </Badge>
                  )}
                  <div className="text-center space-y-3">
                    <h3 className="font-serif text-lg font-bold">{getCreditPackageDisplayName(pkg.name)}</h3>
                    <p className="text-sm text-muted-foreground">{t("pricing.pagesCount", { count: pkg.pages })}</p>
                    <div>
                      {pkg.originalPriceEur != null && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatPrice(pkg.originalPriceEur)} kr.
                        </p>
                      )}
                      <span className="font-serif text-4xl font-bold text-primary">
                        {formatPrice(pkg.priceEur)}
                      </span>
                      <span className="text-muted-foreground ml-1 text-sm">kr.</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{t("pricing.inclVat")}</span>
                    </div>
                    <p className="text-xs font-medium text-primary/80">
                      {t("pricing.onlyPricePerPage", { price: formatPrice(pkg.priceEur / pkg.pages) })}
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
                          {pkg.discountPercent != null ? t("pricing.grabNow") : t("pricing.buy")}
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
          {t("pricing.moreServiceOptions")}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">

          {/* KI-Geprüft */}
          <Card className="p-5 border border-border/60 bg-muted/20 dark:bg-muted/10 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{t("pricing.badgePopular")}</Badge>
                  <span className="text-xs text-muted-foreground">{t("pricing.deliveryAiChecked")}</span>
                </div>
                <h3 className="font-serif text-lg font-bold mb-0.5">{t("pricing.aiCheckedTitle")}</h3>
                <p className="font-semibold text-base mb-3">{t("pricing.aiCheckedPrice")}</p>
                <ul className="text-xs text-muted-foreground space-y-1.5 mb-3">
                  {[
                    t("pricing.aiCheckedFeatureCorrection"),
                    t("pricing.aiCheckedFeatureQuality"),
                    t("pricing.featurePdfExport"),
                  ].map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-primary shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-muted-foreground/70 leading-snug border-l-2 border-amber-300 dark:border-amber-600 pl-2 mb-4">
                  {t("pricing.aiCheckedReservation")}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/app/upload")}
            >
              {t("pricing.submitRequest")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Card>

          {/* Experten */}
          <Card className="p-5 border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10 hover:shadow-md transition-shadow">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-400">{t("pricing.badgeHighestQuality")}</Badge>
                <span className="text-xs text-muted-foreground">{t("pricing.deliveryExperts")}</span>
              </div>
              <h3 className="font-serif text-lg font-bold mb-0.5 flex items-center gap-2">
                <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                {t("pricing.expertsTitle")}
              </h3>
              <p className="font-semibold text-base mb-3">{t("pricing.expertsPrice")}</p>
              <ul className="text-xs text-muted-foreground space-y-1.5 mb-4">
                {[
                  t("pricing.expertsFeatureHuman"),
                  t("pricing.expertsFeatureAccuracy"),
                  t("pricing.expertsFeatureHardDocs"),
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
              {t("pricing.requestQuote")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Card>
        </div>
      </div>

      {/* Testimonials */}
      <div>
        <h2 className="font-serif text-lg font-semibold mb-4 text-center">{t("pricing.testimonialsTitle")}</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              text: t("pricing.testimonial1Text"),
              name: t("pricing.testimonial1Name"),
              detail: t("pricing.testimonial1Detail"),
            },
            {
              text: t("pricing.testimonial2Text"),
              name: t("pricing.testimonial2Name"),
              detail: t("pricing.testimonial2Detail"),
            },
            {
              text: t("pricing.testimonial3Text"),
              name: t("pricing.testimonial3Name"),
              detail: t("pricing.testimonial3Detail"),
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
        {t("pricing.legalIntro")}{" "}
        <Link href="/agb" className="text-primary underline-offset-4 hover:underline">{t("pricing.legalTerms")}</Link>
        {" "}{t("pricing.legalAnd")}{" "}
        <Link href="/datenschutz" className="text-primary underline-offset-4 hover:underline">{t("pricing.legalPrivacy")}</Link>.
        {" "}{t("pricing.legalWithdrawalIntro")}{" "}
        <Link href="/widerrufsbelehrung" className="text-primary underline-offset-4 hover:underline">{t("pricing.legalWithdrawalRight")}</Link>.
      </p>

      <Card className="p-6">
        <h2 className="font-serif text-lg font-semibold mb-4">
          {t("pricing.includedInEveryPackage")}
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
          <span>{t("pricing.trustSslEncrypted")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>{t("pricing.trustSecurePayment")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5" />
          <span>{t("pricing.trustPaymentMethods")}</span>
        </div>
      </div>
    </div>
  );
}
