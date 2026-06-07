import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  Check,
  FileText,
  Upload,
  Languages,
  ShieldCheck,
  Lock,
  Headphones,
  ScrollText,
  ImagePlus,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/logo";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getTopicPage, TOPIC_PAGES } from "@/data/topic-pages";
import { getBlogPost } from "@/data/blog-posts";
import { setPendingFile } from "@/lib/pending-file";
import { useLocation } from "wouter";

const BASE = "https://mormorsbreve.dk";

interface TopicLandingPageProps {
  slug: string;
}

export default function TopicLandingPage({ slug }: TopicLandingPageProps) {
  const page = getTopicPage(slug);
  const { user } = useAuth();
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  const handleFileSelected = useCallback((file: File) => {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") return;
    setPendingFile(file);
    navigate("/analysieren");
  }, [navigate]);

  if (!page) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold mb-4">Seite nicht gefunden</h1>
          <Link href="/">
            <Button variant="outline">Zurück zur Startseite</Button>
          </Link>
        </div>
      </div>
    );
  }

  const canonicalUrl = `${BASE}/${page.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.description,
    url: canonicalUrl,
    publisher: {
      "@type": "Organization",
      name: "MormorsBreve",
      url: BASE,
    },
  };

  const relatedPosts = page.relatedBlogSlugs
    .map((s) => getBlogPost(s))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{page.title}</title>
        <meta name="description" content={page.description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={page.heroTitle} />
        <meta property="og:description" content={page.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:locale" content="de_DE" />
        {page.heroImage && <meta property="og:image" content={`${BASE}${page.heroImage}`} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.heroTitle} />
        <meta name="twitter:description" content={page.description} />
        {page.heroImage && <meta name="twitter:image" content={`${BASE}${page.heroImage}`} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <MarketingNav />

      <section className="relative pt-14 overflow-hidden">
        {page.heroImage ? (
          <>
            <div className="absolute inset-0">
              <img
                src={page.heroImage}
                alt={page.heroImageAlt ?? ""}
                className="w-full h-full object-cover scale-105 blur-[2px]"
                fetchPriority="high"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/75 backdrop-saturate-[0.85]" />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-amber-50 via-amber-50/50 to-background dark:from-amber-950/30 dark:via-amber-950/10 dark:to-background" />
        )}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 md:py-36">
          <div className="max-w-2xl">
            <Badge variant="secondary" className={`mb-6 ${page.heroImage ? "bg-white/10 text-white/90 border-white/20" : ""}`}>
              Historische Handschriften
            </Badge>
            <h1 className={`font-serif text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6 ${page.heroImage ? "text-white" : ""}`}>
              {page.heroTitle}
            </h1>
            <p className={`text-lg sm:text-xl mb-8 leading-relaxed max-w-xl ${page.heroImage ? "text-white/80" : "text-muted-foreground"}`}>
              {page.heroSubtitle}
            </p>

            {user ? (
              <Link href="/app/upload">
                <Button size="lg" className="font-semibold">
                  {page.ctaText}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <div className="space-y-4">
                <div
                  className={`relative rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition-all cursor-pointer max-w-md ${
                    page.heroImage
                      ? dragOver
                        ? "border-amber-300 bg-amber-300/15"
                        : "border-white/30 bg-white/5 hover:border-amber-300/60 hover:bg-white/10"
                      : dragOver
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 bg-card/50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files[0];
                    if (f) handleFileSelected(f);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelected(f);
                    }}
                  />
                  <ImagePlus className={`h-10 w-10 mx-auto mb-3 ${page.heroImage ? "text-amber-300" : "text-primary"}`} />
                  <p className={`font-semibold text-lg ${page.heroImage ? "text-white" : ""}`}>
                    Foto Ihrer Handschrift hier ablegen
                  </p>
                  <p className={`text-sm mt-1 ${page.heroImage ? "text-white/60" : "text-muted-foreground"}`}>
                    oder klicken zum Auswählen — kostenlos &amp; ohne Anmeldung
                  </p>
                </div>
              </div>
            )}

            <div className={`flex flex-wrap items-center gap-4 text-sm mt-6 ${page.heroImage ? "text-white/60" : "text-muted-foreground"}`}>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Ergebnis in Minuten
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Drei Textversionen
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Erste 3&nbsp;Seiten kostenlos
              </span>
            </div>
          </div>
        </div>
      </section>

      {page.historySections.map((section, idx) => (
        <section
          key={section.heading}
          className={`py-16 sm:py-20 ${idx % 2 === 0 ? "bg-card" : ""}`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className={`grid md:grid-cols-[1fr,auto] gap-8 items-start ${idx % 2 !== 0 ? "md:grid-cols-[auto,1fr]" : ""}`}>
              <div className={idx % 2 !== 0 ? "md:order-2" : ""}>
                <Badge variant="secondary" className="mb-3">
                  {idx === 0 ? "Geschichte" : idx === 1 ? "Die Schrift" : "Forschung"}
                </Badge>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-4">
                  {section.heading}
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {section.text}
                </p>
              </div>
              <div className={`hidden md:flex items-start justify-center ${idx % 2 !== 0 ? "md:order-1" : ""}`}>
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  {idx === 0 && <ScrollText className="h-9 w-9 text-primary" />}
                  {idx === 1 && <FileText className="h-9 w-9 text-primary" />}
                  {idx === 2 && <Languages className="h-9 w-9 text-primary" />}
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="py-16 sm:py-20 bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <Badge variant="secondary" className="mb-4">Schriftarten in diesen Dokumenten</Badge>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-6">
                Was Sie finden — und was unsere KI lesen kann
              </h2>
              <ul className="space-y-3">
                {page.scriptTypes.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-muted-foreground">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Badge variant="secondary" className="mb-4">Was Sie erhalten</Badge>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-6">
                Von alter Handschrift zum lesbaren Text
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Upload, label: "Fotos oder PDFs hochladen" },
                  { icon: FileText, label: "3 Textversionen" },
                  { icon: Languages, label: "Übersetzung möglich" },
                  { icon: Headphones, label: "Als Audio vorlesen lassen" },
                ].map((feat) => (
                  <Card key={feat.label} className="p-4 flex flex-col items-center text-center gap-2">
                    <feat.icon className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">{feat.label}</span>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">Echte Ergebnisse</Badge>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-4">
              Sehen Sie echte Transkriptionen
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Auf unserer Beispielseite finden Sie echte historische Dokumente — originalgetreu
              transkribiert, mit Lupe, Textversionen und PDF-Export. Überzeugen Sie sich selbst,
              bevor Sie Ihr eigenes Dokument hochladen.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/beispiele">
                <Button size="lg" variant="outline" className="font-semibold">
                  Beispiele ansehen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href={user ? "/app/upload" : "/analysieren"}>
                <Button size="lg" className="font-semibold">
                  Eigenes Dokument testen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {relatedPosts.length > 0 && (
        <section className="py-16 sm:py-20 bg-card">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <Badge variant="secondary" className="mb-3">Weiterlesen</Badge>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold">
                Verwandte Artikel
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {relatedPosts.map((post) => post && (
                <Link key={post.slug} href={`/blog/${post.slug}`}>
                  <Card className="p-5 h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                    <h3 className="font-serif text-base font-semibold mb-2 leading-snug group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {post.description}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-primary">
                      Artikel lesen <ArrowRight className="h-3 w-3" />
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="py-12 sm:py-16 border-y border-border bg-gradient-to-r from-amber-50/50 via-transparent to-amber-50/50 dark:from-amber-950/20 dark:via-transparent dark:to-amber-950/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-4">
            Bereit, die Handschrift zu entziffern?
          </h2>
          <p className="text-muted-foreground mb-6 text-lg max-w-xl mx-auto">
            Laden Sie ein Foto hoch und erhalten Sie in wenigen Minuten einen lesbaren Text. Die ersten 3 Seiten sind kostenlos.
          </p>
          <Link href={user ? "/app/upload" : "/analysieren"}>
            <Button size="lg" className="font-semibold">
              {page.ctaText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <section className="py-10 border-b border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              Ihre Daten bleiben privat
            </span>
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary shrink-0" />
              SSL-verschlüsselt
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              Kein KI-Training mit Ihren Dokumenten
            </span>
            <span className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary shrink-0" />
              30+ Sprachen
            </span>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <Logo height="h-6" />
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link href="/beispiele" className="hover:text-foreground transition-colors">Beispiele</Link>
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            {TOPIC_PAGES.map((tp) => (
              <Link key={tp.slug} href={`/${tp.slug}`} className="hover:text-foreground transition-colors">
                {tp.heroTitle.replace(" endlich lesen", "").replace(" endlich lesbar", "").replace(" entziffern", "")}
              </Link>
            ))}
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
