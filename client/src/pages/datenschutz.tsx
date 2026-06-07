import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { MarketingNav } from "@/components/marketing-nav";

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Datenschutzerklärung – MormorsBreve</title>
        <meta name="description" content="Datenschutzerklärung von MormorsBreve. Informationen zur Verarbeitung Ihrer Daten." />
        <link rel="canonical" href="https://mormorsbreve.dk/datenschutz" />
      </Helmet>
      <MarketingNav />

      <main className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Startseite
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-8">Datenschutzerklärung</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">1. Datenschutz auf einen Blick</h2>
            <h3 className="font-serif text-lg font-semibold mb-2">Allgemeine Hinweise</h3>
            <p className="leading-relaxed">
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
              personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene
              Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
              Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem
              Text aufgeführten Datenschutzerklärung.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">2. Verantwortliche Stelle</h2>
            <p className="leading-relaxed">
              Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
            </p>
            <p className="leading-relaxed">
              ITEBV GmbH<br />
              Zehntwerderweg 201A<br />
              13469 Berlin<br />
              <br />
              Telefon: +49 152 51874784<br />
              E-Mail: st@mes-beratung.de
            </p>
            <p className="leading-relaxed">
              Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder
              gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von
              personenbezogenen Daten (z. B. Namen, E-Mail-Adressen o. Ä.) entscheidet.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">3. Datenerfassung auf dieser Website</h2>

            <h3 className="font-serif text-lg font-semibold mb-2">Wer ist verantwortlich für die Datenerfassung?</h3>
            <p className="leading-relaxed">
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen
              Kontaktdaten können Sie dem Abschnitt „Verantwortliche Stelle" in dieser
              Datenschutzerklärung entnehmen.
            </p>

            <h3 className="font-serif text-lg font-semibold mb-2 mt-4">Wie erfassen wir Ihre Daten?</h3>
            <p className="leading-relaxed">
              Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei
              kann es sich z. B. um Daten handeln, die Sie bei der Registrierung oder beim Kauf
              von Credits eingeben.
            </p>
            <p className="leading-relaxed">
              Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der
              Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten
              (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs). Die
              Erfassung dieser Daten erfolgt automatisch, sobald Sie diese Website betreten.
            </p>

            <h3 className="font-serif text-lg font-semibold mb-2 mt-4">Wofür nutzen wir Ihre Daten?</h3>
            <p className="leading-relaxed">
              Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu
              gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet
              werden. Wenn Sie unseren Transkriptionsdienst nutzen, werden Ihre hochgeladenen
              Dokumente verarbeitet, um die gewünschte Dienstleistung zu erbringen.
            </p>

            <h3 className="font-serif text-lg font-semibold mb-2 mt-4">Welche Rechte haben Sie bezüglich Ihrer Daten?</h3>
            <p className="leading-relaxed">
              Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und
              Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem
              ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Sie eine
              Einwilligung zur Datenverarbeitung erteilt haben, können Sie diese Einwilligung
              jederzeit für die Zukunft widerrufen. Außerdem haben Sie das Recht, unter bestimmten
              Umständen die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu
              verlangen. Des Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen
              Aufsichtsbehörde zu.
            </p>
            <p className="leading-relaxed">
              Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie sich jederzeit an
              uns wenden.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">4. Hosting</h2>
            <p className="leading-relaxed">
              Wir hosten die Inhalte unserer Website bei <strong>Replit, Inc.</strong> (San Francisco, USA).
              Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den
              Servern des Hosters gespeichert. Hierbei kann es sich v. a. um IP-Adressen,
              Kontaktanfragen, Meta- und Kommunikationsdaten, Vertragsdaten, Kontaktdaten, Namen,
              Websitezugriffe und sonstige Daten, die über eine Website generiert werden, handeln.
            </p>
            <p className="leading-relaxed">
              Der Einsatz des Hosters erfolgt zum Zwecke der Vertragserfüllung gegenüber unseren
              potenziellen und bestehenden Kunden (Art. 6 Abs. 1 lit. b DSGVO) und im Interesse
              einer sicheren, schnellen und effizienten Bereitstellung unseres Online-Angebots
              durch einen professionellen Anbieter (Art. 6 Abs. 1 lit. f DSGVO). Weitere Informationen
              finden Sie in der Datenschutzerklärung von Replit unter{" "}
              <a href="https://replit.com/site/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://replit.com/site/privacy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">5. Allgemeine Hinweise und Pflichtinformationen</h2>

            <h3 className="font-serif text-lg font-semibold mb-2">Datenschutz</h3>
            <p className="leading-relaxed">
              Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst.
              Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den
              gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
            </p>
            <p className="leading-relaxed">
              Wenn Sie diese Website benutzen, werden verschiedene personenbezogene Daten erhoben.
              Personenbezogene Daten sind Daten, mit denen Sie persönlich identifiziert werden
              können. Die vorliegende Datenschutzerklärung erläutert, welche Daten wir erheben und
              wofür wir sie nutzen. Sie erläutert auch, wie und zu welchem Zweck das geschieht.
            </p>
            <h3 className="font-serif text-lg font-semibold mb-2 mt-4">SSL- bzw. TLS-Verschlüsselung</h3>
            <p className="leading-relaxed">
              Diese Website nutzt aus Sicherheitsgründen und zum Schutz der Übertragung
              personenbezogener Daten eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte
              Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von „http://"
              auf „https://" wechselt und an dem Schloss-Symbol in Ihrer Browserzeile.
              Wenn die SSL- bzw. TLS-Verschlüsselung aktiviert ist, können die Daten, die Sie
              an uns übermitteln, nicht von Dritten mitgelesen werden.
            </p>
            <p className="leading-relaxed">
              Wir weisen darauf hin, dass die Datenübertragung im Internet (z. B. bei der
              Kommunikation per E-Mail) Sicherheitslücken aufweisen kann. Ein lückenloser Schutz
              der Daten vor dem Zugriff durch Dritte ist nicht möglich.
            </p>

            <h3 className="font-serif text-lg font-semibold mb-2 mt-4">Widerruf Ihrer Einwilligung zur Datenverarbeitung</h3>
            <p className="leading-relaxed">
              Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung
              möglich. Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Die
              Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf
              unberührt.
            </p>

            <h3 className="font-serif text-lg font-semibold mb-2 mt-4">Recht auf Datenübertragbarkeit</h3>
            <p className="leading-relaxed">
              Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung oder in
              Erfüllung eines Vertrags automatisiert verarbeiten, an sich oder an einen Dritten in
              einem gängigen, maschinenlesbaren Format aushändigen zu lassen. Sofern Sie die
              direkte Übertragung der Daten an einen anderen Verantwortlichen verlangen, erfolgt
              dies nur, soweit es technisch machbar ist.
            </p>

            <h3 className="font-serif text-lg font-semibold mb-2 mt-4">Auskunft, Löschung und Berichtigung</h3>
            <p className="leading-relaxed">
              Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf
              unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren
              Herkunft und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf
              Berichtigung oder Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema
              personenbezogene Daten können Sie sich jederzeit an uns wenden.
            </p>

            <h3 className="font-serif text-lg font-semibold mb-2 mt-4">Recht auf Einschränkung der Verarbeitung</h3>
            <p className="leading-relaxed">
              Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen
              Daten zu verlangen. Hierzu können Sie sich jederzeit an uns wenden.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">6. Datenerfassung auf dieser Website</h2>

            <h3 className="font-serif text-lg font-semibold mb-2">Server-Log-Dateien</h3>
            <p className="leading-relaxed">
              Der Provider der Seiten erhebt und speichert automatisch Informationen in
              sogenannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt.
              Dies sind:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Browsertyp und Browserversion</li>
              <li>Verwendetes Betriebssystem</li>
              <li>Referrer URL</li>
              <li>Hostname des zugreifenden Rechners</li>
              <li>Uhrzeit der Serveranfrage</li>
              <li>IP-Adresse</li>
            </ul>
            <p className="leading-relaxed mt-2">
              Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen.
              Die Erfassung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
            </p>

            <h3 className="font-serif text-lg font-semibold mb-2 mt-4">Authentifizierung (Firebase Authentication)</h3>
            <p className="leading-relaxed">
              Für die Nutzung unseres Transkriptionsdienstes ist eine Anmeldung erforderlich. Wir
              nutzen hierfür <strong>Firebase Authentication</strong>, einen Dienst der Google Ireland
              Limited (Gordon House, Barrow Street, Dublin 4, Irland). Bei der Anmeldung werden
              Ihre E-Mail-Adresse und ggf. Ihr Name an Firebase übermittelt und dort gespeichert,
              um Ihr Nutzerkonto zu verwalten und Ihre erworbenen Credits zuzuordnen.
            </p>
            <p className="leading-relaxed">
              Google verarbeitet Ihre Daten ggf. auch in den USA. Google ist unter dem
              EU-US Data Privacy Framework zertifiziert. Weitere Informationen finden Sie in der
              Datenschutzerklärung von Google unter{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://policies.google.com/privacy
              </a>.
            </p>
            <p className="leading-relaxed">
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>

            <h3 className="font-serif text-lg font-semibold mb-2 mt-4">E-Mail-Kommunikation</h3>
            <p className="leading-relaxed">
              Im Rahmen der Nutzung unseres Dienstes versenden wir transaktionale E-Mails
              an die von Ihnen hinterlegte E-Mail-Adresse. Hierzu gehören:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Bestätigung Ihrer E-Mail-Adresse bei der Registrierung (über Firebase)</li>
              <li>E-Mails zum Zurücksetzen Ihres Passworts (über Firebase)</li>
              <li>Benachrichtigungen zu Angeboten für die Experten-Transkription</li>
            </ul>
            <p className="leading-relaxed mt-2">
              Für den Versand von Benachrichtigungen nutzen wir <strong>Resend</strong> (Resend, Inc.,
              San Francisco, USA). Dabei wird Ihre E-Mail-Adresse und der Nachrichteninhalt an
              Resend übermittelt. Es handelt sich ausschließlich um transaktionale E-Mails, die
              für die Erbringung unserer Dienstleistung erforderlich sind – es werden keine
              Werbe- oder Newsletter-E-Mails versendet.
            </p>
            <p className="leading-relaxed">
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>

            <h3 className="font-serif text-lg font-semibold mb-2 mt-4">Hochgeladene Dokumente</h3>
            <p className="leading-relaxed">
              Wenn Sie Dokumente zur Transkription hochladen, werden diese auf unseren Servern
              gespeichert, damit Sie Original und Transkription in Ihrem Konto abrufen können.
              Die transkribierten Texte werden Ihrem Nutzerkonto zugeordnet. Sie können einzelne
              Dokumente (inkl. der hochgeladenen Dateien) jederzeit in den Einstellungen löschen
              oder Ihr gesamtes Konto inklusive aller Daten löschen.
            </p>
            <p className="leading-relaxed">
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>

            <h3 className="font-serif text-lg font-semibold mb-2 mt-4">Cookies und lokale Speicherung</h3>
            <p className="leading-relaxed">
              Diese Website setzt technisch notwendige Cookies und speichert Einstellungen lokal,
              um die Funktionalität der Website zu gewährleisten. Darüber hinaus werden – sofern Sie
              über unseren Cookie-Banner einwilligen – Analyse- und Marketing-Cookies gesetzt
              (Google Analytics, Google Ads, Meta-Pixel). Ohne Ihre Einwilligung werden
              ausschließlich technisch notwendige Cookies verwendet.
            </p>
            <p className="leading-relaxed">
              <strong>Technisch notwendige Speicher:</strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li><strong>sidebar_state</strong> (Cookie): Speichert den Zustand der Seitenleiste (geöffnet/geschlossen). Speicherdauer: 7 Tage.</li>
              <li><strong>cookie-consent</strong> (localStorage): Speichert Ihre Cookie-Einwilligung („alle“ oder „notwendige“), damit der Cookie-Hinweis nicht erneut angezeigt wird.</li>
              <li><strong>mormorsbreve-theme</strong> (localStorage): Speichert Ihre gewählte Darstellung (Hell-/Dunkelmodus).</li>
            </ul>
            <p className="leading-relaxed mt-2">
              Rechtsgrundlage für technisch notwendige Cookies ist Art. 6 Abs. 1 lit. f DSGVO
              (berechtigtes Interesse an technischer Funktionsfähigkeit). Analyse- und
              Marketing-Cookies werden erst nach Ihrer Einwilligung gemäß Art. 6 Abs. 1 lit. a
              DSGVO gesetzt. Einzelheiten zu den eingesetzten Analyse- und Marketing-Diensten
              finden Sie in den folgenden Abschnitten.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">6a. Google Analytics und Google Ads</h2>

            <h3 className="font-serif text-lg font-semibold mb-2">Google Analytics 4</h3>
            <p className="leading-relaxed">
              Diese Website nutzt <strong>Google Analytics 4</strong> (Mess-ID: G-Q6VFLSZXVP), einen
              Webanalysedienst der Google Ireland Limited (Gordon House, Barrow Street, Dublin 4,
              Irland). Google Analytics verwendet Cookies und ähnliche Technologien, die eine
              Analyse Ihrer Nutzung der Website ermöglichen.
            </p>
            <p className="leading-relaxed">
              Die durch die Cookies erzeugten Informationen über Ihre Benutzung dieser Website
              werden in der Regel an einen Server von Google übertragen und dort gespeichert.
              Wir nutzen die IP-Anonymisierung, sodass Ihre IP-Adresse von Google innerhalb von
              Mitgliedstaaten der EU oder in anderen Vertragsstaaten des Abkommens über den EWR
              zuvor gekürzt wird.
            </p>
            <p className="leading-relaxed">
              <strong>Google Consent Mode v2:</strong> Wir setzen Google Consent Mode v2 ein.
              Das bedeutet, dass Google Analytics erst dann personenbezogene Daten erhebt, wenn
              Sie über unseren Cookie-Banner Ihre Einwilligung erteilt haben. Ohne Einwilligung
              werden keine Analyse-Cookies gesetzt und keine personenbezogenen Daten an Google
              übermittelt.
            </p>
            <p className="leading-relaxed">
              Rechtsgrundlage ist Ihre Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO. Sie können
              Ihre Einwilligung jederzeit widerrufen, indem Sie die Cookie-Einstellungen ändern
              oder Cookies in Ihrem Browser löschen.
            </p>

            <h3 className="font-serif text-lg font-semibold mb-2 mt-4">Google Ads (Conversion-Tracking)</h3>
            <p className="leading-relaxed">
              Wir nutzen <strong>Google Ads Conversion-Tracking</strong> (Conversion-ID:
              AW-10885539460), einen Dienst der Google Ireland Limited. Wenn Sie über eine
              Google-Anzeige auf unsere Website gelangen, wird ein Conversion-Cookie gesetzt.
              Diese Cookies verlieren nach 30 Tagen ihre Gültigkeit und dienen nicht der
              persönlichen Identifizierung. Sie helfen uns festzustellen, ob ein Nutzer bestimmte
              Aktionen auf unserer Website durchgeführt hat (z.&nbsp;B. einen Credit-Kauf).
            </p>
            <p className="leading-relaxed">
              Auch das Google Ads Conversion-Tracking wird erst nach Ihrer Einwilligung über den
              Cookie-Banner aktiviert (Google Consent Mode v2). Rechtsgrundlage ist Art. 6
              Abs. 1 lit. a DSGVO.
            </p>
            <p className="leading-relaxed">
              Weitere Informationen zum Datenschutz bei Google finden Sie unter{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://policies.google.com/privacy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">6b. Meta-Pixel (Facebook-Pixel)</h2>
            <p className="leading-relaxed">
              Diese Website nutzt das <strong>Meta-Pixel</strong> (Pixel-ID: 1701477651273920),
              ein Analysetool der Meta Platforms Ireland Limited (Merrion Road, Dublin 4, D04 X2K5,
              Irland; nachfolgend &bdquo;Meta&ldquo;). Das Meta-Pixel ermöglicht es uns, die
              Wirksamkeit unserer Werbeanzeigen auf Facebook und Instagram zu messen und
              nachzuvollziehen, welche Aktionen Besucher nach dem Klick auf eine Anzeige auf
              unserer Website durchführen (Conversion-Tracking).
            </p>
            <p className="leading-relaxed">
              <strong>Consent-Schutz:</strong> Das Meta-Pixel wird erst aktiviert, nachdem Sie über
              unseren Cookie-Banner Ihre Einwilligung erteilt haben. Ohne Ihre Einwilligung werden
              keine Daten an Meta übermittelt und keine Tracking-Cookies gesetzt. Technisch setzen
              wir die Funktion <code className="text-sm">fbq(&apos;consent&apos;, &apos;revoke&apos;)</code> ein,
              die das Tracking standardmäßig blockiert, bis Sie aktiv einwilligen.
            </p>
            <p className="leading-relaxed">
              Bei aktiviertem Pixel werden folgende Ereignisse erfasst:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li><strong>PageView</strong> – Seitenaufruf</li>
              <li><strong>InitiateCheckout</strong> – Beginn eines Credit-Kaufs</li>
              <li><strong>Purchase</strong> – Abschluss eines Credit-Kaufs (mit Kaufwert)</li>
            </ul>
            <p className="leading-relaxed mt-2">
              Die durch das Pixel erfassten Daten werden von Meta verarbeitet und können mit Ihrem
              Facebook- bzw. Instagram-Profil verknüpft werden. Dabei können Daten auch in die USA
              übermittelt werden (siehe Abschnitt 10 – Drittlandtransfer).
            </p>
            <p className="leading-relaxed">
              Rechtsgrundlage ist Ihre Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO. Sie können
              Ihre Einwilligung jederzeit widerrufen, indem Sie die Cookie-Einstellungen ändern
              oder Cookies in Ihrem Browser löschen.
            </p>
            <p className="leading-relaxed">
              Weitere Informationen zur Datenverarbeitung durch Meta finden Sie in der
              Datenschutzrichtlinie von Meta unter{" "}
              <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://www.facebook.com/privacy/policy/
              </a>.
              Sie können der Nutzung Ihrer Daten für Werbezwecke auch in Ihren
              Facebook-Werbeeinstellungen widersprechen:{" "}
              <a href="https://www.facebook.com/adpreferences/ad_settings" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://www.facebook.com/adpreferences/ad_settings
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">7. KI-gestützte Transkription (Anthropic Claude und Google Gemini)</h2>
            <p className="leading-relaxed">
              Für die Transkription Ihrer hochgeladenen Dokumente setzen wir
              Vision-Language-Modelle von zwei Anbietern ein. Welcher Anbieter konkret verwendet
              wird, kann je nach Verfügbarkeit, Qualität und Auslastung wechseln; insbesondere
              erfolgt bei Überlastung eines Anbieters automatisch ein Fallback auf den jeweils
              anderen. Die Transkriptionsergebnisse werden KI-generiert (Art. 50 der Verordnung
              (EU) 2024/1689 – EU AI Act).
            </p>
            <p className="leading-relaxed">
              <strong>Zeitpunkt der Verarbeitung:</strong> Die Übermittlung Ihrer hochgeladenen
              Dateien an die KI-Anbieter erfolgt <strong>bereits unmittelbar mit dem Upload</strong>
              {" "}und damit <strong>noch bevor Sie einen kostenpflichtigen Auftrag erteilen</strong>.
              Grund hierfür ist die kostenlose Vorschau- und Qualitätsprüfung, die wir automatisch
              nach dem Upload durchführen, damit Sie die zu erwartende Transkriptionsqualität vor
              dem Erwerb von Credits beurteilen können. Für die Vorschau wird eine erste Seite
              bzw. ein Ausschnitt Ihres Dokuments KI-gestützt analysiert und teil-transkribiert.
              Ohne diese automatische Analyse kann die Vorschaufunktion nicht bereitgestellt
              werden.
            </p>
            <p className="leading-relaxed">
              Rechtsgrundlage für die Verarbeitung im Rahmen der kostenlosen Vorschau ist
              Art. 6 Abs. 1 lit. b DSGVO (Durchführung vorvertraglicher Maßnahmen auf Ihre
              Anfrage) sowie Ihre Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO, die Sie durch
              das aktive Hochladen des Dokuments erteilen. Sie können diese Einwilligung jederzeit
              widerrufen, indem Sie das hochgeladene Dokument in den Einstellungen löschen; eine
              bereits begonnene Vorschau-Analyse lässt sich technisch nicht rückgängig machen.
            </p>

            <h3 className="font-serif text-lg font-semibold mb-2 mt-4">Anthropic (Claude)</h3>
            <p className="leading-relaxed">
              Wir nutzen die <strong>Claude Vision API</strong> der <strong>Anthropic PBC</strong>{" "}
              (548 Market St., PMB 90375, San Francisco, CA 94104, USA). Dabei werden Ihre
              hochgeladenen Bilder und PDF-Dateien an die Server von Anthropic in den USA
              übermittelt und dort durch ein KI-Modell verarbeitet.
            </p>
            <p className="leading-relaxed">
              Anthropic verarbeitet die übermittelten Daten nach eigenen Angaben ausschließlich zur
              Erbringung der Anfrage und nutzt API-Inhalte standardmäßig nicht zum Training der
              Modelle. Weitere Informationen finden Sie in der Datenschutzerklärung von Anthropic
              unter{" "}
              <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://www.anthropic.com/privacy
              </a>.
            </p>
            <p className="leading-relaxed">
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Der
              Drittlandtransfer in die USA erfolgt auf Grundlage von EU-Standardvertragsklauseln
              (Art. 46 Abs. 2 lit. c DSGVO) sowie ergänzend auf Grundlage von Art. 49 Abs. 1 lit. b
              DSGVO (Erforderlichkeit zur Vertragserfüllung). Siehe auch Abschnitt 10
              (Drittlandtransfer).
            </p>

            <h3 className="font-serif text-lg font-semibold mb-2 mt-4">Google (Gemini)</h3>
            <p className="leading-relaxed">
              Wir nutzen zusätzlich die <strong>Gemini API</strong> der <strong>Google Ireland
              Limited</strong> (Gordon House, Barrow Street, Dublin 4, Irland). Die Verarbeitung
              durch Google Ireland Limited erfolgt primär innerhalb des Europäischen
              Wirtschaftsraums (EWR); eine Weiterleitung an die Google LLC (Mountain View, USA)
              kann nicht vollständig ausgeschlossen werden.
            </p>
            <p className="leading-relaxed">
              Google verarbeitet die über die kostenpflichtige Gemini API übermittelten Daten
              nach eigenen Angaben ausschließlich zur Erbringung der Anfrage und nutzt diese
              standardmäßig nicht zur Verbesserung der Modelle. Weitere Informationen finden
              Sie in den Datenschutzhinweisen von Google unter{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://policies.google.com/privacy
              </a>{" "}
              sowie in den API-Nutzungsbedingungen unter{" "}
              <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://ai.google.dev/gemini-api/terms
              </a>.
            </p>
            <p className="leading-relaxed">
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Soweit eine
              Übermittlung in die USA stattfindet, ist Google LLC unter dem EU-US Data Privacy
              Framework zertifiziert (Angemessenheitsbeschluss der EU-Kommission gemäß Art. 45
              DSGVO); ergänzend werden EU-Standardvertragsklauseln verwendet. Siehe auch
              Abschnitt 10 (Drittlandtransfer).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">8. Experten-Transkription (Datenweitergabe an Dritte)</h2>
            <p className="leading-relaxed">
              Soweit Sie über unser Anfrageformular eine <strong>Experten-Transkription</strong>{" "}
              anfragen oder ein konkretes Expertenangebot annehmen, geben wir die zur Prüfung und
              Bearbeitung erforderlichen Daten an aktive Experten und/oder Partnerunternehmen
              weiter. Zweck der Weitergabe ist die Angebotsabgabe, die fachliche Bearbeitung Ihrer
              Dokumente sowie ggf. die Klärung fachlicher Rückfragen.
            </p>
            <p className="leading-relaxed mt-2">
              Folgende Daten werden an aktive Experten bzw. Partnerunternehmen
              übermittelt:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Ihre hochgeladenen Dokumente (Bilder/PDF-Dateien) einschließlich ggf. dort enthaltener personenbezogener Daten,</li>
              <li>bereits erstellte KI-Transkriptionen und Qualitäts-Vorschauen,</li>
              <li>Ihre im Anfrageformular gemachten Anmerkungen (z. B. Zeitraum, Region, besondere Wünsche),</li>
              <li>technische Angaben zur Anfrage (Dringlichkeit, Genauigkeitsgrad, Budget),</li>
              <li>Ihr Vor- und Nachname sowie Ihre Kontakt-E-Mail-Adresse, soweit zur Kommunikation erforderlich.</li>
            </ul>
            <p className="leading-relaxed mt-2">
              Die Daten werden auf der Plattform in einem gesicherten Bereich für berechtigte,
              aktive Experten zur Einsicht bereitgestellt. Experten und Partnerunternehmen sind
              vertraglich zur Vertraulichkeit und zur Einhaltung der DSGVO verpflichtet.
            </p>
            <p className="leading-relaxed">
              <strong>Kategorien von Empfängern:</strong> freie Mitarbeiter (Experten für
              historische Handschriften), Partnerunternehmen mit eigenem Transkriptionsangebot.
              Konkrete Empfänger können auf Anfrage mitgeteilt werden.
            </p>
            <p className="leading-relaxed">
              <strong>Rechtsgrundlage:</strong> Ihre ausdrückliche Einwilligung gemäß Art. 6
              Abs. 1 lit. a DSGVO, die Sie im Rahmen der Anfrage aktiv durch Anklicken
              entsprechender Einwilligungs-Felder erteilen. Ergänzend stützen wir die
              Verarbeitung auf Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Soweit Experten
              als Auftragsverarbeiter tätig werden, erfolgt die Verarbeitung auf Grundlage eines
              Vertrages nach Art. 28 DSGVO; soweit sie als eigene Verantwortliche tätig werden,
              erfolgt die Übermittlung auf Grundlage Ihrer Einwilligung und unter Beachtung von
              Art. 26 DSGVO bzw. getrennter Verantwortlichkeiten.
            </p>
            <p className="leading-relaxed">
              <strong>Widerruf:</strong> Sie können Ihre Einwilligung jederzeit mit Wirkung für
              die Zukunft widerrufen, z. B. per E-Mail an st@mes-beratung.de. Bereits begonnene
              Bearbeitungen werden abgeschlossen; noch nicht begonnene Bearbeitungen werden
              gestoppt. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt
              unberührt (Art. 7 Abs. 3 DSGVO).
            </p>
            <p className="leading-relaxed">
              <strong>Speicherdauer bei Experten:</strong> Die Daten werden beim aktiven
              Experten nur so lange gespeichert, wie dies zur Leistungserbringung und zur
              Abwicklung etwaiger Gewährleistungsansprüche erforderlich ist. Danach sind die
              Daten zu löschen, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
            </p>
            <p className="leading-relaxed">
              <strong>Besonders sensible Daten (Art. 9 DSGVO):</strong> Sie versichern bei der
              Beauftragung, dass Ihre Dokumente keine besonders sensiblen Daten Dritter (z. B.
              Gesundheits-, religiöse, politische, biometrische oder ethnische Daten) enthalten
              oder dass Sie zur Weitergabe solcher Daten berechtigt sind. Soweit
              erkennbar sensible Daten in den Dokumenten enthalten sind, werden diese mit
              besonderer Vertraulichkeit behandelt.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">9. Zahlungsabwicklung (Stripe)</h2>
            <p className="leading-relaxed">
              Für die Zahlungsabwicklung beim Kauf von Credits nutzen wir <strong>Stripe, Inc.</strong>
              {" "}(510 Townsend Street, San Francisco, CA 94103, USA) bzw. deren irische Tochtergesellschaft
              Stripe Payments Europe, Ltd. (1 Grand Canal Street Lower, Dublin 2, Irland). Beim
              Zahlungsvorgang werden die für die Abwicklung erforderlichen Daten (z. B. Name,
              E-Mail-Adresse, Zahlungsdaten) an Stripe übermittelt.
            </p>
            <p className="leading-relaxed">
              Stripe ist unter dem EU-US Data Privacy Framework zertifiziert.
              Weitere Informationen finden Sie in der Datenschutzerklärung von Stripe unter{" "}
              <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://stripe.com/de/privacy
              </a>.
            </p>
            <p className="leading-relaxed">
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">10. Drittlandtransfer</h2>
            <p className="leading-relaxed">
              Im Rahmen unserer Datenverarbeitung kann es zu Datenübermittlungen in Drittländer
              außerhalb des Europäischen Wirtschaftsraums (EWR), insbesondere in die USA, kommen.
              Die USA gelten grundsätzlich nicht als Land mit einem dem EU-Recht vergleichbaren
              Datenschutzniveau. Wir stützen diese Übermittlungen auf die nachfolgend genannten
              Garantien und Rechtsgrundlagen:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Google (Firebase Authentication, Analytics, Ads, ggf. Gemini):</strong> Die
                Verarbeitung erfolgt primär über die Google Ireland Limited (Dublin, Irland), also
                innerhalb des EWR. Soweit eine Weiterleitung an Google LLC (USA) stattfindet, ist
                Google LLC unter dem <strong>EU-US Data Privacy Framework</strong> (DPF) zertifiziert
                (Angemessenheitsbeschluss der EU-Kommission vom 10.07.2023, Art. 45 DSGVO).
                Ergänzend werden EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO)
                eingesetzt. Für Analytics und Ads wird Google Consent Mode v2 eingesetzt, sodass
                Daten erst nach Einwilligung übermittelt werden.
              </li>
              <li>
                <strong>Stripe:</strong> Die Verarbeitung erfolgt primär über die Stripe Payments
                Europe, Ltd. (Dublin, Irland). Die Stripe, Inc. (USA) ist unter dem EU-US Data
                Privacy Framework zertifiziert. Ergänzend bestehen EU-Standardvertragsklauseln.
              </li>
              <li>
                <strong>Anthropic PBC (USA):</strong> Anthropic ist derzeit nicht unter dem
                EU-US Data Privacy Framework zertifiziert. Der Datentransfer erfolgt daher
                primär auf Grundlage der von Anthropic bereitgestellten <strong>
                EU-Standardvertragsklauseln</strong> (Art. 46 Abs. 2 lit. c DSGVO) sowie zusätzlich
                auf Grundlage von Art. 49 Abs. 1 lit. b DSGVO (Erforderlichkeit zur
                Vertragserfüllung der von Ihnen angeforderten Transkription).
              </li>
              <li>
                <strong>Replit, Inc. (USA):</strong> Der Datentransfer erfolgt auf Grundlage der
                vom Hoster bereitgestellten EU-Standardvertragsklauseln
                (Art. 46 Abs. 2 lit. c DSGVO) sowie auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO
                (berechtigtes Interesse an einem zuverlässigen Hosting-Anbieter).
              </li>
              <li>
                <strong>Resend, Inc. (USA):</strong> Der Transfer erfolgt auf Grundlage von
                Art. 49 Abs. 1 lit. b DSGVO (Erforderlichkeit zur Vertragserfüllung, konkret zum
                Versand von transaktionalen E-Mails an Sie) sowie EU-Standardvertragsklauseln,
                soweit diese bereitgestellt werden.
              </li>
              <li>
                <strong>Meta Platforms Ireland Limited (Irland) / Meta Platforms, Inc. (USA):</strong>{" "}
                Die Verarbeitung durch das Meta-Pixel erfolgt primär über die Meta Platforms
                Ireland Limited (Dublin, Irland). Die Meta Platforms, Inc. (USA) ist unter dem{" "}
                <strong>EU-US Data Privacy Framework</strong> zertifiziert
                (Angemessenheitsbeschluss der EU-Kommission, Art. 45 DSGVO). Ergänzend bestehen
                EU-Standardvertragsklauseln. Das Meta-Pixel wird erst nach Ihrer Einwilligung
                aktiviert.
              </li>
            </ul>
            <p className="leading-relaxed mt-3">
              Bitte beachten Sie, dass bei einer Datenübermittlung in die USA ein Risiko besteht,
              dass US-Behörden auf Grundlage nationaler Gesetze (z. B. CLOUD Act, FISA 702) auf
              die Daten zugreifen können, ohne dass den Betroffenen stets wirksame Rechtsbehelfe
              zur Verfügung stehen. Vor jeder Übermittlung, die nicht durch einen
              Angemessenheitsbeschluss gedeckt ist, führen wir eine Risikoprüfung
              (Transfer Impact Assessment) durch und setzen – soweit erforderlich – zusätzliche
              technische und organisatorische Schutzmaßnahmen um (z. B. Verschlüsselung bei
              Übertragung, Zugriffsbeschränkungen).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">11. Speicherdauern</h2>
            <p className="leading-relaxed">
              Wir speichern Ihre personenbezogenen Daten nur so lange, wie es für die jeweiligen
              Verarbeitungszwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li><strong>Server-Log-Dateien:</strong> 30 Tage, danach automatische Löschung.</li>
              <li><strong>Hochgeladene Bilder/Dokumente:</strong> Werden auf dem Server gespeichert, solange Sie das zugehörige Dokument in Ihrem Konto behalten. Sie können einzelne Dokumente jederzeit selbst löschen; dabei werden die zugehörigen Bilddateien vom Server entfernt. Bei vollständiger Kontolöschung werden alle Ihre Daten unverzüglich gelöscht.</li>
              <li><strong>Transkriptionsergebnisse:</strong> Bis der Nutzer diese löscht oder das Konto löscht.</li>
              <li><strong>Nutzerkonto-Daten:</strong> Bis zur Löschung des Kontos durch den Nutzer. Bei Kontolöschung werden alle personenbezogenen Daten unverzüglich gelöscht.</li>
              <li><strong>Rechnungs- und Zahlungsdaten:</strong> 10 Jahre nach Vertragsende gemäß handels- und steuerrechtlichen Aufbewahrungspflichten (§ 147 AO, § 257 HGB).</li>
              <li><strong>Cookies und lokale Speicherung:</strong> Siehe Abschnitt 6 (Cookies und lokale Speicherung).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">12. Änderung dieser Datenschutzerklärung</h2>
            <p className="leading-relaxed">
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den
              aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer
              Leistungen in der Datenschutzerklärung umzusetzen. Für Ihren erneuten Besuch gilt
              dann die neue Datenschutzerklärung.
            </p>
          </section>

          <section>
            <p className="text-sm text-muted-foreground mt-8">
              Stand: Mai 2026
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
