import { Link, useParams } from "wouter";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import {
  getBlogPost,
  getBlogPostContent,
  getCanonicalUrl,
  getAllSlugs,
} from "@/data/blog-posts";
import { TOPIC_PAGES } from "@/data/topic-pages";

const BASE = "https://mormorsbreve.dk";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ArticleJsonLd({
  title,
  description,
  datePublished,
  url,
}: {
  title: string;
  description: string;
  datePublished: string;
  url: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished,
    publisher: {
      "@type": "Organization",
      name: "MormorsBreve",
      url: BASE,
    },
    author: {
      "@type": "Organization",
      name: "ITEBV GmbH",
      url: BASE,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface BlogPostPageProps {
  slug?: string;
}

export default function BlogPostPage(props: BlogPostPageProps) {
  const params = useParams<{ slug: string }>();
  const slug = props.slug ?? params?.slug ?? "";
  const post = getBlogPost(slug);
  const content = getBlogPostContent(slug);
  if (!post || !content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold mb-4">Artikel nicht gefunden</h1>
          <Link href="/blog">
            <Button variant="outline">Zurück zum Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const canonicalUrl = getCanonicalUrl(slug);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post.title} – MormorsBreve</title>
        <meta name="description" content={post.description} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>
      <ArticleJsonLd
        title={post.title}
        description={post.description}
        datePublished={post.datePublished}
        url={canonicalUrl}
      />

      <MarketingNav activeLink="blog" />

      <main className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Blog
        </Link>

        <article>
          <header className="mb-8">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-3">
              {post.title}
            </h1>
            <time className="text-sm text-muted-foreground" dateTime={post.datePublished}>
              {formatDate(post.datePublished)}
            </time>
          </header>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4">
            {content}
          </div>

          <footer className="mt-12 pt-8 border-t border-border">
            <p className="text-muted-foreground mb-4">
              Haben Sie Briefe oder Tagebücher in Sütterlin oder alter Schrift? Probieren Sie die Transkription kostenlos aus.
            </p>
            <Link href="/">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                Jetzt kostenlos ausprobieren
              </Button>
            </Link>
          </footer>
        </article>
      </main>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <Logo height="h-6" />
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link href="/blog" className="hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link href="/beispiele" className="hover:text-foreground transition-colors">
              Beispiele
            </Link>
            {TOPIC_PAGES.map((tp) => (
              <Link key={tp.slug} href={`/${tp.slug}`} className="hover:text-foreground transition-colors">{tp.heroTitle}</Link>
            ))}
            <Link href="/impressum" className="hover:text-foreground transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-foreground transition-colors">
              Datenschutz
            </Link>
            <Link href="/agb" className="hover:text-foreground transition-colors">
              AGB
            </Link>
            <Link href="/widerrufsbelehrung" className="hover:text-foreground transition-colors">
              Widerruf
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ITEBV GmbH. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>

    </div>
  );
}

export { getAllSlugs };
