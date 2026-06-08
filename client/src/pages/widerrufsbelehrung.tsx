import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

export default function WiderrufsbelehrungPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t("widerruf.metaTitle")}</title>
        <meta name="description" content={t("widerruf.metaDescription")} />
        <link rel="canonical" href="https://mormorsbreve.dk/widerrufsbelehrung" />
      </Helmet>
      <MarketingNav />

      <main className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t("widerruf.backToHome")}
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-8">{t("widerruf.h1")}</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
              <strong>{t("widerruf.noticeLabel")}</strong> {t("widerruf.noticeText")}
            </div>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("widerruf.rightTitle")}</h2>
            <p className="leading-relaxed">
              {t("widerruf.rightBody")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("widerruf.instantTitle")}</h2>
            <p className="leading-relaxed">
              {t("widerruf.instantBody")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("widerruf.howToTitle")}</h2>
            <p className="leading-relaxed">
              {t("widerruf.howToBody")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("widerruf.refundTitle")}</h2>
            <p className="leading-relaxed">
              {t("widerruf.refundBody")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("widerruf.formTitle")}</h2>
            <p className="leading-relaxed">
              {t("widerruf.formTo")}<br />{t("widerruf.formDeclaration")}<br />{t("widerruf.formOrderedOn")}<br />{t("widerruf.formConsumerName")}<br />{t("widerruf.formConsumerAddress")}<br />{t("widerruf.formDate")}
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
