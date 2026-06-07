import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { MarketingNav } from "@/components/marketing-nav";

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Kontakt &amp; oplysninger – MormorsBreve</title>
        <meta name="description" content="Kontakt og lovpligtige virksomhedsoplysninger for MormorsBreve." />
        <link rel="canonical" href="https://mormorsbreve.dk/impressum" />
      </Helmet>
      <MarketingNav />

      <main className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Tilbage til forsiden
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-8">Kontakt &amp; oplysninger</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
              <strong>Bemærk:</strong> Denne tekst er en foreløbig skabelon og udgør ikke juridisk rådgivning.
              Felter markeret med […] skal udfyldes med virksomhedens rigtige oplysninger, og hele teksten
              bør gennemgås af en dansk advokat eller revisor, før siden går i luften.
            </div>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Virksomhedsoplysninger (oplysningspligt)</h2>
            <p className="leading-relaxed">
              [Virksomhedens navn ApS]<br />[Gadenavn og nr.]<br />[Postnr.] [By]<br />Danmark
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">CVR-nummer</h2>
            <p className="leading-relaxed">
              CVR-nr.: [8-cifret CVR-nummer]
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Kontakt</h2>
            <p className="leading-relaxed">
              Telefon: [+45 …]<br />E-mail: [kontakt@mormorsbreve.dk]
            </p>
            <p className="leading-relaxed">
              I henhold til e-handelsloven oplyser vi både e-mail og telefonnummer, så du nemt kan komme i kontakt med os.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Moms (moms-registrering)</h2>
            <p className="leading-relaxed">
              Momsregistreret i Danmark. Moms-nr. (SE-nr.): [normalt identisk med CVR-nr.]<br />Alle priser på siden er angivet inklusive 25 % moms.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Ansvarlig for indholdet</h2>
            <p className="leading-relaxed">
              [Navn på ansvarlig person]<br />[Virksomhedens navn ApS]
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Klagemuligheder</h2>
            <p className="leading-relaxed">
              Har du en klage over en vare eller tjeneste købt hos os, kan du indgive en klage til Konkurrence- og Forbrugerstyrelsens Center for Klageløsning, Carl Jacobsens Vej 35, 2500 Valby. Du kan klage via <a href="https://www.forbrug.dk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.forbrug.dk</a>.
            </p>
            <p className="leading-relaxed">
              Bor du i et andet EU-land, kan du klage via EU-Kommissionens online klageportal: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr</a>.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Ansvar for indhold og links</h2>
            <p className="leading-relaxed">
              Vi bestræber os på, at oplysningerne på siden er korrekte og opdaterede, men kan ikke gøres ansvarlige for fejl. Siden kan indeholde links til eksterne websteder, som vi ikke har kontrol over, og vi påtager os ikke ansvar for deres indhold.
            </p>
          </section>
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Ophavsret</h2>
            <p className="leading-relaxed">
              Indhold, der er udarbejdet af MormorsBreve, er beskyttet af dansk ophavsret. Kopiering, bearbejdning og videredistribution ud over privat brug kræver skriftligt samtykke.
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
