import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

export default function DatenschutzPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t("privacy.metaTitle")}</title>
        <meta name="description" content={t("privacy.metaDescription")} />
        <link rel="canonical" href="https://mormorsbreve.dk/datenschutz" />
      </Helmet>
      <MarketingNav />

      <main className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t("privacy.backToHome")}
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-8">{t("privacy.h1")}</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
              <strong>{t("privacy.noticeLabel")}</strong> {t("privacy.noticeBody")}
            </div>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("privacy.controllerTitle")}</h2>
            <p className="leading-relaxed">
              {t("privacy.controllerBody")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("privacy.dataTitle")}</h2>
            <p className="leading-relaxed">
              {t("privacy.dataBody")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("privacy.purposeTitle")}</h2>
            <p className="leading-relaxed">
              {t("privacy.purposeBody")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("privacy.aiTitle")}</h2>
            <p className="leading-relaxed">
              {t("privacy.aiBody")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("privacy.storageTitle")}</h2>
            <p className="leading-relaxed">
              {t("privacy.storageBody")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("privacy.cookiesTitle")}</h2>
            <p className="leading-relaxed">
              {t("privacy.cookiesBody")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("privacy.rightsTitle")}</h2>
            <p className="leading-relaxed">
              {t("privacy.rightsBody")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("privacy.complaintTitle")}</h2>
            <p className="leading-relaxed">
              {t("privacy.complaintBodyBefore")} <a href="https://www.datatilsynet.dk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.datatilsynet.dk</a>.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
