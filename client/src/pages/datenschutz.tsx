import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { MarketingNav } from "@/components/marketing-nav";

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Privatlivspolitik – MormorsBreve</title>
        <meta name="description" content="Sådan behandler MormorsBreve dine personoplysninger – i overensstemmelse med GDPR og Datatilsynets vejledning." />
        <link rel="canonical" href="https://mormorsbreve.dk/datenschutz" />
      </Helmet>
      <MarketingNav />

      <main className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Tilbage til forsiden
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-8">Privatlivspolitik</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
              <strong>Bemærk:</strong> Denne tekst er en foreløbig skabelon og udgør ikke juridisk rådgivning.
              Felter markeret med […] skal udfyldes med virksomhedens rigtige oplysninger, og hele teksten
              bør gennemgås af en dansk advokat eller revisor, før siden går i luften.
            </div>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Dataansvarlig</h2>
            <p className="leading-relaxed">
              [Virksomhedens navn ApS], CVR […], [adresse], er dataansvarlig for behandlingen af de personoplysninger, vi indsamler om dig. Kontakt: [kontakt@mormorsbreve.dk].
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Hvilke oplysninger vi behandler</h2>
            <p className="leading-relaxed">
              Vi behandler de oplysninger, du selv giver os (fx navn og e-mail ved oprettelse), de dokumenter/billeder du uploader til transskription, samt tekniske oplysninger som IP-adresse og brug af siden.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">formål og retsgrundlag</h2>
            <p className="leading-relaxed">
              Vi behandler oplysningerne for at levere transskriptionen (opfyldelse af aftale, databeskyttelsesforordningens art. 6, stk. 1, litra b), for at overholde bogførings- og momsregler (retlig forpligtelse, litra c) og – hvor du har givet samtykke – til statistik og markedsføring (litra a).
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Dine dokumenter og AI-behandling</h2>
            <p className="leading-relaxed">
              De billeder og dokumenter, du uploader, behandles for at lave transskriptionen. Dine dokumenter bruges ikke til at træne AI-modeller. Til selve transskriptionen anvendes en underdatabehandler (AI-udbyder); der er indgået databehandleraftale. [Angiv konkret udbyder og placering af servere.]
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Opbevaring</h2>
            <p className="leading-relaxed">
              Vi opbevarer dine oplysninger, så længe du har en konto, og derefter kun så længe det er nødvendigt. Bogføringsbilag opbevares i 5 år jf. bogføringsloven. Du kan til enhver tid få dine data slettet.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Cookies</h2>
            <p className="leading-relaxed">
              Vi anvender cookies. Ikke-nødvendige cookies (statistik og markedsføring) sættes kun med dit forudgående, udtrykkelige samtykke, som du giver granulært pr. kategori i vores cookie-banner. Du kan til enhver tid ændre eller tilbagekalde dit samtykke lige så nemt, som du gav det. Dette følger Datatilsynets og Digitaliseringsstyrelsens cookievejledning.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Dine rettigheder</h2>
            <p className="leading-relaxed">
              Du har ret til indsigt, berigtigelse, sletning, begrænsning og dataportabilitet samt ret til at gøre indsigelse. Kontakt os for at bruge dine rettigheder.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Klage til Datatilsynet</h2>
            <p className="leading-relaxed">
              Du kan klage over vores behandling af dine personoplysninger til Datatilsynet, Carl Jacobsens Vej 35, 2500 Valby, <a href="https://www.datatilsynet.dk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.datatilsynet.dk</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <Logo height="h-6" />
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link href="/impressum" className="hover:text-foreground transition-colors">Kontakt &amp; oplysninger</Link>
            <Link href="/datenschutz" className="hover:text-foreground transition-colors">Privatlivspolitik</Link>
            <Link href="/agb" className="hover:text-foreground transition-colors">Handelsbetingelser</Link>
            <Link href="/widerrufsbelehrung" className="hover:text-foreground transition-colors">Fortrydelsesret</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} MormorsBreve. Alle rettigheder forbeholdes.
          </p>
        </div>
      </footer>
    </div>
  );
}
