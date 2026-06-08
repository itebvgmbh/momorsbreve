import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

export default function AgbPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t("agb.metaTitle")}</title>
        <meta name="description" content={t("agb.metaDescription")} />
        <link rel="canonical" href="https://mormorsbreve.dk/agb" />
      </Helmet>
      <MarketingNav />

      <main className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t("agb.backToHome")}
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-8">{t("agb.h1")}</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
              <strong>{t("agb.noticeLabel")}</strong> {t("agb.noticeText")}
            </div>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("agb.s1Title")}</h2>
            <p className="leading-relaxed">
              {t("agb.s1Body")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("agb.s2Title")}</h2>
            <p className="leading-relaxed">
              {t("agb.s2Body")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("agb.s3Title")}</h2>
            <p className="leading-relaxed">
              {t("agb.s3Body")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("agb.s4Title")}</h2>
            <p className="leading-relaxed">
              {t("agb.s4Body")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("agb.s5Title")}</h2>
            <p className="leading-relaxed">
              {t("agb.s5Body")} <Link href="/widerrufsbelehrung" className="text-primary hover:underline">{t("agb.s5LinkText")}</Link>.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("agb.s6Title")}</h2>
            <p className="leading-relaxed">
              {t("agb.s6Body")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("agb.s7Title")}</h2>
            <p className="leading-relaxed">
              {t("agb.s7Body")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("agb.s8Title")}</h2>
            <p className="leading-relaxed">
              {t("agb.s8BodyBefore")} <a href="https://www.forbrug.dk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.forbrug.dk</a>. {t("agb.s8BodyMiddle")} <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr</a>.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("agb.s9Title")}</h2>
            <p className="leading-relaxed">
              {t("agb.s9Body")}
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
