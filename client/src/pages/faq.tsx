import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { ArrowRight, HelpCircle } from "lucide-react";
import { Logo } from "@/components/logo";
import { MarketingNav } from "@/components/marketing-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_CATEGORIES, FAQ_ITEMS } from "@/data/faq-items";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Häufige Fragen (FAQ) – MormorsBreve</title>
        <meta
          name="description"
          content="Antworten auf häufige Fragen zur Transkription alter Handschriften: Sütterlin, Kurrent, Kosten, Datenschutz, Bezahlung und mehr. Verständlich erklärt."
        />
        <link rel="canonical" href="https://mormorsbreve.dk/faq" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:title" content="Häufige Fragen (FAQ) – MormorsBreve" />
        <meta
          property="og:description"
          content="Antworten auf häufige Fragen zur Transkription alter Handschriften: Sütterlin, Kurrent, Kosten, Datenschutz und mehr."
        />
        <meta property="og:url" content="https://mormorsbreve.dk/faq" />
      </Helmet>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <MarketingNav activeLink="faq" />

      <main className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 inline-flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            Häufige Fragen
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
            Antworten auf die wichtigsten Fragen
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Hier finden Sie alles, was Sie wissen sollten — verständlich erklärt.
            Falls Ihre Frage nicht dabei ist, schreiben Sie uns einfach.
          </p>
        </div>

        <div className="space-y-10">
          {FAQ_CATEGORIES.map((category) => (
            <section key={category.title}>
              <h2 className="font-serif text-xl font-semibold mb-3 text-foreground/90">
                {category.title}
              </h2>
              <Accordion type="multiple" className="w-full">
                {category.items.map((item, idx) => (
                  <AccordionItem
                    key={item.question}
                    value={`${category.title}-${idx}`}
                    data-testid={`faq-item-${category.title.toLowerCase().replace(/\s/g, "-")}-${idx}`}
                  >
                    <AccordionTrigger className="text-left text-base sm:text-lg font-semibold py-5 hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground leading-relaxed pb-5">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>

        <div className="mt-12 text-center p-6 rounded-xl border border-border bg-card">
          <p className="text-muted-foreground mb-4">
            Noch Fragen? Probieren Sie MormorsBreve einfach selbst aus —
            die ersten 3 Seiten sind kostenlos.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/analysieren">
              <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white">
                Jetzt kostenlos testen
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/">
              <Button size="lg" variant="outline">
                Zur Startseite
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <Logo height="h-6" />
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Startseite</Link>
            <Link href="/beispiele" className="hover:text-foreground transition-colors">Beispiele</Link>
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link href="/impressum" className="hover:text-foreground transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</Link>
            <Link href="/agb" className="hover:text-foreground transition-colors">AGB</Link>
            <Link href="/widerrufsbelehrung" className="hover:text-foreground transition-colors">Widerruf</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} MormorsBreve. Alle rettigheder forbeholdes.
          </p>
        </div>
      </footer>
    </div>
  );
}
