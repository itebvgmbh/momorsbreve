import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { Card } from "@/components/ui/card";
import { BLOG_POSTS } from "@/data/blog-posts";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t("blog.metaTitle")}</title>
        <meta
          name="description"
          content={t("blog.metaDescription")}
        />
        <link rel="canonical" href="https://mormorsbreve.dk/blog" />
      </Helmet>
      <MarketingNav activeLink="blog" />

      <main className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
          {t("blog.h1")}
        </h1>
        <p className="text-muted-foreground mb-10 max-w-2xl">
          {t("blog.intro")}
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

      <MarketingFooter />

    </div>
  );
}
