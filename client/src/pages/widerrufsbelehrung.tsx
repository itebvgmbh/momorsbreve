import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { MarketingNav } from "@/components/marketing-nav";

export default function WiderrufsbelehrungPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Widerrufsbelehrung – MormorsBreve</title>
        <meta name="description" content="Widerrufsbelehrung und Muster-Widerrufsformular von MormorsBreve." />
        <link rel="canonical" href="https://mormorsbreve.dk/widerrufsbelehrung" />
      </Helmet>
      <MarketingNav />

      <main className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Startseite
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-8">Widerrufsbelehrung</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Widerrufsrecht</h2>
            <p className="leading-relaxed">
              Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag
              zu widerrufen.
            </p>
            <p className="leading-relaxed">
              Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.
            </p>
            <p className="leading-relaxed">
              Um Ihr Widerrufsrecht auszuüben, müssen Sie uns
            </p>
            <p className="leading-relaxed font-medium">
              ITEBV GmbH<br />
              Zehntwerderweg 201A<br />
              13469 Berlin<br />
              E-Mail: st@mes-beratung.de<br />
              Telefon: +49 152 51874784
            </p>
            <p className="leading-relaxed">
              mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder
              eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren.
              Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch
              nicht vorgeschrieben ist.
            </p>
            <p className="leading-relaxed">
              Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die
              Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Folgen des Widerrufs</h2>
            <p className="leading-relaxed">
              Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von
              Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der
              zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der
              Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben),
              unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem
              die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für
              diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der
              ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde
              ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser
              Rückzahlung Entgelte berechnet.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">Vorzeitiges Erlöschen des Widerrufsrechts</h2>
            <p className="leading-relaxed">
              Das Widerrufsrecht erlischt bei einem Vertrag über die Lieferung von nicht auf
              einem körperlichen Datenträger befindlichen digitalen Inhalten vorzeitig, wenn
              der Unternehmer mit der Ausführung des Vertrags begonnen hat, nachdem der
              Verbraucher
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>ausdrücklich zugestimmt hat, dass der Unternehmer mit der Ausführung des Vertrags vor Ablauf der Widerrufsfrist beginnt, und</li>
              <li>seine Kenntnis davon bestätigt hat, dass er durch seine Zustimmung mit Beginn der Ausführung des Vertrags sein Widerrufsrecht verliert.</li>
            </ul>
            <p className="leading-relaxed mt-3">
              Konkret bedeutet dies: Sobald Sie Credits erworben und für eine Transkription
              eingesetzt haben, erlischt Ihr Widerrufsrecht für die verbrauchten Credits,
              sofern Sie dem vorzeitigen Beginn der Leistung zugestimmt haben. Nicht
              eingesetzte Credits können im Rahmen des Widerrufsrechts erstattet werden.
            </p>
          </section>

          <section className="border-t border-border pt-6">
            <h2 className="font-serif text-xl font-semibold mb-3">Muster-Widerrufsformular</h2>
            <p className="leading-relaxed text-sm text-muted-foreground mb-4">
              (Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular
              aus und senden Sie es zurück.)
            </p>
            <div className="bg-muted/50 border border-border rounded-lg p-6 space-y-4">
              <p className="leading-relaxed">
                An:<br />
                ITEBV GmbH<br />
                Zehntwerderweg 201A<br />
                13469 Berlin<br />
                E-Mail: st@mes-beratung.de
              </p>
              <p className="leading-relaxed">
                Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag
                über den Kauf der folgenden Waren (*) / die Erbringung der folgenden
                Dienstleistung (*)
              </p>
              <p className="leading-relaxed">
                _______________________________________________
              </p>
              <p className="leading-relaxed">
                Bestellt am (*) / erhalten am (*):<br />
                _______________________________________________
              </p>
              <p className="leading-relaxed">
                Name des/der Verbraucher(s):<br />
                _______________________________________________
              </p>
              <p className="leading-relaxed">
                Anschrift des/der Verbraucher(s):<br />
                _______________________________________________
              </p>
              <p className="leading-relaxed">
                _______________________________________________<br />
                Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)
              </p>
              <p className="leading-relaxed">
                Datum:<br />
                _______________________________________________
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                (*) Unzutreffendes streichen.
              </p>
            </div>
          </section>

          <section>
            <p className="text-sm text-muted-foreground mt-8">
              Stand: Februar 2026
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <Logo height="h-6" />
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link href="/impressum" className="hover:text-foreground transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</Link>
            <Link href="/agb" className="hover:text-foreground transition-colors">AGB</Link>
            <Link href="/widerrufsbelehrung" className="hover:text-foreground transition-colors">Widerrufsbelehrung</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ITEBV GmbH. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  );
}
