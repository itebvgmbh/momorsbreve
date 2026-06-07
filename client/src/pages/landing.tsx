import { Link, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/auth-dialog";
import { MarketingNav } from "@/components/marketing-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { setPendingFile } from "@/lib/pending-file";
import { TOPIC_PAGES } from "@/data/topic-pages";
import { HeroBlock, DEFAULT_HERO_VARIANT, type HeroVariantId } from "@/components/hero-variants";
import {
  FileText,
  Upload,
  Languages,
  ArrowRight,
  Check,
  User,
  Pencil,
  Download,
  ZoomIn,
  Lock,
  ShieldCheck,
  Headphones,
  Volume2,
  CreditCard,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { trackBeginCheckout } from "@/lib/gtag";
import { getAuthHeaders } from "@/lib/queryClient";
import { DEFAULT_PROMOTION, getCreditPackageDisplayName, type PromotionConfig, type CreditPackageWithPromotion } from "@shared/models/transcription";
import { AudioCharacterPicker } from "@/components/audio-character-picker";
import { TTS_CHARACTERS, TTS_CHARACTER_STYLES } from "@/lib/tts-constants";

const ANALYZE_TOKEN_KEY = "analyzeToken";
const ANALYZE_ACTION_KEY = "analyzeAction";
const ANALYZE_TRANSLATION_LANGUAGE_KEY = "analyzeTranslationLanguage";
const HERO_VARIANT_SESSION_KEY = "heroVariant";
const HERO_TEST_PAID_KEY = "heroTestPaid";

function readStoredHeroVariant(): HeroVariantId | null {
  try {
    const raw = sessionStorage.getItem(HERO_VARIANT_SESSION_KEY);
    if (raw === null) return null;
    const v = parseInt(raw, 10);
    if (Number.isInteger(v) && v >= 0 && v <= 4) return v as HeroVariantId;
  } catch {}
  return null;
}

/**
 * SEO-Schutz: Der Hero-A/B-Test läuft NUR für bezahlten AdWords-Traffic.
 * Erkennung über die Google-Ads-Klick-Marker (gclid/gbraid/wbraid/gad_source)
 * bzw. utm_medium=cpc/ppc. Organische Besucher, Direktaufrufe und Crawler
 * (Googlebot) sehen damit immer die Kontrolle V0. Es findet KEINE
 * User-Agent-Erkennung statt – das wäre Cloaking. Die Teilnahme wird pro
 * Session gemerkt, damit sie auch nach internen Navigationen erhalten bleibt.
 */
function isPaidAdwordsSession(): boolean {
  try {
    if (sessionStorage.getItem(HERO_TEST_PAID_KEY) === "1") return true;
    const params = new URLSearchParams(window.location.search);
    const medium = (params.get("utm_medium") || "").toLowerCase();
    const paid =
      params.has("gclid") ||
      params.has("gbraid") ||
      params.has("wbraid") ||
      params.get("gad_source") != null ||
      ["cpc", "ppc", "paid", "paidsearch"].includes(medium);
    if (paid) {
      sessionStorage.setItem(HERO_TEST_PAID_KEY, "1");
      return true;
    }
  } catch {}
  return false;
}

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

const features = [
  {
    icon: Upload,
    title: "Upload flere billeder & PDF'er",
    description:
      "Upload op til 20 fotos, scanninger eller en flersidet PDF på én gang. Alle sider behandles samlet – så genkender AI'en sammenhængen bedre.",
  },
  {
    icon: FileText,
    title: "Tre tekstversioner",
    description:
      "Tro mod originalen, AI-suppleret og fri fortolkning: du vælger, hvor tæt på originalen teksten skal være. Ideel til slægtsforskning, familie eller gaver.",
  },
  {
    icon: Pencil,
    title: "Redigér teksten direkte",
    description:
      "Tilpas alle versioner i browseren – ret slåfejl, udfyld huller. Dine ændringer gemmes. Fuld kontrol over resultatet.",
  },
  {
    icon: Download,
    title: "Eksport: PDF, billede, tekst",
    description:
      "Smuk PDF med forside til at printe og forære væk, billed-download pr. side eller ren tekstfil. Brug transskriptionen, som du vil.",
  },
  {
    icon: ZoomIn,
    title: "Lup til detaljer",
    description:
      "Svært læselige steder? Den indbyggede lup med justerbar forstørrelse hjælper med at sammenligne original og transskription.",
  },
  {
    icon: Languages,
    title: "Oversættelse inklusive",
    description:
      "Få AI-transskriptionen på dansk — og lad den med det samme oversætte til over 30 sprog. Ideelt, når familien bor spredt i verden. Automatisk, i samme trin, uden ekstra betaling.",
  },
  {
    icon: Headphones,
    title: "Læs op & forær væk",
    description:
      "Få transskriptioner læst op som lydfil med 6 forskellige stemmer og 4 oplæsningsstile – en perfekt gave til ældre familiemedlemmer, der ikke længere ser så godt.",
  },
];

const steps = [
  { number: "01", title: "Upload fotos eller scanninger", description: "Tag billeder eller scan siderne – enkeltvis eller som flersidet PDF. Flere sider på én gang er muligt." },
  { number: "02", title: "Se det gratis", description: "De første 3 sider ser du gratis. Tip: Jo flere sider du uploader samlet, desto mere præcist bliver resultatet." },
  { number: "03", title: "Få teksten", description: "Færdig! Du får den læsbare tekst til at læse, printe eller give videre." },
];

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const [promotion, setPromotion] = useState<PromotionConfig>(DEFAULT_PROMOTION);
  const [packages, setPackages] = useState<CreditPackageWithPromotion[]>([]);
  const [vorlesenVoice, setVorlesenVoice] = useState(TTS_CHARACTERS[0].voice);
  const [vorlesenStyle, setVorlesenStyle] = useState(TTS_CHARACTER_STYLES[0].prompt);
  const minCurrentPricePerCredit = packages.length
    ? Math.min(...packages.map((pkg) => pkg.priceEur / pkg.pages))
    : 23.4;
  const minOriginalPricePerCredit = packages.length
    ? Math.min(...packages.map((pkg) => (pkg.originalPriceEur ?? pkg.priceEur) / pkg.pages))
    : undefined;
  const maxDiscountPercent = packages.reduce((max, pkg) => Math.max(max, pkg.discountPercent ?? 0), 0);
  useEffect(() => {
    fetch("/api/promotion")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setPromotion(data))
      .catch(() => {});
    fetch("/api/packages")
      .then((r) => r.ok ? r.json() : [])
      .then((data: CreditPackageWithPromotion[]) => setPackages(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem(ANALYZE_TOKEN_KEY) : null;
      const action = typeof localStorage !== "undefined" ? localStorage.getItem(ANALYZE_ACTION_KEY) : null;
      if (token && action && (action === "transcribe" || action === "expert")) {
        (async () => {
          try {
            const headers = await getAuthHeaders();
            const translationLang = localStorage.getItem(ANALYZE_TRANSLATION_LANGUAGE_KEY);
            const res = await fetch("/api/claim-analysis", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...headers },
              body: JSON.stringify({
                token,
                action,
                translationLanguage:
                  translationLang && translationLang !== "none" ? translationLang : undefined,
              }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.message || "Übernahme fehlgeschlagen");
            }
            const data = await res.json();
            localStorage.removeItem(ANALYZE_TOKEN_KEY);
            localStorage.removeItem(ANALYZE_ACTION_KEY);
            localStorage.removeItem(ANALYZE_TRANSLATION_LANGUAGE_KEY);
            if (action === "expert") {
              navigate(`/app/human-transcription/${data.jobId}`);
            } else {
              navigate(`/app/preview/${data.jobId}`);
            }
          } catch {
            localStorage.removeItem(ANALYZE_TOKEN_KEY);
            localStorage.removeItem(ANALYZE_ACTION_KEY);
            localStorage.removeItem(ANALYZE_TRANSLATION_LANGUAGE_KEY);
            navigate("/app");
          }
        })();
        return;
      }
      navigate("/app");
    }
  }, [user, isLoading, navigate]);

  const [authOpen, setAuthOpen] = useState(false);
  const [heroVariant, setHeroVariant] = useState<HeroVariantId>(DEFAULT_HERO_VARIANT);
  const heroImpressionSent = useRef(false);
  const heroRef = useRef<HTMLElement>(null);
  const pricingRef = useRef<HTMLElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [pastPricing, setPastPricing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const hero = heroRef.current;
    const pricing = pricingRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === hero) setHeroVisible(entry.isIntersecting);
          if (entry.target === pricing) setPastPricing(entry.isIntersecting);
        }
      },
      { threshold: 0 }
    );
    observer.observe(hero);
    if (pricing) observer.observe(pricing);
    return () => observer.disconnect();
  }, []);

  // Hero-A/B-Test: Variante zuweisen (sticky pro Session) und Impression zählen.
  // Nur für anonyme Besucher relevant – eingeloggte Nutzer werden ohnehin nach /app umgeleitet.
  useEffect(() => {
    if (isLoading || user) return;
    if (heroImpressionSent.current) return;
    // SEO-Schutz: nur bezahlter AdWords-Traffic nimmt am Test teil.
    // Alle anderen (inkl. Googlebot) sehen die Kontrolle V0.
    if (!isPaidAdwordsSession()) return;
    heroImpressionSent.current = true;

    (async () => {
      let variant = readStoredHeroVariant();
      if (variant === null) {
        try {
          const res = await fetch("/api/hero-variant");
          const data = await res.json();
          if (typeof data?.variant === "number" && data.variant >= 0 && data.variant <= 4) {
            variant = data.variant as HeroVariantId;
          }
        } catch {}
        if (variant === null) variant = DEFAULT_HERO_VARIANT;
        try {
          sessionStorage.setItem(HERO_VARIANT_SESSION_KEY, String(variant));
        } catch {}
      }
      setHeroVariant(variant);
      fetch("/api/hero/impression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant }),
      }).catch(() => {});
    })();
  }, [isLoading, user]);

  const handleFileSelected = useCallback((file: File) => {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") return;
    // Conversion (erster Funnel-Schritt: Upload-Absicht) nur für Test-Teilnehmer
    // (bezahlter AdWords-Traffic) und nur für die ihnen zugewiesene Variante zählen.
    if (isPaidAdwordsSession()) {
      const variant = readStoredHeroVariant() ?? DEFAULT_HERO_VARIANT;
      fetch("/api/hero/conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant }),
      }).catch(() => {});
    }
    setPendingFile(file);
    navigate("/analysieren");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>MormorsBreve – tyd gotisk skrift og gammel håndskrift online</title>
        <meta
          name="description"
          content="Gamle breve, dagbøger og opskrifter i gotisk skrift? Upload et foto – og få læsbar tekst på få minutter, til hele familien og til din slægtsforskning. De første sider er gratis. Kan oversættes til over 30 sprog."
        />
        <link rel="canonical" href="https://mormorsbreve.dk/" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="da_DK" />
        <meta property="og:title" content="MormorsBreve – tyd gotisk skrift og gammel håndskrift online" />
        <meta
          property="og:description"
          content="Gamle breve, dagbøger og opskrifter i gotisk skrift? Upload et foto – og få læsbar tekst på få minutter, til hele familien. De første sider er gratis."
        />
        <meta property="og:url" content="https://mormorsbreve.dk/" />
        <meta property="og:image" content="https://mormorsbreve.dk/images/hero-desk.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MormorsBreve – tyd gotisk skrift og gammel håndskrift online" />
        <meta
          name="twitter:description"
          content="Gamle breve, dagbøger og opskrifter i gotisk skrift? Upload et foto – og få læsbar tekst på få minutter."
        />
        <meta name="twitter:image" content="https://mormorsbreve.dk/images/hero-desk.png" />
      </Helmet>
      <MarketingNav onLoginClick={() => setAuthOpen(true)} />

      <section ref={heroRef} className="relative pt-14 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hero-desk.png"
            alt="Tagebuch-Seite"
            className="w-full h-full object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        </div>
        <HeroBlock
          variant={heroVariant}
          isLoggedIn={!!user}
          dragOver={dragOver}
          setDragOver={setDragOver}
          fileInputRef={fileInputRef}
          onFileSelected={handleFileSelected}
        />
      </section>

      <section className="py-20 sm:py-28 bg-card overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Bevar familiens historie</Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
                Gør håndskrevne skatte læsbare igen
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                I mange familier ligger der håndskrevne skatte: bedsteforældrenes
                dagbøger, gamle breve fra Amerika, opskrifter eller postkort. Men den
                gamle gotiske håndskrift kan næsten ingen læse i dag – og det samme
                gælder kirkebøger og folketællinger i din slægtsforskning.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                MormorsBreve gør disse minder tilgængelige igen – med AI på få
                minutter, eller ved særligt svær skrift personligt af erfarne
                transskribenter. For dig, dine børn og børnebørn.
              </p>
            </div>
            <div className="relative">
              <img
                src="/images/family-memories.png"
                alt="Ältere Person blättert in einem Familien-Tagebuch mit Sütterlin-Handschrift"
                className="rounded-xl shadow-lg w-full object-cover aspect-[4/3]"
                data-testid="img-family-memories"
                loading="lazy"
              />
              <div className="absolute -bottom-4 -right-4 w-32 h-32 sm:w-40 sm:h-40 rounded-lg overflow-hidden shadow-lg border-4 border-background hidden sm:block">
                <img
                  src="/images/suetterlin-closeup.png"
                  alt="Nahaufnahme einer Sütterlin-Handschrift"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4" data-testid="text-features-title">
              Alt, hvad du behøver for at tyde mormors håndskrift
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Damit Familiengeschichten nicht verloren gehen. Einfach, persönlich und
              mit Respekt vor Ihren Erinnerungen.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="p-6 hover-elevate"
                data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s/g, "-")}`}
              >
                <feature.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-serif text-lg font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {!user && (
        <div className="py-10 sm:py-14 border-y border-border bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-muted-foreground mb-4 text-lg">
              Neugierig geworden? Probieren Sie es mit Ihrem eigenen Dokument.
            </p>
            <Link href="/analysieren">
              <Button size="lg" className="bg-amber-600 text-white font-semibold">
                Tyd din håndskrift nu – gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-3">3 sider gratis – ingen oprettelse, intet kreditkort</p>
          </div>
        </div>
      )}

      <section className="py-20 sm:py-28 bg-card overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="order-2 md:order-1">
              <img
                src="/images/documents-flatlay.png"
                alt="Historische Dokumente und alte Familienbriefe auf einem Schreibtisch"
                className="rounded-xl shadow-lg w-full object-cover aspect-video"
                data-testid="img-documents-flatlay"
                loading="lazy"
              />
            </div>
            <div className="order-1 md:order-2">
              <Badge variant="secondary" className="mb-4">Historische Schriften</Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
                Specialiseret i gammel dansk gotisk håndskrift
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Vores AI er trænet specielt til gammel dansk håndskrift.
                Den genkender de fine forskelle mellem gotisk håndskrift, overgangsskrift,
                gotisk tryk (fraktur) og moderne håndskrift.
              </p>
              <ul className="space-y-3">
                {["Gotisk håndskrift (før 1875)", "Overgangsskrift (1875–1900)", "Gotisk tryk (fraktur)", "Moderne håndskrift"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="translation" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Bei KI-Transkription inklusive</Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
                Familiens historie kender ingen sproggrænser
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                MormorsBreve auf Deutsch transkribieren — und direkt auf Englisch,
                Französisch, Spanisch oder in über 30 weitere Sprachen übersetzen lassen.
                Bei jeder KI-Transkription inklusive, ohne Aufpreis. Damit die ganze
                Familie lesen kann, was geschrieben wurde — egal wo auf der Welt.
              </p>
              <div className="flex flex-wrap gap-3 mb-6">
                {[
                  "🇬🇧 Englisch",
                  "🇫🇷 Französisch",
                  "🇪🇸 Spanisch",
                  "🇳🇱 Niederländisch",
                  "🇵🇱 Polnisch",
                  "🇵🇹 Portugiesisch",
                  "🇮🇹 Italienisch",
                  "🇹🇷 Türkisch",
                  "🇷🇺 Russisch",
                ].map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-sm text-muted-foreground"
                  >
                    {lang}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-sm text-muted-foreground font-medium">
                  + über 20 weitere
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Die automatische Übersetzung ist Teil der KI-Transkription (KI-Sofort).
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-6">
              <div className="w-full max-w-sm space-y-4">
                <Card className="p-4 border-primary/20 bg-primary/[0.02]">
                  <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Originaler Text (Deutsch)
                  </p>
                  <p className="font-serif text-sm leading-relaxed text-muted-foreground italic">
                    „Heute war ein wunderschöner Tag. Die Kinder spielten im Garten und Großmutter brachte Kuchen."
                  </p>
                </Card>
                <div className="flex justify-center">
                  <ArrowRight className="h-5 w-5 text-primary rotate-90" />
                </div>
                <Card className="p-4 border-amber-300/40 bg-amber-50/30 dark:bg-amber-950/10">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                    <Languages className="h-3.5 w-3.5" />
                    Übersetzung (Englisch)
                  </p>
                  <p className="font-serif text-sm leading-relaxed text-muted-foreground italic">
                    "Today was a beautiful day. The children played in the garden and grandmother brought cake."
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="vorlesen" className="py-20 sm:py-28 bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <Badge variant="secondary" className="mb-4 flex items-center gap-1.5 w-fit">
                <Headphones className="h-3.5 w-3.5" />
                Vorlesen & Hörbeispiele
              </Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
                Omas Worte hörbar machen — als Geschenk oder für sich
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Kinder und Enkel können die transkribierten Tagebücher und Briefe als Audio-Datei generieren und herunterladen – und sie älteren Familienmitgliedern schenken, die nicht mehr gut lesen können. Wählen Sie eine Stimme und einen Vorlesestil und hören Sie, wie es klingt.
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  "6 verschiedene Stimmen — weiblich und männlich",
                  "4 Vorlesestile: sachlich, Hörbuch, langsam & deutlich, emotional",
                  "Direkt anhören und als MP3 herunterladen",
                  "Funktioniert auch mit Übersetzungen",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground mb-8">
                1 Seite pro 1.000 Zeichen – nach der Transkription in der App verfügbar.
              </p>
              <Button
                size="lg"
                className="font-semibold"
                onClick={() => navigate(user ? "/app" : "/analysieren")}
              >
                Prøv gratis nu
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <div>
              <Card className="p-5 sm:p-6 border-primary/20 bg-primary/[0.02]">
                <AudioCharacterPicker
                  selectedVoice={vorlesenVoice}
                  selectedStyle={vorlesenStyle}
                  onSelect={(voice, style) => { setVorlesenVoice(voice); setVorlesenStyle(style); }}
                  compact
                />
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
              Tre trin til læsbar tekst
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Uden forhåndsviden: upload et foto, se det gratis, få teksten.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-10 items-center mb-16">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {steps.map((step, idx) => (
                <div key={step.number} className="text-center p-4 rounded-lg bg-card border border-border" data-testid={`step-${idx + 1}`}>
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-serif text-sm font-bold mb-3">
                    {step.number}
                  </div>
                  <h3 className="font-serif text-base font-semibold mb-1.5">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
            <div>
              <img
                src="/images/digital-transcription.png"
                alt="Alte Handschrift wird am Computer transkribiert"
                className="rounded-xl shadow-lg w-full object-cover aspect-[4/3]"
                data-testid="img-digital-transcription"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {!user && (
        <div className="py-10 sm:py-14 border-y border-border bg-gradient-to-r from-amber-50/50 via-transparent to-amber-50/50 dark:from-amber-950/20 dark:via-transparent dark:to-amber-950/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-muted-foreground mb-4 text-lg">
              Bereit für Ihre erste Transkription?
            </p>
            <Link href="/analysieren">
              <Button size="lg" className="bg-amber-600 text-white font-semibold">
                Upload et foto & kom i gang
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-3">Resultat på få minutter – de første 3 sider gratis</p>
          </div>
        </div>
      )}

      <section id="expert-service" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
              KI-Transkription für die meisten Fälle — Experten für den Rest
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Schnell und günstig per KI – oder mit persönlicher Beratung durch unsere Experten bei besonders schwierigen Dokumenten.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-6 border-primary/50 bg-primary/[0.03]">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-6 w-6 text-primary" />
                <h3 className="font-serif text-xl font-bold">KI-Transkription</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  Schnell – Ergebnis in wenigen Minuten
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
{promotion.enabled ? (
                    <>Billigt – <span className="line-through text-muted-foreground/60">fra {formatPrice(minOriginalPricePerCredit ?? minCurrentPricePerCredit)} kr.</span> <span className="text-primary font-semibold">fra {formatPrice(minCurrentPricePerCredit)} kr.</span> pr. side</>
                  ) : (
                    <>Billigt – fra {formatPrice(minCurrentPricePerCredit)} kr. pr. side</>
                  )}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  Ideal für gut lesbare Handschriften
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  Übersetzung in 30+ Sprachen inklusive
                </li>
              </ul>
              {user ? (
                <Link href="/app/upload">
                  <Button className="w-full">Prøv gratis nu</Button>
                </Link>
              ) : (
                <Link href="/analysieren">
                  <Button className="w-full">Prøv gratis nu</Button>
                </Link>
              )}
            </Card>
            <Card className="p-6 border-border">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-6 w-6 text-primary" />
                <h3 className="font-serif text-xl font-bold">Experten-Service</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  Menschliche Fachkraft für historische Schriften
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  Höchste Genauigkeit, auch bei schwer lesbaren Dokumenten
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  Wissenschaftlich-diplomatische Transkription möglich
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  Persönliche Beratung und individuelles Angebot
                </li>
              </ul>
              {user ? (
                <Link href="/app/human-transcription">
                  <Button variant="outline" className="w-full">Experten anfragen</Button>
                </Link>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => setAuthOpen(true)}>
                  Experten anfragen
                </Button>
              )}
            </Card>
          </div>
        </div>
      </section>

      <section id="pricing" ref={pricingRef} className="py-20 sm:py-28 bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Section Header */}
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
              Bezahlen Sie nur, was Sie brauchen{promotion.enabled ? " — Jetzt mit " + promotion.label + "!" : ""}
            </h2>
            {promotion.enabled && (
              <div className="rounded-lg border border-amber-300/60 dark:border-amber-600/60 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-2 max-w-md mx-auto mb-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {maxDiscountPercent > 0
                    ? `Bis zu ${maxDiscountPercent} % Rabatt auf KI-Transkription — nur für kurze Zeit.`
                    : "Aktionspreise auf KI-Transkription — nur für kurze Zeit."}
                </p>
              </div>
            )}
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Kaufen Sie Credits für die Seiten, die Sie brauchen. Kein Abo. Ihr Guthaben verfällt nicht.
              Alle Preise inkl. gesetzlicher Mehrwertsteuer.
            </p>
          </div>

          {/* ── KI-SOFORT: Hero-Bereich mit Paketpreisen ──────── */}
          <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-card shadow-sm overflow-hidden max-w-5xl mx-auto mb-10">

            {/* KI-Sofort Header */}
            <div className="px-6 pt-6 pb-5 border-b border-primary/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-primary/90 text-white text-xs px-2 py-0.5">Empfohlen</Badge>
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary">Sofort fertig</Badge>
                  </div>
                  <h3 className="font-serif text-2xl font-bold flex items-center gap-2 mt-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    KI-Sofort Transkription
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    KI liest Ihre Handschrift — fertig in Sekunden. Wählen Sie Ihr Credit-Paket:
                  </p>
                  <p className="text-sm font-medium text-primary mt-2">
                    1 Seite = 1 Credit
                  </p>
                </div>
                <div className="text-right">
                  {promotion.enabled ? (
                    <>
                      <span className="text-sm text-muted-foreground line-through block">
                        fra {formatPrice(minOriginalPricePerCredit ?? minCurrentPricePerCredit)} kr./side
                      </span>
                      <span className="font-serif text-2xl font-bold text-primary">
                        fra {formatPrice(minCurrentPricePerCredit)} kr./side
                      </span>
                    </>
                  ) : (
                    <span className="font-serif text-2xl font-bold">
                      fra {formatPrice(minCurrentPricePerCredit)} kr./side
                    </span>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4">
                {[
                  "3 Textversionen",
                  "PDF-Export",
                  "Text bearbeiten",
                  "Übersetzung in 30+ Sprachen",
                  "Optional: Vorlesen & Download",
                ].map((f) => (
                  <span key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary shrink-0" />
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Package Cards */}
            <div className="px-6 py-6">
              {packages.length > 0 ? (
                <div className="grid sm:grid-cols-3 gap-4">
                  {packages.map((pkg) => (
                    <Card
                      key={pkg.id}
                      className={`p-5 relative transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                        pkg.popular
                          ? "ring-2 ring-primary shadow-md bg-primary/5 dark:bg-primary/10"
                          : "bg-white dark:bg-card"
                      }`}
                      data-testid={`card-package-${pkg.id}`}
                    >
                      {pkg.discountPercent != null && (
                        <Badge className="absolute -top-2.5 right-3 bg-amber-600 hover:bg-amber-600 text-white text-xs">
                          -{pkg.discountPercent} %
                        </Badge>
                      )}
                      {pkg.popular && (
                        <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs">
                          Beliebt
                        </Badge>
                      )}
                      <div className="text-center space-y-3">
                        <h4 className="font-serif text-lg font-bold">{getCreditPackageDisplayName(pkg.name)}</h4>
                        <p className="text-sm text-muted-foreground">{pkg.pages} Seiten</p>
                        <div>
                          {pkg.originalPriceEur != null && (
                            <p className="text-xs text-muted-foreground line-through">
                              {formatPrice(pkg.originalPriceEur)} kr.
                            </p>
                          )}
                          <span className="font-serif text-4xl font-bold text-primary">
                            {formatPrice(pkg.priceEur)}
                          </span>
                          <span className="text-muted-foreground ml-1 text-sm">EUR</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">inkl. MwSt.</span>
                        </div>
                        <p className="text-xs font-medium text-primary/80">
                          kun {formatPrice(pkg.priceEur / pkg.pages)} kr. pr. side
                        </p>
                        {user ? (
                          <Link href="/app/pricing">
                            <Button
                              className="w-full"
                              variant={pkg.popular ? "default" : "outline"}
                              onClick={() => trackBeginCheckout()}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              {pkg.discountPercent != null ? "Jetzt zuschlagen" : "Kaufen"}
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            className="w-full"
                            variant={pkg.popular ? "default" : "outline"}
                            onClick={() => { trackBeginCheckout(); setAuthOpen(true); }}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Jetzt starten
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">Credit-Pakete werden geladen…</p>
                </div>
              )}
            </div>
          </div>

          {/* ── KI-GEPRÜFT & EXPERTEN: Sekundär ──────────────── */}
          <div className="max-w-5xl mx-auto">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3 text-center">
              Weitere Service-Optionen
            </p>
            <div className="grid sm:grid-cols-2 gap-4">

              {/* KI-Geprüft */}
              <Card className="p-5 border border-border/60 bg-muted/20 dark:bg-muted/10 hover:shadow-md transition-shadow"
                data-testid="card-pricing-ki-geprüft">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">Beliebt</Badge>
                  <span className="text-xs text-muted-foreground">2–3 Werktage</span>
                </div>
                <h3 className="font-serif text-lg font-bold mb-0.5">KI-Geprüft</h3>
                <p className="font-semibold text-base mb-3">69 kr./side</p>
                <ul className="text-xs text-muted-foreground space-y-1.5 mb-3 text-left">
                  {[
                    "KI + Experten-Korrektur",
                    "Geprüfte Qualität",
                    "PDF-Export",
                  ].map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-primary shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-muted-foreground/70 leading-snug border-l-2 border-amber-300 dark:border-amber-600 pl-2 mb-4 text-left">
                  Wir prüfen nach Ihrer Anfrage, ob die KI-Qualität für eine Korrektur ausreicht.
                </p>
                {user ? (
                  <Link href="/app/human-transcription">
                    <Button variant="outline" className="w-full" data-testid="button-buy-experte">
                      Anfrage stellen
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => setAuthOpen(true)}>
                    Anfrage stellen
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </Card>

              {/* Experten */}
              <Card className="p-5 border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10 hover:shadow-md transition-shadow"
                data-testid="card-pricing-experten">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-400">Höchste Qualität</Badge>
                  <span className="text-xs text-muted-foreground">5–7 Werktage</span>
                </div>
                <h3 className="font-serif text-lg font-bold mb-0.5 flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Experten
                </h3>
                <p className="font-semibold text-base mb-3">fra 119 kr./side</p>
                <ul className="text-xs text-muted-foreground space-y-1.5 mb-4 text-left">
                  {[
                    "Menschliche Transkription",
                    "Höchste Genauigkeit",
                    "Auch schwierige Dokumente",
                  ].map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
                {user ? (
                  <Link href="/app/human-transcription">
                    <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white border-amber-700" data-testid="button-buy-experte">
                      Angebot anfordern
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                ) : (
                  <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white border-amber-700" onClick={() => setAuthOpen(true)}>
                    Angebot anfordern
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </Card>
            </div>
          </div>

          <div className="max-w-2xl mx-auto mt-10 text-center">
            <p className="text-sm text-muted-foreground">
              Noch Fragen zu Preisen, Datenschutz oder Funktionen?{" "}
              <Link href="/faq" className="text-primary font-medium hover:underline" data-testid="link-faq-from-pricing">
                Antworten in unseren häufigen Fragen →
              </Link>
            </p>
          </div>

        </div>
      </section>

      <section className="py-12 border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              DSGVO-konform
            </span>
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary shrink-0" />
              SSL-verschlüsselt
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              Dokumente werden nicht zum KI-Training verwendet
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              Daten jederzeit löschbar
            </span>
            <span className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary shrink-0" />
              Übersetzung in 30+ Sprachen bei KI-Transkription
            </span>
            <span className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-primary shrink-0" />
              Vorlesen & als Geschenk herunterladen
            </span>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 pb-28 sm:pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <Logo height="h-6" />
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link href="/beispiele" className="hover:text-foreground transition-colors">Beispiele</Link>
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
            {TOPIC_PAGES.map((tp) => (
              <Link key={tp.slug} href={`/${tp.slug}`} className="hover:text-foreground transition-colors">{tp.heroTitle}</Link>
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

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />

      {!user && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border transition-transform duration-300 ${heroVisible ? "translate-y-full" : "translate-y-0"}`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-4">
            <p className="hidden sm:block text-sm text-muted-foreground">
              {pastPricing ? (
                <>Overbevist? <strong className="text-foreground">De første 3 sider gratis</strong> – upload bare et foto</>
              ) : (
                <><strong className="text-foreground">3 sider gratis</strong> – ingen oprettelse nødvendig, intet abonnement</>
              )}
            </p>
            <Link href="/analysieren" className="block sm:shrink-0 w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-amber-600 text-white font-semibold">
                {pastPricing ? "Start gratis nu" : "Upload din håndskrift nu"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
