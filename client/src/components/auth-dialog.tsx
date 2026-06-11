import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, MailCheck, KeyRound } from "lucide-react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "login" | "register";
}

export function AuthDialog({ open, onOpenChange, initialMode = "login" }: AuthDialogProps) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<"login" | "register" | "verify" | "forgot" | "reset-sent">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);

  const reset = () => {
    setMode(initialMode);
    setEmail("");
    setPassword("");
    setError(null);
    setLoading(false);
    setAcceptedTerms(false);
    setNewsletterOptIn(true);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) reset();
    onOpenChange(value);
  };

  const handleGoogle = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      if (mode === "register") {
        localStorage.setItem("newsletter_opt_in", JSON.stringify(newsletterOptIn));
      }
      await signInWithPopup(auth, provider);
      handleOpenChange(false);
    } catch (err: any) {
      console.error("[Google Auth Error]", err?.code, err?.message, err);
      if (
        err?.code === "auth/popup-blocked" ||
        err?.code === "auth/popup-closed-by-user"
      ) {
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectErr: any) {
          console.error("[Google Redirect Error]", redirectErr?.code, redirectErr?.message, redirectErr);
          setError(firebaseErrorMessage(t, redirectErr?.code));
        }
      } else {
        setError(firebaseErrorMessage(t, err?.code));
      }
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        localStorage.setItem("newsletter_opt_in", JSON.stringify(newsletterOptIn));
        await createUserWithEmailAndPassword(auth, email, password);
        // Verifizierungs-Mail kommt vom eigenen Server (Resend) — Firebase'
        // Vorlagen-Versand ist projektseitig gesperrt.
        await apiRequest("POST", "/api/auth/send-verification-email");
        setMode("verify");
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (!cred.user.emailVerified) {
          await apiRequest("POST", "/api/auth/send-verification-email");
          setError(t("auth.verifyFirstError"));
          return;
        }
        handleOpenChange(false);
        setEmail("");
        setPassword("");
      }
    } catch (err: any) {
      console.error("[Email Auth Error]", err?.code, err?.message, err);
      setError(firebaseErrorMessage(t, err?.code));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiRequest("POST", "/api/auth/send-password-reset", {
        email,
        lang: i18n.language,
      });
      setMode("reset-sent");
    } catch (err: any) {
      setError(firebaseErrorMessage(t, err?.code));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
  };

  if (mode === "reset-sent") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-4 space-y-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="font-serif text-xl">
              {t("auth.resetSentTitle")}
            </DialogTitle>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              {t("auth.resetSentBodyBefore")}{" "}
              <strong>{email}</strong> {t("auth.resetSentBodyAfter")}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("auth.resetSentSpamHint")}
            </p>
            <Button
              className="w-full mt-2"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
            >
              {t("auth.backToLogin")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (mode === "forgot") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {t("auth.forgotTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("auth.forgotIntro")}
            </p>

            <form onSubmit={handlePasswordReset} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">{t("auth.emailLabel")}</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("auth.sendLink")}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("auth.backToLogin")}
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (mode === "verify") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-4 space-y-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <MailCheck className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="font-serif text-xl">
              {t("auth.verifyTitle")}
            </DialogTitle>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              {t("auth.verifyBodyBefore")} <strong>{email}</strong> {t("auth.verifyBodyAfter")}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("auth.verifyThenLogin")}
            </p>
            <Button
              className="w-full mt-2"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
            >
              {t("auth.toLogin")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogle}
            disabled={mode === "register" && !acceptedTerms}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t("auth.googleSignIn")}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t("auth.orWithEmail")}
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="auth-email">{t("auth.emailLabel")}</Label>
              <Input
                id="auth-email"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="auth-password">{t("auth.passwordLabel")}</Label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                      setPassword("");
                    }}
                    className="text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                )}
              </div>
              <Input
                id="auth-password"
                type="password"
                placeholder={mode === "register" ? t("auth.passwordPlaceholder") : ""}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {mode === "register" && (
              <div className="flex items-start gap-2.5 pt-1">
                <Checkbox
                  id="accept-terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="accept-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
                  {t("auth.termsBefore")}{" "}
                  <a href="/agb" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">{t("auth.termsLink")}</a>
                  {" "}{t("auth.termsMiddle")}{" "}
                  <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">{t("auth.privacyLink")}</a>
                  {" "}{t("auth.termsAfter")}
                </label>
              </div>
            )}

            {mode === "register" && (
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="newsletter-opt-in"
                  checked={newsletterOptIn}
                  onCheckedChange={(checked) => setNewsletterOptIn(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="newsletter-opt-in" className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
                  {t("auth.newsletterOptIn")}
                </label>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading || (mode === "register" && !acceptedTerms)}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "login" ? t("auth.loginSubmit") : t("auth.registerSubmit")}
            </Button>
          </form>

          {mode === "login" && (
            <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
              {t("auth.loginConsentBefore")}{" "}
              <a href="/agb" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-muted-foreground">{t("auth.termsLink")}</a>
              {" "}{t("auth.loginConsentMiddle")}{" "}
              <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-muted-foreground">{t("auth.privacyLink")}</a>{t("auth.loginConsentAfter")}
            </p>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                {t("auth.noAccountYet")}{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {t("auth.registerNow")}
                </button>
              </>
            ) : (
              <>
                {t("auth.alreadyAccount")}{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {t("auth.loginSubmit")}
                </button>
              </>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function firebaseErrorMessage(t: (key: string, options?: Record<string, unknown>) => string, code?: string): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return t("auth.errInvalidCredentials");
    case "auth/email-already-in-use":
      return t("auth.errEmailInUse");
    case "auth/weak-password":
      return t("auth.errWeakPassword");
    case "auth/invalid-email":
      return t("auth.errInvalidEmail");
    case "auth/too-many-requests":
      return t("auth.errTooManyRequests");
    case "auth/network-request-failed":
      return t("auth.errNetwork");
    case "auth/missing-email":
      return t("auth.errMissingEmail");
    case "auth/account-exists-with-different-credential":
      return t("auth.errAccountExistsDifferentCredential");
    case "auth/unauthorized-domain":
      return t("auth.errUnauthorizedDomain");
    case "auth/operation-not-allowed":
      return t("auth.errOperationNotAllowed");
    case "auth/popup-blocked":
      return t("auth.errPopupBlocked");
    case "auth/popup-closed-by-user":
      return t("auth.errPopupClosed");
    case "auth/cancelled-popup-request":
      return t("auth.errCancelledPopupRequest");
    case "auth/internal-error":
      return t("auth.errInternal");
    default:
      return code
        ? t("auth.errGenericWithCode", { code })
        : t("auth.errGeneric");
  }
}
