import React from "react";
import { Link } from "wouter";

export const BLOG_META_DE: Record<string, { title: string; description: string }> = {
  "tyde-gotisk-skrift-guide": {
    title: "Gotische Schrift entziffern: Anleitung für Anfänger",
    description:
      "Lernen Sie, gotische Schrift zu entziffern: Alphabet, typische Stolperfallen und praktische Übungen. So lesen Sie alte Briefe, Tagebücher und Kirchenbücher von vor 1875.",
  },
  "slaegtsforskning-for-begyndere": {
    title: "Ahnenforschung für Anfänger: ein guter Einstieg",
    description:
      "Ahnenforschung für Anfänger: Finden Sie Ihre Vorfahren in Kirchenbüchern und Volkszählungen auf Arkivalieronline – und entziffern Sie die gotische Schrift, die den Weg versperrt.",
  },
  "gammel-dansk-retskrivning": {
    title: "Alte dänische Rechtschreibung: Aa, Å und Substantive mit großem Anfangsbuchstaben",
    description:
      "Verstehen Sie die alte dänische Rechtschreibung: warum dort »Aa« statt »Å« steht und warum Substantive vor der Reform von 1948 großgeschrieben wurden.",
  },
  "kirkeboeger-folketaellinger-laese": {
    title: "Kirchenbücher und Volkszählungen lesen: eine praktische Anleitung",
    description:
      "So finden und lesen Sie Kirchenbücher und Volkszählungen auf Arkivalieronline – und entziffern die gotische Schrift, die Ihre Vorfahren verborgen hält.",
  },
  "udvandrerbreve-historie": {
    title: "Auswandererbriefe: die Geschichte derer, die nach Amerika reisten",
    description:
      "Über 300.000 Dänen wanderten nach Amerika aus. Ihre Briefe nach Hause sind unschätzbar wertvoll – aber in gotischer Schrift verfasst. Lernen Sie die Geschichte kennen und lassen Sie die Briefe entziffern.",
  },
  "oversaet-gamle-breve": {
    title: "Alte Briefe übersetzen: von gotischer Schrift zu lesbarem Text",
    description:
      "So machen Sie alte Briefe in gotischer Schrift lesbar und lassen sie übersetzen – ins moderne Dänisch oder ins Englische für Familie im Ausland.",
  },
  "soenderjylland-familiehistorie": {
    title: "Sønderjylland: Familiengeschichte von 1864 bis zur Wiedervereinigung 1920",
    description:
      "Die Geschichte sønderjütländischer Familien vom Niederlage von 1864 bis zur Wiedervereinigung 1920 – erzählt in Briefen und Tagebüchern in gotischer Schrift. So entziffern Sie sie.",
  },
  "gamle-maal-og-forkortelser": {
    title: "Alte Maße und Abkürzungen in handschriftlichen Rezepten und Dokumenten",
    description:
      "Pfund, Lot, Pægl und Quint: Verstehen Sie die alten dänischen Maße und Abkürzungen, die Ihnen in Großmutters Kochbuch und in alten Dokumenten begegnen.",
  },
};

