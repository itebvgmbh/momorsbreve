import { Link, useParams } from "wouter";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { Button } from "@/components/ui/button";
import {
  getBlogPost,
  getBlogPostContent,
  getCanonicalUrl,
  getAllSlugs,
} from "@/data/blog-posts";

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
      name: "MormorsBreve",
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
  const { t } = useTranslation();
  const params = useParams<{ slug: string }>();
  const slug = props.slug ?? params?.slug ?? "";
  const post = getBlogPost(slug);
  const content = getBlogPostContent(slug);
  if (!post || !content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold mb-4">{t("blogPost.notFound")}</h1>
          <Link href="/blog">
            <Button variant="outline">{t("blogPost.backToBlog")}</Button>
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
          {t("blogPost.backToBlog")}
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
              {t("blogPost.ctaText")}
            </p>
            <Link href="/">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                {t("blogPost.ctaButton")}
              </Button>
            </Link>
          </footer>
        </article>
      </main>

      <MarketingFooter />

    </div>
  );
}

export { getAllSlugs };
