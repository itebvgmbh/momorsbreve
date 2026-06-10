import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { ArrowRight, HelpCircle } from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_CATEGORIES, FAQ_ITEMS } from "@/data/faq-items";
import { loc } from "@/i18n/localized";

export default function FaqPage() {
  const { t, i18n } = useTranslation();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: loc(item.question, i18n.language),
      acceptedAnswer: {
        "@type": "Answer",
        text: loc(item.answer, i18n.language),
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t("faq.metaTitle")}</title>
        <meta name="description" content={t("faq.metaDescription")} />
        <link rel="canonical" href="https://mormorsbreve.dk/faq" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:title" content={t("faq.ogTitle")} />
        <meta property="og:description" content={t("faq.ogDescription")} />
        <meta property="og:url" content="https://mormorsbreve.dk/faq" />
      </Helmet>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <MarketingNav activeLink="faq" />

      <main className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 inline-flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            {t("faq.badge")}
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
            {t("faq.h1")}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t("faq.intro")}
          </p>
        </div>

        <div className="space-y-10">
          {FAQ_CATEGORIES.map((category) => (
            <section key={category.title.da}>
              <h2 className="font-serif text-xl font-semibold mb-3 text-foreground/90">
                {loc(category.title, i18n.language)}
              </h2>
              <Accordion type="multiple" className="w-full">
                {category.items.map((item, idx) => (
                  <AccordionItem
                    key={`${category.title.da}-${idx}`}
                    value={`${category.title.da}-${idx}`}
                    data-testid={`faq-item-${category.title.da.toLowerCase().replace(/\s/g, "-")}-${idx}`}
                  >
                    <AccordionTrigger className="text-left text-base sm:text-lg font-semibold py-5 hover:no-underline">
                      {loc(item.question, i18n.language)}
                    </AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground leading-relaxed pb-5">
                      {loc(item.answer, i18n.language)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>

        <div className="mt-12 text-center p-6 rounded-xl border border-border bg-card">
          <p className="text-muted-foreground mb-4">
            {t("faq.ctaBody")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/analysieren">
              <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white">
                {t("faq.ctaTryFree")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/">
              <Button size="lg" variant="outline">
                {t("faq.ctaHome")}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
