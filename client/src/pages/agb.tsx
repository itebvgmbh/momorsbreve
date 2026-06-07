import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { MarketingNav } from "@/components/marketing-nav";

export default function AgbPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Handelsbetingelser – MormorsBreve</title>
        <meta name="description" content="Handelsbetingelser for køb af transskription hos MormorsBreve." />
        <link rel="canonical" href="https://mormorsbreve.dk/agb" />
      </Helmet>
      <MarketingNav />

      <main className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Tilbage til forsiden
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-8">Handelsbetingelser</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
              <strong>Bemærk:</strong> Denne tekst er en foreløbig skabelon og udgør ikke juridisk rådgivning.
              Felter markeret med […] skal udfyldes med virksomhedens rigtige oplysninger, og hele teksten
              bør gennemgås af en dansk advokat eller revisor, før siden går i luften.
            </div>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">1. Generelt</h2>
            <p className="leading-relaxed">
              Disse handelsbetingelser gælder for køb på mormorsbreve.dk, der drives af [Virksomhedens navn ApS], CVR […] („vi“, „os“). Ved at gennemføre et køb accepterer du betingelserne.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">2. Ydelsen</h2>
            <p className="leading-relaxed">
              MormorsBreve er en digital tjeneste, der ved hjælp af AI transskriberer gammel håndskrift (bl.a. gotisk skrift) til læsbar tekst. De første sider kan afprøves gratis. Herefter købes credits: 1 credit = 1 side. AI-resultatet kan indeholde fejl og bør kontrolleres; til vigtige formål tilbyder vi en ekspert-service.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">3. Priser og betaling</h2>
            <p className="leading-relaxed">
              Alle priser er i danske kroner og inklusive 25 % moms. Betaling sker via Stripe (betalingskort, MobilePay m.fl.). Beløbet trækkes ved køb af credits. Du modtager en kvittering/faktura pr. e-mail.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">4. Aftalens indgåelse</h2>
            <p className="leading-relaxed">
              Aftalen er bindende, når du har gennemført købet, og vi har bekræftet det pr. e-mail. Vi opbevarer ikke aftaleteksten tilgængeligt for dig ud over den fremsendte bekræftelse.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">5. Fortrydelsesret</h2>
            <p className="leading-relaxed">
              Som forbruger har du som udgangspunkt 14 dages fortrydelsesret. For digitale tjenester, der leveres straks, bortfalder fortrydelsesretten dog, når du udtrykkeligt har samtykket til, at leveringen påbegyndes, og anerkendt at fortrydelsesretten derved mistes. Se nærmere på siden <Link href="/widerrufsbelehrung" className="text-primary hover:underline">Fortrydelsesret</Link>.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">6. Reklamation</h2>
            <p className="leading-relaxed">
              Købeloven gælder for købet. Hvis der er fejl i ydelsen, kan du reklamere. Kontakt os på [kontakt@mormorsbreve.dk].
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">7. Ansvarsbegrænsning</h2>
            <p className="leading-relaxed">
              AI-transskription er et hjælpeværktøj og kan indeholde fejl. Vi er ikke ansvarlige for følger af at anvende en transskription uden egen kontrol, herunder til juridiske, økonomiske eller officielle formål.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">8. Klage</h2>
            <p className="leading-relaxed">
              Klager kan rettes til os eller til Konkurrence- og Forbrugerstyrelsens Center for Klageløsning via <a href="https://www.forbrug.dk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.forbrug.dk</a>. EU-borgere kan bruge <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr</a>.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">9. Lovvalg</h2>
            <p className="leading-relaxed">
              Købet er underlagt dansk ret.
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
