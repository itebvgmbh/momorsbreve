import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { MarketingNav } from "@/components/marketing-nav";

export default function AGBPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>AGB – MormorsBreve</title>
        <meta name="description" content="Allgemeine Geschäftsbedingungen von MormorsBreve." />
        <link rel="canonical" href="https://mormorsbreve.dk/agb" />
      </Helmet>
      <MarketingNav />

      <main className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Startseite
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-8">Allgemeine Geschäftsbedingungen (AGB)</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">§ 1 Geltungsbereich</h2>
            <p className="leading-relaxed">
              (1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB") gelten für alle
              Verträge, die zwischen der ITEBV GmbH, Zehntwerderweg 201A, 13469 Berlin
              (nachfolgend „Anbieter") und dem Kunden (nachfolgend „Nutzer") über die
              Internetplattform MormorsBreve geschlossen werden.
            </p>
            <p className="leading-relaxed">
              (2) Abweichende Bedingungen des Nutzers werden nicht anerkannt, es sei denn, der
              Anbieter stimmt ihrer Geltung ausdrücklich schriftlich zu.
            </p>
            <p className="leading-relaxed">
              (3) Es gilt die zum Zeitpunkt des Vertragsschlusses gültige Fassung dieser AGB.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">§ 2 Vertragsgegenstand</h2>
            <p className="leading-relaxed">
              (1) Gegenstand des Vertrages ist die Bereitstellung eines KI-gestützten
              Transkriptionsdienstes für handgeschriebene Dokumente über die Plattform MormorsBreve.
              Der Dienst ermöglicht es Nutzern, Bilder oder PDF-Dateien von handgeschriebenen
              Texten hochzuladen und mittels künstlicher Intelligenz in maschinenlesbaren Text
              umwandeln zu lassen. Die Transkription erfolgt unter Einsatz von
              Vision-Language-Modellen der folgenden Anbieter:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>
                Anthropic PBC, 548 Market St., PMB 90375, San Francisco, CA 94104, USA
                (Modellfamilie „Claude")
              </li>
              <li>
                Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland
                (Modellfamilie „Gemini")
              </li>
            </ul>
            <p className="leading-relaxed">
              Der Anbieter behält sich vor, zwischen diesen Modellen zu wechseln oder bei
              Überlastung eines Anbieters automatisch auf den jeweils anderen auszuweichen
              (Fallback). Sämtliche Transkriptionsergebnisse sind vollständig KI-generiert
              (KI-generierte Inhalte im Sinne von Art. 50 der Verordnung (EU) 2024/1689
              – EU AI Act).
            </p>
            <p className="leading-relaxed">
              (2) Der Anbieter stellt eine kostenlose Vorschaufunktion zur Verfügung, mit der der
              Nutzer die Qualität der Transkription vor dem Kauf beurteilen kann. Der Nutzer nimmt
              ausdrücklich zur Kenntnis, dass bereits mit dem Hochladen eines Dokuments – und damit
              bereits vor dem Erwerb kostenpflichtiger Credits – eine automatisierte Analyse und
              Teil-Transkription durch die unter Absatz 1 genannten KI-Anbieter (Anthropic PBC,
              USA und/oder Google Ireland Limited, Irland) stattfindet. Hierfür werden die
              hochgeladenen Dateien an diese Anbieter übermittelt. Der Nutzer willigt mit dem
              Upload in diese Übermittlung und Verarbeitung zum Zwecke der Vorschauerstellung ein.
              Einzelheiten zur Datenverarbeitung und zum Drittlandtransfer ergeben sich aus der
              Datenschutzerklärung.
            </p>
            <p className="leading-relaxed">
              (3) Die vollständige Transkription erfolgt gegen Bezahlung mittels eines
              Credit-Systems.
            </p>
            <p className="leading-relaxed">
              (4) Als optionale Zusatzfunktion vermittelt der Anbieter Anfragen an aktivierte
              Experten oder Partnerunternehmen, die eine Experten-Transkription anbieten oder
              eine KI-Transkription nachbearbeiten können (siehe § 9a).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">§ 3 Registrierung und Nutzerkonto</h2>
            <p className="leading-relaxed">
              (1) Für die Nutzung des Dienstes ist eine Registrierung erforderlich. Der Nutzer
              ist verpflichtet, wahrheitsgemäße und vollständige Angaben zu machen.
            </p>
            <p className="leading-relaxed">
              (2) Der Nutzer ist für die Geheimhaltung seiner Zugangsdaten selbst verantwortlich.
              Er hat den Anbieter unverzüglich zu informieren, wenn er Kenntnis davon erlangt,
              dass ein Dritter sein Konto unbefugt nutzt.
            </p>
            <p className="leading-relaxed">
              (3) Der Anbieter behält sich das Recht vor, Nutzerkonten bei Verstoß gegen diese
              AGB zu sperren oder zu löschen.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">§ 4 Credit-System und Preise</h2>
            <p className="leading-relaxed">
              (1) Die Nutzung des Transkriptionsdienstes erfolgt auf Basis eines Credit-Systems.
              Credits können in verschiedenen Paketen erworben werden. Die aktuellen Preise sind
              auf der Preisseite der Plattform einsehbar.
            </p>
            <p className="leading-relaxed">
              (2) Erworbene Credits verfallen nicht und sind an das Nutzerkonto gebunden.
            </p>
            <p className="leading-relaxed">
              (3) Eine Rückerstattung von erworbenen Credits ist ausgeschlossen, es sei denn, es
              liegt ein gesetzliches Widerrufsrecht vor.
            </p>
            <p className="leading-relaxed">
              (4) Alle angegebenen Preise verstehen sich inklusive der gesetzlichen
              Mehrwertsteuer.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">§ 5 Widerrufsrecht</h2>
            <p className="leading-relaxed">
              (1) Verbraucher haben ein 14-tägiges Widerrufsrecht gemäß den gesetzlichen
              Bestimmungen. Die vollständige Widerrufsbelehrung einschließlich des
              Muster-Widerrufsformulars finden Sie unter{" "}
              <Link href="/widerrufsbelehrung" className="text-primary hover:underline">
                Widerrufsbelehrung
              </Link>.
            </p>
            <p className="leading-relaxed">
              (2) Das Widerrufsrecht erlischt bei digitalen Inhalten vorzeitig, wenn der Anbieter
              mit der Ausführung des Vertrags begonnen hat, nachdem der Nutzer ausdrücklich
              zugestimmt hat, dass der Anbieter mit der Ausführung des Vertrags vor Ablauf der
              Widerrufsfrist beginnt, und der Nutzer seine Kenntnis davon bestätigt hat, dass er
              durch seine Zustimmung mit Beginn der Ausführung des Vertrags sein Widerrufsrecht
              verliert.
            </p>
            <p className="leading-relaxed">
              (3) Zur Ausübung des Widerrufsrechts muss der Nutzer den Anbieter (ITEBV GmbH,
              Zehntwerderweg 201A, 13469 Berlin, E-Mail: st@mes-beratung.de) mittels einer
              eindeutigen Erklärung über seinen Entschluss, den Vertrag zu widerrufen, informieren.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">§ 6 Leistungsbeschreibung und KI-Transparenz</h2>
            <p className="leading-relaxed">
              (1) Der Anbieter stellt die Transkriptionsergebnisse unter Einsatz von
              Vision-Language-Modellen der Anthropic PBC (USA, Modellfamilie „Claude") und/oder
              der Google Ireland Limited (Irland, Modellfamilie „Gemini") bereit. Welcher Anbieter
              im Einzelfall eingesetzt wird, kann vom Anbieter je nach Verfügbarkeit, Qualität und
              Auslastung bestimmt werden; insbesondere ist ein automatischer Fallback auf den
              jeweils anderen Anbieter möglich. Sämtliche Transkriptionsergebnisse werden durch
              künstliche Intelligenz erzeugt (KI-generierte Inhalte im Sinne von Art. 50 der
              Verordnung (EU) 2024/1689 – EU AI Act). Eine 100 %-ige Genauigkeit der Transkription
              kann aufgrund der Natur handgeschriebener Texte und der Funktionsweise von
              KI-Systemen nicht garantiert werden.
            </p>
            <p className="leading-relaxed">
              (1a) Sofern der Nutzer die Transkriptionsergebnisse an Dritte weitergibt oder
              veröffentlicht, soll er – soweit rechtlich geboten (Art. 50 EU AI Act) – darauf
              hinweisen, dass die Inhalte KI-generiert sind.
            </p>
            <p className="leading-relaxed">
              (2) Die kostenlose Vorschau ermöglicht dem Nutzer, die zu erwartende Qualität vor
              dem Kauf einzuschätzen. Die Nutzung der Vorschaufunktion ist unverbindlich.
            </p>
            <p className="leading-relaxed">
              (3) Der Anbieter bemüht sich um eine hohe Verfügbarkeit des Dienstes, schuldet
              jedoch keine ununterbrochene Verfügbarkeit. Wartungsarbeiten und technische
              Störungen können zu vorübergehenden Einschränkungen führen.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">§ 7 Pflichten des Nutzers</h2>
            <p className="leading-relaxed">
              (1) Der Nutzer darf nur Dokumente hochladen, an denen er die erforderlichen Rechte
              besitzt.
            </p>
            <p className="leading-relaxed">
              (2) Das Hochladen von rechtswidrigen, pornografischen, gewaltverherrlichenden oder
              anderweitig anstößigen Inhalten ist untersagt.
            </p>
            <p className="leading-relaxed">
              (3) Der Nutzer darf den Dienst nicht missbräuchlich nutzen, insbesondere nicht durch
              automatisierte Massenanfragen oder das Umgehen technischer Schutzmaßnahmen.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">§ 8 Haftung</h2>
            <p className="leading-relaxed">
              (1) Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit.
            </p>
            <p className="leading-relaxed">
              (2) Für leichte Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher
              Vertragspflichten (Kardinalpflichten). Die Haftung ist in diesem Fall pro
              Schadensfall auf den typischerweise vorhersehbaren, vertragstypischen Schaden,
              höchstens jedoch auf den Betrag der in den letzten zwölf Monaten vor dem
              schadensbegründenden Ereignis vom Nutzer für den Dienst gezahlten Entgelte begrenzt.
              Eine Haftung für mittelbare Schäden, insbesondere entgangenen Gewinn, ist in diesem
              Rahmen ausgeschlossen.
            </p>
            <p className="leading-relaxed">
              (3) Die vorstehenden Haftungsbeschränkungen gelten nicht für Schäden aus der
              Verletzung des Lebens, des Körpers oder der Gesundheit sowie für Ansprüche nach
              dem Produkthaftungsgesetz.
            </p>
            <p className="leading-relaxed">
              (4) Der Nutzer nimmt ausdrücklich zur Kenntnis, dass die Transkriptionsergebnisse
              vollständig von generativen KI-Systemen erzeugt und vom Anbieter inhaltlich nicht
              nachgeprüft werden. KI-Systeme können aufgrund ihrer Funktionsweise fehlerhafte,
              unvollständige oder frei erfundene Inhalte erzeugen (sog. „Halluzinationen"), ohne
              dass diese Fehler für den Nutzer oder den Anbieter zuverlässig erkennbar sind. Eine
              Überprüfung der KI-Ergebnisse auf inhaltliche Richtigkeit findet durch den Anbieter
              nicht statt.
            </p>
            <p className="leading-relaxed">
              (5) Die inhaltliche Richtigkeit und Vollständigkeit der Transkription ist
              ausdrücklich nicht Gegenstand der vom Anbieter geschuldeten Leistung und wird vom
              Anbieter weder zugesichert noch garantiert. Der Anbieter schuldet lediglich die
              technische Durchführung des KI-gestützten Transkriptionsvorgangs und die
              Bereitstellung des so erzeugten Ergebnisses. Die Ergebnisse stellen insbesondere
              keine öffentlich beglaubigten Abschriften im Sinne des § 33 BeurkG dar.
            </p>
            <p className="leading-relaxed">
              (6) Der Nutzer ist verpflichtet, die Transkriptionsergebnisse vor jeder
              weitergehenden Verwendung selbst auf Richtigkeit und Vollständigkeit zu prüfen. Eine
              Verwendung der Ergebnisse für rechtsverbindliche, wissenschaftliche, historische,
              genealogische oder sonstige dokumentenkritische Zwecke erfolgt ausschließlich auf
              eigenes Risiko des Nutzers. Im Rahmen der unter Absatz 1 bis 3 beschriebenen
              Haftungsgrenzen haftet der Anbieter nicht für Schäden, die dem Nutzer oder Dritten
              dadurch entstehen, dass inhaltliche Fehler der KI-generierten Transkription nicht
              erkannt werden oder dass der Nutzer die Ergebnisse ungeprüft weiterverwendet.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">§ 9 Urheberrecht und Nutzungsrechte</h2>
            <p className="leading-relaxed">
              (1) Der Nutzer behält sämtliche Rechte an den von ihm hochgeladenen Dokumenten und
              den daraus erzeugten Transkriptionen.
            </p>
            <p className="leading-relaxed">
              (2) Der Nutzer räumt dem Anbieter ein einfaches, zeitlich auf die Dauer der
              Verarbeitung beschränktes Nutzungsrecht an den hochgeladenen Dokumenten ein, soweit
              dies zur Erbringung der Dienstleistung erforderlich ist.
            </p>
            <p className="leading-relaxed">
              (3) Die Software, das Design und die Inhalte der Plattform sind urheberrechtlich
              geschützt und dürfen ohne Zustimmung des Anbieters nicht vervielfältigt oder
              verbreitet werden.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">§ 9a Experten-Transkription und Datenweitergabe an Dritte</h2>
            <p className="leading-relaxed">
              (1) Der Anbieter bietet neben der rein KI-gestützten Transkription die Vermittlung
              einer kostenpflichtigen Experten-Transkription an. Der Anbieter wird dabei nicht
              selbst Leistungserbringer der Expertenleistung, sondern stellt die Plattform zur
              Anfrage, Angebotsübermittlung, Beauftragung und Ergebnisbereitstellung bereit.
              Angebote können nur von durch den Anbieter aktivierten Experten oder
              Partnerunternehmen abgegeben werden.
            </p>
            <p className="leading-relaxed">
              (2) Mit Absenden einer Experten-Anfrage über das dafür vorgesehene Anfrageformular
              erteilt der Nutzer seine ausdrückliche Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO
              dazu, dass
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>
                die hochgeladenen Dokumente, bestehende Transkriptionsentwürfe sowie die vom
                Nutzer gemachten Anmerkungen an einen oder mehrere aktive Experten bzw.
                Partnerunternehmen übermittelt werden,
              </li>
              <li>
                diese Daten auf der Plattform für qualifizierte Experten und Partnerunternehmen
                einsehbar gemacht werden können, soweit dies zur Angebotsabgabe oder
                Leistungserbringung erforderlich ist, und
              </li>
              <li>
                der Name bzw. die Kontakt-E-Mail-Adresse des Nutzers an den Experten übermittelt
                werden können, soweit dies zur Klärung fachlicher Rückfragen erforderlich ist.
              </li>
            </ul>
            <p className="leading-relaxed">
              (3) Der Anbieter verpflichtet die aktiven Experten und Partnerunternehmen
              vertraglich zur Vertraulichkeit und zur Einhaltung der DSGVO. Soweit die Experten
              als Auftragsverarbeiter tätig werden, schließt der Anbieter mit ihnen einen Vertrag
              nach Art. 28 DSGVO; soweit sie als eigene Verantwortliche tätig werden (z. B. als
              Partnerunternehmen mit eigenem Leistungsangebot), erfolgt die Übermittlung auf
              Grundlage der vorstehenden Einwilligung und unter Beachtung von Art. 26 DSGVO bzw.
              getrennter Verantwortlichkeiten.
            </p>
            <p className="leading-relaxed">
              (4) Eine Experten-Anfrage selbst begründet noch keinen kostenpflichtigen Vertrag mit
              einem Experten. Erst wenn der Nutzer ein konkretes Angebot eines Experten erhält und
              dieses über die Plattform ausdrücklich zahlungspflichtig annimmt, kommt der
              kostenpflichtige Vertrag unmittelbar zwischen dem Nutzer und dem im Angebot genannten
              Experten bzw. dessen Unternehmen zustande. Der Experte ist für Angebot, Leistung,
              Haftung, Rechnungsstellung und Zahlungsabwicklung selbst verantwortlich. Der Anbieter
              löst für diese Expertenleistung keine Zahlung aus und stellt hierfür keine Rechnung.
            </p>
            <p className="leading-relaxed">
              (5) Der Nutzer kann seine Einwilligung nach Absatz 2 jederzeit mit Wirkung für die
              Zukunft gegenüber dem Anbieter (per E-Mail an st@mes-beratung.de) widerrufen
              (Art. 7 Abs. 3 DSGVO). Bereits begonnene Experten-Bearbeitungen werden abgeschlossen;
              noch nicht begonnene Bearbeitungen werden gestoppt. Zahlungs- und Erstattungsfragen
              zu angenommenen Expertenangeboten sind direkt mit dem jeweiligen Experten zu klären.
              Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt unberührt.
            </p>
            <p className="leading-relaxed">
              (6) Der Nutzer versichert, dass die zur Transkription übermittelten Dokumente
              entweder keine besonders sensiblen Daten im Sinne des Art. 9 DSGVO (insbesondere
              Gesundheitsdaten, religiöse, politische, gewerkschaftliche, biometrische oder
              ethnische Daten) Dritter enthalten oder dass er zur Weitergabe dieser Daten an den
              Anbieter und die beauftragten Experten berechtigt ist. Für Schäden, die dem Anbieter
              oder Dritten aus einer unberechtigten Weitergabe solcher Daten durch den Nutzer
              entstehen, haftet der Nutzer; er stellt den Anbieter im Innenverhältnis von
              Ansprüchen Dritter insoweit frei, soweit ihn ein Verschulden trifft.
            </p>
            <p className="leading-relaxed">
              (7) Nach Abschluss der Experten-Transkription erhält der beauftragte Experte die
              Daten nur so lange, wie dies zur Leistungserbringung und etwaigen Gewährleistung
              erforderlich ist; danach sind die Daten beim Experten zu löschen, es sei denn,
              gesetzliche Aufbewahrungspflichten stehen entgegen.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">§ 10 Datenschutz</h2>
            <p className="leading-relaxed">
              Die Erhebung und Verarbeitung personenbezogener Daten erfolgt gemäß unserer{" "}
              <Link href="/datenschutz" className="text-primary hover:underline">
                Datenschutzerklärung
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">§ 11 Änderungen der AGB</h2>
            <p className="leading-relaxed">
              (1) Der Anbieter behält sich vor, diese AGB zu ändern, soweit dies erforderlich ist,
              um die AGB an geänderte rechtliche Rahmenbedingungen, eine höchstrichterliche
              Rechtsprechung, geänderte Marktgegebenheiten oder Änderungen des Leistungsumfangs
              anzupassen. Der Anbieter wird den Nutzer über Änderungen mit angemessener Frist,
              mindestens jedoch sechs Wochen vor dem geplanten Inkrafttreten, per E-Mail
              informieren und die geänderte Fassung in der App zur Einsicht bereitstellen.
            </p>
            <p className="leading-relaxed">
              (2) Änderungen der AGB werden nur wirksam, wenn der Nutzer ihnen ausdrücklich
              zustimmt, etwa durch aktive Bestätigung (z. B. Anklicken eines entsprechenden
              Feldes) bei der nächsten Anmeldung. Eine bloße Fortsetzung der Nutzung des Dienstes
              gilt nicht als Zustimmung.
            </p>
            <p className="leading-relaxed">
              (3) Stimmt der Nutzer den geänderten AGB nicht zu, ist er berechtigt, den Vertrag
              bis zum Zeitpunkt des geplanten Inkrafttretens außerordentlich ohne Einhaltung einer
              Kündigungsfrist zu kündigen. Noch nicht verbrauchte, kostenpflichtig erworbene
              Credits werden in diesem Fall anteilig erstattet. Der Anbieter weist den Nutzer in
              der Änderungsmitteilung gesondert auf dieses Kündigungsrecht sowie die
              Erstattungsmöglichkeit hin.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">§ 12 Schlussbestimmungen</h2>
            <p className="leading-relaxed">
              (1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
              UN-Kaufrechts.
            </p>
            <p className="leading-relaxed">
              (2) Ist der Nutzer Kaufmann, juristische Person des öffentlichen Rechts oder
              öffentlich-rechtliches Sondervermögen, ist der Gerichtsstand für alle
              Streitigkeiten aus diesem Vertrag der Sitz des Anbieters (Berlin).
            </p>
            <p className="leading-relaxed">
              (3) Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, so bleibt
              die Wirksamkeit der übrigen Bestimmungen unberührt.
            </p>
          </section>

          <section>
            <p className="text-sm text-muted-foreground mt-8">
              Stand: April 2026
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
            <Link href="/widerrufsbelehrung" className="hover:text-foreground transition-colors">Widerruf</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ITEBV GmbH. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  );
}
