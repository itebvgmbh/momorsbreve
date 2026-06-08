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
        <link rel="canonical" href="https://mormorsbreve.dk/impressum" />
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
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
              <strong>{t("impressum.noticeLabel")}</strong> {t("impressum.noticeBody")}
            </div>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("impressum.companyInfoTitle")}</h2>
            <p className="leading-relaxed">
              [Virksomhedens navn ApS]<br />[Gadenavn og nr.]<br />[Postnr.] [By]<br />Danmark
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("impressum.cvrTitle")}</h2>
            <p className="leading-relaxed">
              {t("impressum.cvrLabel")} [8-cifret CVR-nummer]
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("impressum.contactTitle")}</h2>
            <p className="leading-relaxed">
              {t("impressum.contactPhone")} [+45 …]<br />{t("impressum.contactEmail")} [kontakt@mormorsbreve.dk]
            </p>
            <p className="leading-relaxed">
              {t("impressum.contactNote")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("impressum.vatTitle")}</h2>
            <p className="leading-relaxed">
              {t("impressum.vatRegistered")} {t("impressum.vatNumberLabel")} [normalt identisk med CVR-nr.]<br />{t("impressum.vatPricesNote")}
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">{t("impressum.responsibleTitle")}</h2>
            <p className="leading-relaxed">
              [Navn på ansvarlig person]<br />[Virksomhedens navn ApS]
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
