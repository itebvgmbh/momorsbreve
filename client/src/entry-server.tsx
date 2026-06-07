import React from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";

import LandingPage from "@/pages/landing";
import DatenschutzPage from "@/pages/datenschutz";
import ImpressumPage from "@/pages/impressum";
import AGBPage from "@/pages/agb";
import WiderrufsbelehrungPage from "@/pages/widerrufsbelehrung";
import BlogPage from "@/pages/blog";
import BlogPostPage from "@/pages/blog-post";
// BeispielePage is NOT imported here — it uses react-pdf/pdfjs which needs DOMMatrix (browser-only)
import TopicLandingPage from "@/pages/topic-landing";
import FaqPage from "@/pages/faq";
import { getAllSlugs } from "@/data/blog-posts";
import { getAllTopicSlugs } from "@/data/topic-pages";

function AnalysierenSSRShell() {
  return (
    <>
      <Helmet>
        <title>Kostenlose Handschrift-Analyse – MormorsBreve</title>
        <meta name="description" content="Laden Sie ein Bild oder PDF Ihrer alten Handschrift hoch – unsere KI bewertet kostenlos die Lesbarkeit und zeigt, wie gut das Dokument transkribiert werden kann." />
        <link rel="canonical" href="https://mormorsbreve.dk/analysieren" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <main className="max-w-4xl mx-auto p-4 sm:p-6">
          <h1 className="font-serif text-2xl font-bold mb-1">Kostenlose KI-Analyse</h1>
          <p className="text-muted-foreground">
            Laden Sie ein Bild oder PDF hoch – unsere KI bewertet die Lesbarkeit und zeigt Ihnen,
            wie gut Ihr Dokument automatisch transkribiert werden kann. Keine Anmeldung nötig.
          </p>
        </main>
      </div>
    </>
  );
}

function BeispieleSSRShell() {
  return (
    <>
      <Helmet>
        <title>Beispiele – Transkribierte historische Handschriften | MormorsBreve</title>
        <meta name="description" content="Echte Beispiele transkribierter Sütterlin- und Kurrent-Handschriften: Feldpostbriefe, Tagebücher und Rezeptbücher. Testen Sie den Reader kostenlos." />
        <link rel="canonical" href="https://mormorsbreve.dk/beispiele" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <main className="max-w-4xl mx-auto p-4 sm:p-6">
          <h1 className="font-serif text-2xl font-bold mb-1">Beispiel-Transkriptionen</h1>
          <p className="text-muted-foreground">
            Echte historische Handschriften – originalgetreu transkribiert. Probieren Sie den
            interaktiven Reader kostenlos aus.
          </p>
        </main>
      </div>
    </>
  );
}

const staticRoutes: Record<string, React.ComponentType> = {
  "/": LandingPage,
  "/datenschutz": DatenschutzPage,
  "/impressum": ImpressumPage,
  "/agb": AGBPage,
  "/widerrufsbelehrung": WiderrufsbelehrungPage,
  "/blog": BlogPage,
  "/beispiele": BeispieleSSRShell,
  "/analysieren": AnalysierenSSRShell,
  "/faq": FaqPage,
};

for (const slug of getAllSlugs()) {
  const s = slug;
  staticRoutes[`/blog/${s}`] = () => <BlogPostPage slug={s} />;
}

for (const slug of getAllTopicSlugs()) {
  const s = slug;
  staticRoutes[`/${s}`] = () => <TopicLandingPage slug={s} />;
}

export function render(url: string) {
  const PageComponent = staticRoutes[url];
  if (!PageComponent) {
    throw new Error(`No component registered for route: ${url}`);
  }

  const helmetContext: Record<string, any> = {};

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <Router ssrPath={url}>
        <AuthProvider>
          <ThemeProvider>
            <TooltipProvider>
              <PageComponent />
            </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
      </Router>
    </HelmetProvider>,
  );

  return { html, helmet: helmetContext.helmet };
}

export function getStaticRoutes(): string[] {
  return Object.keys(staticRoutes);
}
