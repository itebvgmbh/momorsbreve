import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { Logo } from "@/components/logo";
import { MarketingNav } from "@/components/marketing-nav";
import { Card } from "@/components/ui/card";
import { BLOG_POSTS } from "@/data/blog-posts";
import { TOPIC_PAGES } from "@/data/topic-pages";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Blog – Sütterlin, Kurrent &amp; alte Handschriften | MormorsBreve</title>
        <meta
          name="description"
          content="Tipps und Anleitungen: Sütterlin lesen lernen, alte deutsche Schrift entziffern, Handschriften digitalisieren und transkribieren. Für Familienforschung und Erinnerungen."
        />
        <link rel="canonical" href="https://mormorsbreve.dk/blog" />
      </Helmet>
      <MarketingNav activeLink="blog" />

      <main className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
          Blog
        </h1>
        <p className="text-muted-foreground mb-10 max-w-2xl">
          Anleitungen und Wissenswertes rund um Sütterlin, Kurrent und das Lesen alter Handschriften – für alle, die Omas Briefe und Tagebücher entziffern möchten.
        </p>

        <ul className="space-y-6">
          {BLOG_POSTS.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`}>
                <Card className="p-5 sm:p-6 hover:border-primary/40 transition-colors cursor-pointer h-full block">
                  <h2 className="font-serif text-xl font-semibold mb-2 text-foreground hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {post.description}
                  </p>
                  <time className="text-xs text-muted-foreground" dateTime={post.datePublished}>
                    {formatDate(post.datePublished)}
                  </time>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <Logo height="h-6" />
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link href="/blog" className="hover:text-foreground transition-colors">
              Blog
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
            &copy; {new Date().getFullYear()} MormorsBreve. Alle rettigheder forbeholdes.
          </p>
        </div>
      </footer>

    </div>
  );
}