export const BLOG_CONTENT_DE: Record<string, React.ReactNode> = {
  "tyde-gotisk-skrift-guide": (
    <>
      <p className="leading-relaxed mb-4">
        Viele Familien besitzen Briefe, Tagebücher oder Kirchenbücher in <strong>gotischer Schrift</strong> – niedergeschrieben von Großeltern oder Urgroßeltern vor etwa 1875. Die Schrift wirkt auf den ersten Blick fremd und schwer lesbar. Doch mit etwas Übung und dem richtigen <strong>gotischen Alphabet</strong> können Sie schon bald die ersten Wörter und Sätze entziffern. Diese Anleitung gibt eine praktische Einführung in das Lesen gotischer Schrift.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Was ist gotische Schrift?</h2>
      <p className="leading-relaxed mb-4">
        Die gotische Handschrift (auch gotische Schrift genannt) war jahrhundertelang die übliche Schreibschrift in Dänemark. Sie war bis zur Schulreform um 1875 Standard in den Schulen, danach übernahm die lateinische Schrift. Deshalb sind nahezu alle alten dänischen Dokumente vor 1875 – Kirchenbücher, Volkszählungen, Urkunden und private Briefe – mit gotischen Buchstaben geschrieben.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Das gotische Alphabet: die wichtigsten Buchstaben</h2>
      <p className="leading-relaxed mb-4">
        Wenn Sie gotische Schrift entziffern möchten, hilft es, die typischen Formen zu kennen. Viele Kleinbuchstaben ähneln einander: ein <strong>e</strong> sieht oft aus wie ein <strong>n</strong>, und ein <strong>u</strong> unterscheidet sich nur durch einen kleinen Bogen darüber von einem <strong>n</strong>. Das lange <strong>ſ</strong> kann mit f und h verwechselt werden. Die Großbuchstaben weichen stärker von der heutigen lateinischen Schrift ab. Der beste Rat: Drucken Sie ein gotisches Alphabet aus und legen Sie es beim Lesen neben sich.
      </p>
      <h3 className="font-serif text-lg font-semibold mt-6 mb-2">Praktische Tipps zum Üben</h3>
      <p className="leading-relaxed mb-4">
        Beginnen Sie mit kurzen, gut leserlichen Texten: einer Postkarte oder einem kurzen Briefabschnitt. Lesen Sie Wort für Wort und vergleichen Sie unsichere Buchstaben mit dem Alphabet. Bei schwierigen Stellen hilft es, das Wort aus dem Zusammenhang zu erraten: Namen, Ortsnamen und wiederkehrende Wendungen (»Liebe(r)…«, »Ihre(r) ergebene(r)«) tauchen oft wieder auf und erleichtern das Entziffern. Möchten Sie die Lernkurve überspringen, können Sie Ihre Dokumente von einem Dienst wie <Link href="/">MormorsBreve</Link> entziffern lassen – so erhalten Sie sofort einen lesbaren Text.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Denken Sie an die alte Rechtschreibung</h2>
      <p className="leading-relaxed mb-4">
        Wenn Sie gotische Schrift entziffern, stoßen Sie auf die alte Rechtschreibung: Vor der Reform von 1948 schrieb man »Aa« statt »Å«, und alle Substantive begannen mit einem großen Buchstaben. Das sind keine Fehler, sondern die damals korrekte Schreibweise. Mehr dazu in unserem Artikel über <Link href="/blog/gammel-dansk-retskrivning" className="text-primary hover:underline">alte dänische Rechtschreibung</Link>.
      </p>
      <p className="leading-relaxed mb-4">
        Haben Sie viele Seiten in gotischer Schrift und wenig Zeit? Mit <Link href="/">MormorsBreve</Link> laden Sie einfach Fotos oder Scans hoch und erhalten in wenigen Minuten eine lesbare Transkription – die ersten Seiten kostenlos zum Ausprobieren.
      </p>
    </>
  ),

  "slaegtsforskning-for-begyndere": (
    <>
      <p className="leading-relaxed mb-4">
        Die eigene Abstammung zu erforschen ist wie eine Reise in die Vergangenheit. Mit wenigen Klicks können Sie heute Ihre <strong>Vorfahren</strong> in digitalisierten Quellen finden – doch früher oder später stoßen die meisten an dieselbe Mauer: die <strong>gotische Schrift</strong>. Diese Anleitung zeigt Ihnen, wie Sie gut in die Ahnenforschung einsteigen und was Sie tun, wenn die Schrift unlesbar wird.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Beginnen Sie mit dem, was Sie wissen</h2>
      <p className="leading-relaxed mb-4">
        Beginnen Sie bei sich selbst und arbeiten Sie rückwärts: Eltern, Großeltern, Urgroßeltern. Notieren Sie Namen, Geburtsjahre und Orte. Fragen Sie ältere Familienmitglieder und suchen Sie zu Hause nach alten Papieren – Taufurkunden, Briefen, Tagebüchern. Jeder Name und jede Jahreszahl ist ein Faden, dem Sie weiter zurück folgen können.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Die wichtigsten Quellen: Kirchenbücher und Volkszählungen</h2>
      <p className="leading-relaxed mb-4">
        Das Rückgrat der dänischen Ahnenforschung sind die <strong>Kirchenbücher</strong> (Taufen, Trauungen, Beerdigungen) und die <strong>Volkszählungen</strong> ab 1787. Die meisten sind digitalisiert und frei zugänglich auf Arkivalieronline des Reichsarchivs. Das Problem ist nur, dass die Quellen vor 1875 in gotischer Handschrift verfasst sind. Mehr darüber, wie Sie sich in ihnen zurechtfinden, in unserem Artikel über das <Link href="/blog/kirkeboeger-folketaellinger-laese" className="text-primary hover:underline">Lesen von Kirchenbüchern und Volkszählungen</Link>.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Wenn die Schrift den Weg versperrt</h2>
      <p className="leading-relaxed mb-4">
        Hier kommen viele ins Stocken: Die Quelle ist da, aber die gotische Schrift lässt sich nicht entziffern. Sie können entweder selbst lernen, die Schrift zu lesen – siehe unsere <Link href="/blog/tyde-gotisk-skrift-guide" className="text-primary hover:underline">Anleitung zum Entziffern gotischer Schrift</Link> – oder Sie laden ein Foto der Seite zu <Link href="/">MormorsBreve</Link> hoch und erhalten in Minuten einen lesbaren Text. Viele Ahnenforscher nutzen KI, um schnell weiterzukommen, und sparen ihre Kräfte für die eigentliche Detektivarbeit.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Speichern und teilen Sie Ihre Funde</h2>
      <p className="leading-relaxed mb-4">
        Tragen Sie Ihre Funde in ein Ahnenprogramm oder eine einfache Tafel ein und speichern Sie immer einen Verweis auf die Quelle. So können Sie – und Ihre Nachkommen – immer wieder zurückfinden. Und denken Sie daran: Hinter jedem Namen verbirgt sich ein Mensch und eine Geschichte. Ein entzifferter Brief kann mehr über einen Vorfahren erzählen als zehn Jahreszahlen.
      </p>
    </>
  ),

  "gammel-dansk-retskrivning": (
    <>
      <p className="leading-relaxed mb-4">
        Wenn Sie alte dänische Dokumente lesen, stoßen Sie schnell auf Schreibweisen, die für heutige Augen falsch aussehen: <strong>»Aar«</strong> statt »år« und Substantive wie <strong>»Manden«</strong> und <strong>»Huset«</strong> großgeschrieben. Das sind keine Fehler – es ist die damals korrekte Rechtschreibung. Dieser Artikel erklärt die wichtigsten Unterschiede.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">»Aa« statt »Å«</h2>
      <p className="leading-relaxed mb-4">
        Der Buchstabe <strong>Å</strong> wurde erst mit der Rechtschreibreform von 1948 offiziell ins Dänische eingeführt. Davor schrieb man den Laut mit Doppel-a: »Aar« (år/Jahr), »Maal« (mål/Maß), »paa« (på/auf). Wenn Sie einen Text aus der Zeit vor 1948 entziffern, müssen Sie also »Aa« erwarten – und eine gute Transkription bewahrt das, damit der Text dem Original treu bleibt.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Substantive mit großem Anfangsbuchstaben</h2>
      <p className="leading-relaxed mb-4">
        Bis zur Reform von 1948 wurden <strong>alle Substantive</strong> mit großem Anfangsbuchstaben geschrieben – wie im heutigen Deutsch. »Manden gik over Marken til Kirken« stünde also mit drei großen Buchstaben. Das ist eines der deutlichsten Merkmale dafür, dass ein Text alt ist, und es ist wichtig zu wissen, damit man es nicht als zufällige Schreibweise fehldeutet.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Die Reform von 1948</h2>
      <p className="leading-relaxed mb-4">
        Die Rechtschreibreform vom 1. Oktober 1948 veränderte die dänische Schriftsprache erheblich: Substantive bekamen einen kleinen Anfangsbuchstaben, »Aa« wurde zu »Å«, und einzelne Verbformen wurden modernisiert. Texte von vor und nach der Reform sehen daher auffallend unterschiedlich aus – ein nützlicher Anhaltspunkt, wenn Sie ein undatiertes Dokument datieren möchten.
      </p>
      <p className="leading-relaxed mb-4">
        Möchten Sie einen alten Text lesbar machen lassen, ohne sich selbst um die Regeln kümmern zu müssen? <Link href="/">MormorsBreve</Link> entziffert die gotische Schrift und bewahrt die historische Rechtschreibung – laden Sie ein Foto hoch und sehen Sie die ersten Seiten kostenlos.
      </p>
    </>
  ),

  "kirkeboeger-folketaellinger-laese": (
    <>
      <p className="leading-relaxed mb-4">
        <strong>Kirchenbücher</strong> und <strong>Volkszählungen</strong> sind die beiden wichtigsten Quellen der dänischen Ahnenforschung. Die meisten sind digitalisiert und kostenlos zugänglich – aber sie sind in gotischer Handschrift verfasst, die heute nur die wenigsten lesen können. Hier ist eine praktische Anleitung, um sie zu finden und zu entziffern.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Kirchenbücher: Taufen, Trauungen und Beerdigungen</h2>
      <p className="leading-relaxed mb-4">
        Die Pfarrer haben jahrhundertelang Kirchenbücher geführt. Sie enthalten Taufen (mit den Namen der Eltern und Paten), Trauungen und Beerdigungen – Gold für den Ahnenforscher. Die Bücher vor 1875 sind in gotischer Schrift verfasst, oft mit Abkürzungen und lateinischen Wendungen. Ein einziger Taufeintrag kann Sie eine ganze Generation weiter zurückführen.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Volkszählungen: eine Momentaufnahme des Haushalts</h2>
      <p className="leading-relaxed mb-4">
        Die Volkszählungen, die ab 1787 durchgeführt wurden (1801, 1834, 1840 und folgende), listen alle Personen eines Haushalts mit Alter, Stellung und Verhältnis zum Familienoberhaupt auf. Sie sind großartig, um eine Familie an einem Ort und zu einem Zeitpunkt zusammenzuführen – aber auch die ältesten sind in gotischer Handschrift.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">So finden Sie sie auf Arkivalieronline</h2>
      <p className="leading-relaxed mb-4">
        Arkivalieronline des Reichsarchivs bietet freien Zugang zu den digitalisierten Quellen. Sie navigieren in der Regel über Kirchspiel und Jahr. Wenn Sie die richtige Seite gefunden haben, können Sie einen Screenshot machen oder das Bild herunterladen – und falls die Schrift Schwierigkeiten bereitet, es zu <Link href="/">MormorsBreve</Link> hochladen, um einen lesbaren Text zu erhalten.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Wenn die gotische Schrift Schwierigkeiten bereitet</h2>
      <p className="leading-relaxed mb-4">
        Selbst erfahrene Ahnenforscher brauchen Zeit, um schwierige Handschriften zu entziffern. Lernen Sie es selbst mit unserer <Link href="/blog/tyde-gotisk-skrift-guide" className="text-primary hover:underline">Anleitung zur gotischen Schrift</Link>, oder lassen Sie die KI das Entziffern übernehmen, damit Sie sich auf den Aufbau des Stammbaums konzentrieren können. Sind Sie ganz neu, beginnen Sie mit <Link href="/blog/slaegtsforskning-for-begyndere" className="text-primary hover:underline">Ahnenforschung für Anfänger</Link>.
      </p>
    </>
  ),

  "udvandrerbreve-historie": (
    <>
      <p className="leading-relaxed mb-4">
        Zwischen 1860 und 1920 verließen mehr als <strong>300.000 Dänen</strong> ihre Heimat, um in den USA ihr Glück zu suchen. Die Briefe, die sie nach Hause schrieben, gehören zu den ergreifendsten Zeugnissen, die eine Familie besitzen kann – aber sie sind oft in gotischer Schrift verfasst, die die Nachkommen heute nicht lesen können.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Die große Auswanderung</h2>
      <p className="leading-relaxed mb-4">
        Besonders aus Sønderjylland und dem westlichen Jütland reisten Tausende Dänen über den Atlantik. Für die meisten war es ein Abschied für immer. Der Brief wurde zur Lebenslinie zwischen zwei Welten: Familien warteten wochen- und monatelang auf Nachrichten aus Chicago, Iowa oder Nebraska, und die Briefe wurden laut vorgelesen und wie Schätze aufbewahrt.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Was die Briefe erzählen</h2>
      <p className="leading-relaxed mb-4">
        Die Auswandererbriefe umfassen ganze Leben: den Traum von Land und Arbeit, das Heimweh, die Freude über ein neugeborenes Kind, die Trauer über einen Todesfall in weiter Ferne. Sie mischen oft Dänisch mit einzelnen englischen Wörtern, die der Auswanderer übernommen hatte. Für den heutigen Leser sind sie ein direktes Fenster in die innersten Gedanken eines Vorfahren.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Machen Sie die Briefe wieder lesbar</h2>
      <p className="leading-relaxed mb-4">
        Die Briefe sind in der gotischen Handschrift verfasst, die die Auswanderer vor 1875 in der Schule lernten. Mit <Link href="/">MormorsBreve</Link> können Sie ein Foto hochladen und den Text in Minuten lesbar machen lassen – und ins Englische übersetzt, damit auch die amerikanischen Nachkommen mitlesen können. Lesen Sie auch unsere Seite über <Link href="/udvandrerbreve-fra-amerika" className="text-primary hover:underline">Auswandererbriefe aus Amerika</Link>.
      </p>
      <p className="leading-relaxed mb-4">
        Ein einziger entzifferter Brief kann das Selbstverständnis einer Familie verändern. Geben Sie die Geschichte weiter, bevor die Schrift ganz in Vergessenheit gerät.
      </p>
    </>
  ),

  "oversaet-gamle-breve": (
    <>
      <p className="leading-relaxed mb-4">
        Ein alter Brief in <strong>gotischer Schrift</strong> kann sich wie eine verschlossene Tür anfühlen. Sie können ihn in der Hand halten, aber nicht lesen, was darin steht. Dieser Artikel erklärt, wie Sie alte Briefe entziffern lassen – und übersetzen, wenn die Familie über die Welt verstreut wohnt.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Erst entziffern, dann verstehen</h2>
      <p className="leading-relaxed mb-4">
        Einen alten Brief lesbar zu machen geschieht in zwei Schritten. Zuerst wird die gotische Schrift in Buchstaben entziffert, die wir heute lesen können. Anschließend kann der Text übersetzt werden – etwa vom alten Dänisch ins moderne Dänisch oder in eine ganz andere Sprache. MormorsBreve erledigt beides in einem Arbeitsgang.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Drei Versionen für verschiedene Zwecke</h2>
      <p className="leading-relaxed mb-4">
        Sie erhalten den Text in drei Fassungen: originalgetreu (gut für die Ahnenforschung), KI-ergänzt (Lücken sinnvoll gefüllt) und freie Deutung (flüssiges modernes Dänisch, gut zum Vorlesen). So entscheiden Sie selbst, wie nah am Original Sie bleiben möchten.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Übersetzung für Familie im Ausland</h2>
      <p className="leading-relaxed mb-4">
        Wohnen Verwandte im Ausland – etwa Nachkommen <Link href="/blog/udvandrerbreve-historie" className="text-primary hover:underline">dänischer Auswanderer in Amerika</Link> –, kann der Text ohne Aufpreis ins Englische oder in über 30 weitere Sprachen übersetzt werden. So kann die ganze Familie mitlesen, ganz gleich, wo sie wohnt.
      </p>
      <p className="leading-relaxed mb-4">
        Laden Sie ein Foto des Briefes zu <Link href="/">MormorsBreve</Link> hoch und sehen Sie die ersten Seiten kostenlos. Bereitet die gotische Schrift Schwierigkeiten, beginnen Sie mit unserer <Link href="/blog/tyde-gotisk-skrift-guide" className="text-primary hover:underline">Anleitung zum Entziffern gotischer Schrift</Link>.
      </p>
    </>
  ),

  "soenderjylland-familiehistorie": (
    <>
      <p className="leading-relaxed mb-4">
        Nur wenige Orte in Dänemark haben eine so dramatische Familiengeschichte wie <strong>Sønderjylland</strong>. Von der Niederlage 1864 bis zur Wiedervereinigung 1920 lebten sønderjütländische Familien zwischen zwei Ländern – und ihre Erlebnisse finden sich in Briefen und Tagebüchern in gotischer Schrift, die viele Nachkommen noch besitzen.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Eine Landesteil unter fremder Herrschaft</h2>
      <p className="leading-relaxed mb-4">
        Die Niederlage von 1864 kostete Dänemark Sønderjylland, und über ein halbes Jahrhundert lang lebten dänische Sønderjüten unter deutscher Herrschaft. Die Sprache in Schule und Verwaltung wurde Deutsch, während viele innerhalb der eigenen vier Wände am Dänischen festhielten. Das hinterließ tiefe Spuren in den Familien – und in ihren Briefen.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Briefe über eine Grenze hinweg</h2>
      <p className="leading-relaxed mb-4">
        Sønderjütländische Familiendokumente aus dieser Zeit sind oft in gotischer Handschrift, die der dänischen und der deutschen Schultradition gemeinsam war. Manche Briefe sind auf Dänisch, andere auf Deutsch, und viele wechseln zwischen den Sprachen. Junge Sønderjüten wurden in die deutsche Armee eingezogen und schrieben während des Ersten Weltkriegs von der Front nach Hause.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Die Wiedervereinigung 1920</h2>
      <p className="leading-relaxed mb-4">
        Als die Wiedervereinigung 1920 kam, war sie der Höhepunkt der Hoffnungen mehrerer Generationen. Ein entzifferter Brief oder ein Tagebuch aus jener Zeit kann zeigen, wie eine Familie die Grenze, den Krieg und die Wiedervereinigung erlebte – von innen gesehen, mit den Worten gewöhnlicher Menschen.
      </p>
      <p className="leading-relaxed mb-4">
        Mit <Link href="/">MormorsBreve</Link> können Sie sønderjütländische Dokumente entziffern lassen, ob auf Dänisch oder Deutsch, und übersetzen, damit die ganze Familie mitlesen kann. Sehen Sie auch unsere Seite über <Link href="/soenderjylland-1864-genforeningen" className="text-primary hover:underline">Sønderjylland 1864–1920</Link>.
      </p>
    </>
  ),

  "gamle-maal-og-forkortelser": (
    <>
      <p className="leading-relaxed mb-4">
        Wenn Sie ein altes <strong>Kochbuch</strong> oder ein altes Dokument entziffern, ist die gotische Schrift nur die eine Herausforderung. Die andere sind die <strong>alten Maße und Abkürzungen</strong>, die niemand mehr verwendet. Dieser Artikel hilft Ihnen, sie zu verstehen.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Alte dänische Maße</h2>
      <p className="leading-relaxed mb-4">
        Vor dem metrischen System verwendete man Maße wie <strong>Pfund</strong> (ca. 500 g), <strong>Lot</strong> (ca. 15 g), <strong>Quint</strong> und <strong>Pægl</strong> (ein Hohlmaß für Flüssigkeiten, ca. 0,24 Liter). In Rezepten steht oft »ein halbes Pfund Butter« oder »eine Pægl Sahne«. Die Umrechnung zu kennen ist entscheidend, wenn Sie Großmutters Kuchen nach dem Original backen möchten.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Typische Abkürzungen</h2>
      <p className="leading-relaxed mb-4">
        Weil der Schreibende es für sich selbst tat, wimmelt es in alten Rezepten von Abkürzungen, die nie erklärt werden: »Spsk.« für Esslöffel, »tsk.« für Teelöffel, »Pd.« für Pfund. Mengenangaben sind oft vage – »nach Belieben« oder »wie üblich« steht dort, wo heute eine genaue Anweisung stünde.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Mehr als nur Essen</h2>
      <p className="leading-relaxed mb-4">
        Ein handgeschriebenes Kochbuch ist oft auch eine Familienchronik, mit Notizen, Daten und Grüßen zwischen den Rezepten. Mehr dazu auf unserer Seite über das <Link href="/gamle-opskrifter-tyde" className="text-primary hover:underline">Entziffern alter Rezepte</Link>.
      </p>
      <p className="leading-relaxed mb-4">
        Möchten Sie Großmutters Kochbuch lesbar machen lassen? <Link href="/">MormorsBreve</Link> entziffert die gotische Schrift, damit die Rezepte zurück auf den Küchentisch kommen – laden Sie ein Foto hoch und probieren Sie die ersten Seiten kostenlos.
      </p>
    </>
  ),

};
