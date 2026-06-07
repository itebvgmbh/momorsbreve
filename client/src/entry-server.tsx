import React from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { I18nextProvider, useTranslation } from "react-i18next";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { HreflangTags } from "@/components/hreflang-tags";
import i18n from "@/i18n";
import { parsePath, localizePath, SUPPORTED_LANGS, DEFAULT_LANG } from "@/i18n/lang";

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
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>{t("ssr.analyseTitle")}</title>
        <meta name="description" content={t("ssr.analyseDescription")} />
        <link rel="canonical" href="https://mormorsbreve.dk/analysieren" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <main className="max-w-4xl mx-auto p-4 sm:p-6">
          <h1 className="font-serif text-2xl font-bold mb-1">{t("ssr.analyseH1")}</h1>
          <p className="text-muted-foreground">{t("ssr.analyseLead")}</p>
        </main>
      </div>
    </>
  );
}

function BeispieleSSRShell() {
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>{t("ssr.examplesTitle")}</title>
        <meta name="description" content={t("ssr.examplesDescription")} />
        <link rel="canonical" href="https://mormorsbreve.dk/beispiele" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <main className="max-w-4xl mx-auto p-4 sm:p-6">
          <h1 className="font-serif text-2xl font-bold mb-1">{t("ssr.examplesH1")}</h1>
          <p className="text-muted-foreground">{t("ssr.examplesLead")}</p>
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
  // Sprache + präfixlosen Pfad aus der URL bestimmen (/de, /en; da = präfixlos).
  const { lang, base, path } = parsePath(url);
  const PageComponent = staticRoutes[path];
  if (!PageComponent) {
    throw new Error(`No component registered for route: ${url}`);
  }

  // Sprache der gemeinsamen i18n-Instanz VOR dem synchronen Render setzen.
  if (i18n.language !== lang) {
    i18n.changeLanguage(lang);
  }

  const helmetContext: Record<string, any> = {};

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <I18nextProvider i18n={i18n}>
        <Router base={base} ssrPath={url}>
          <Helmet htmlAttributes={{ lang }} />
          <HreflangTags />
          <AuthProvider>
            <ThemeProvider>
              <TooltipProvider>
                <PageComponent />
              </TooltipProvider>
            </ThemeProvider>
          </AuthProvider>
        </Router>
      </I18nextProvider>
    </HelmetProvider>,
  );

  return { html, helmet: helmetContext.helmet };
}

export function getStaticRoutes(): string[] {
  // Für jede Basis-Route die dänische (präfixlose) Variante plus /de und /en.
  const innerPaths = Object.keys(staticRoutes);
  const routes: string[] = [];
  for (const inner of innerPaths) {
    for (const lang of SUPPORTED_LANGS) {
      routes.push(lang === DEFAULT_LANG ? inner : localizePath(inner, lang));
    }
  }
  return routes;
}
