import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

export default function ImpressumPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t("impressum.metaTitle")}</title>
        <meta name="description" content={t("impressum.metaDescription")} />
      </Helmet>
      <MarketingNav />

      <main className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t("impressum.backToHome")}
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-8">{t("impressum.h1")}</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("impressum.companyInfoTitle")}</h2>
            <p className="leading-relaxed">
              ITEBV GmbH<br />Zehntwerderweg 201A<br />13469 Berlin<br />{t("impressum.countryName")}
            </p>
            <p className="leading-relaxed">
              {t("impressum.mdLabel")} Stefan Tittmann, Dipl. Kfm. (FH)
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("impressum.registerTitle")}</h2>
            <p className="leading-relaxed">
              {t("impressum.registerBody")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("impressum.contactTitle")}</h2>
            <p className="leading-relaxed">
              {t("impressum.contactPhone")} +49 152 51874784<br />{t("impressum.contactEmail")} st@mes-beratung.de
            </p>
            <p className="leading-relaxed">
              {t("impressum.contactNote")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("impressum.vatTitle")}</h2>
            <p className="leading-relaxed">
              {t("impressum.vatRegistered")} {t("impressum.vatNumberLabel")} DE348787952<br />{t("impressum.vatPricesNote")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("impressum.responsibleTitle")}</h2>
            <p className="leading-relaxed">
              Stefan Tittmann<br />ITEBV GmbH<br />Zehntwerderweg 201A, 13469 Berlin
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("impressum.complaintsTitle")}</h2>
            <p className="leading-relaxed">
              {t("impressum.complaintsNational")} <a href="https://www.forbrug.dk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.forbrug.dk</a>.
            </p>
            <p className="leading-relaxed">
              {t("impressum.complaintsEu")} <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr</a>.
            </p>
            <p className="leading-relaxed">
              {t("impressum.complaintsVsbg")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("impressum.liabilityTitle")}</h2>
            <p className="leading-relaxed">
              {t("impressum.liabilityBody")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("impressum.copyrightTitle")}</h2>
            <p className="leading-relaxed">
              {t("impressum.copyrightBody")}
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
