import { Link } from "wouter";
import { useTranslation } from "react-i18next";

// Nur das Symbol (Buch-Icon), Text „MormorsBreve“ wird separat daneben gerendert
import logoSrc from "@/assets/logo.png";

type LogoProps = {
  className?: string;
  /** Höhe des Symbols (z. B. h-6, h-8) */
  height?: string;
  /** Als Link zur Startseite (default: true) */
  asLink?: boolean;
  /** Text neben dem Logo anzeigen (default: true) */
  showText?: boolean;
};

export function Logo({ className = "", height = "h-8", asLink = true, showText = true }: LogoProps) {
  const { t } = useTranslation();
  const content = (
    <>
      <img
        src={logoSrc}
        alt={t("common.logoAlt")}
        className={`${height} w-auto shrink-0`}
      />
      {showText && (
        <span className="font-serif font-bold text-base sm:text-lg ml-2 whitespace-nowrap">
          MormorsBreve
        </span>
      )}
    </>
  );
  if (asLink) {
    return (
      <Link href="/" className="flex items-center gap-2" data-testid="link-logo">
        {content}
      </Link>
    );
  }
  return <span className={`flex items-center gap-2 ${className}`}>{content}</span>;
}
