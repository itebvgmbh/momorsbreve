import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { MarketingNav } from "@/components/marketing-nav";

export default function WiderrufsbelehrungPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Fortrydelsesret – MormorsBreve</title>
        <meta name="description" content="Information om fortrydelsesret hos MormorsBreve – herunder reglerne for straks-leverede digitale tjenester." />
        <link rel="canonical" href="https://mormorsbreve.dk/widerrufsbelehrung" />
      </Helmet>
      <MarketingNav />

      <main className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Tilbage til forsiden
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-8">Fortrydelsesret</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
              <strong>Bemærk:</strong> Denne tekst er en foreløbig skabelon og udgør ikke juridisk rådgivning.
              Felter markeret med […] skal udfyldes med virksomhedens rigtige oplysninger, og hele teksten
              bør gennemgås af en dansk advokat eller revisor, før siden går i luften.
            </div>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">14 dages fortrydelsesret</h2>
            <p className="leading-relaxed">
              Som forbruger har du som udgangspunkt 14 dages fortrydelsesret fra den dag, aftalen blev indgået.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Vigtigt ved straks-levering af digitale tjenester</h2>
            <p className="leading-relaxed">
              Vores AI-transskription leveres med det samme. Når du beder om at få transskriptionen udført straks, beder vi dig samtidig om udtrykkeligt at samtykke til, at leveringen påbegyndes inden fortrydelsesfristens udløb, og at anerkende, at du derved mister din fortrydelsesret, når ydelsen er fuldt leveret. Dette samtykke gives aktivt (separat afkrydsning) før transskriptionen starter – ikke blot ved at acceptere handelsbetingelserne.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Sådan fortryder du (når fortrydelsesretten gælder)</h2>
            <p className="leading-relaxed">
              Vil du fortryde et køb, hvor leveringen endnu ikke er påbegyndt, skal du give os besked inden 14 dage pr. e-mail til [kontakt@mormorsbreve.dk] med en utsætningsfri erklæring om, at du fortryder. Du kan bruge standardfortrydelsesformularen nedenfor, men det er ikke et krav.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Tilbagebetaling</h2>
            <p className="leading-relaxed">
              Hvis du gyldigt fortryder, tilbagebetaler vi det modtagne beløb uden unødig forsinkelse og senest 14 dage efter, vi har modtaget din besked, med samme betalingsmiddel som ved købet.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Standardfortrydelsesformular</h2>
            <p className="leading-relaxed">
              Til: [Virksomhedens navn ApS], [adresse], [kontakt@mormorsbreve.dk]<br />Jeg meddeler herved, at jeg fortryder min aftale om følgende tjeneste: …<br />Bestilt den: …<br />Forbrugerens navn: …<br />Forbrugerens adresse: …<br />Dato: …
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
