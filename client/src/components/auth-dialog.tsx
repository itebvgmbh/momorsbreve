import { useState } from "react";
import {
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
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
          setError(firebaseErrorMessage(redirectErr?.code));
        }
      } else {
        setError(firebaseErrorMessage(err?.code));
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
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);
        setMode("verify");
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (!cred.user.emailVerified) {
          await sendEmailVerification(cred.user);
          setError("Bitte bestaetigen Sie zuerst Ihre E-Mail-Adresse. Wir haben Ihnen eine neue Bestaetigungsmail gesendet.");
          return;
        }
        handleOpenChange(false);
        setEmail("");
        setPassword("");
      }
    } catch (err: any) {
      console.error("[Email Auth Error]", err?.code, err?.message, err);
      setError(firebaseErrorMessage(err?.code));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMode("reset-sent");
    } catch (err: any) {
      setError(firebaseErrorMessage(err?.code));
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
              E-Mail gesendet
            </DialogTitle>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Wir haben eine E-Mail zum Zuruecksetzen des Passworts an{" "}
              <strong>{email}</strong> gesendet. Bitte pruefen Sie Ihren
              Posteingang und folgen Sie dem Link in der E-Mail.
            </p>
            <p className="text-muted-foreground text-xs">
              Pruefen Sie auch Ihren Spam-Ordner, falls Sie die E-Mail nicht
              finden.
            </p>
            <Button
              className="w-full mt-2"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
            >
              Zurueck zur Anmeldung
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
              Passwort zuruecksetzen
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Link
              zum Zuruecksetzen Ihres Passworts.
            </p>

            <form onSubmit={handlePasswordReset} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">E-Mail</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="name@beispiel.de"
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
                Link senden
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
                Zurueck zur Anmeldung
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
              E-Mail bestaetigen
            </DialogTitle>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Wir haben eine Bestaetigungsmail an <strong>{email}</strong> gesendet.
              Bitte klicken Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren.
            </p>
            <p className="text-muted-foreground text-xs">
              Danach koennen Sie sich hier anmelden.
            </p>
            <Button
              className="w-full mt-2"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
            >
              Zur Anmeldung
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
            {mode === "login" ? "Anmelden" : "Konto erstellen"}
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
            Mit Google anmelden
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                oder mit E-Mail
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="auth-email">E-Mail</Label>
              <Input
                id="auth-email"
                type="email"
                placeholder="name@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="auth-password">Passwort</Label>
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
                    Passwort vergessen?
                  </button>
                )}
              </div>
              <Input
                id="auth-password"
                type="password"
                placeholder={mode === "register" ? "Mind. 6 Zeichen" : ""}
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
                  Ich akzeptiere die{" "}
                  <a href="/agb" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">AGB</a>
                  {" "}und habe die{" "}
                  <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">Datenschutzerklärung</a>
                  {" "}zur Kenntnis genommen.
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
                  Ich möchte den Newsletter mit Tipps und Neuigkeiten rund um historische Handschriften erhalten.
                </label>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading || (mode === "register" && !acceptedTerms)}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "login" ? "Anmelden" : "Registrieren"}
            </Button>
          </form>

          {mode === "login" && (
            <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
              Mit der Anmeldung akzeptieren Sie unsere{" "}
              <a href="/agb" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-muted-foreground">AGB</a>
              {" "}und{" "}
              <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-muted-foreground">Datenschutzerklärung</a>.
            </p>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Noch kein Konto?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Jetzt registrieren
                </button>
              </>
            ) : (
              <>
                Schon ein Konto?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Anmelden
                </button>
              </>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function firebaseErrorMessage(code?: string): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-Mail oder Passwort falsch.";
    case "auth/email-already-in-use":
      return "Diese E-Mail wird bereits verwendet.";
    case "auth/weak-password":
      return "Das Passwort muss mindestens 6 Zeichen lang sein.";
    case "auth/invalid-email":
      return "Bitte geben Sie eine gueltige E-Mail-Adresse ein.";
    case "auth/too-many-requests":
      return "Zu viele Versuche. Bitte versuchen Sie es spaeter erneut.";
    case "auth/network-request-failed":
      return "Netzwerkfehler. Bitte pruefen Sie Ihre Internetverbindung.";
    case "auth/missing-email":
      return "Bitte geben Sie eine E-Mail-Adresse ein.";
    case "auth/account-exists-with-different-credential":
      return "Diese E-Mail wurde bereits mit einer anderen Methode (z. B. Passwort) registriert. Bitte melden Sie sich auf dem urspruenglichen Weg an.";
    case "auth/unauthorized-domain":
      return "Diese Domain ist nicht in Firebase fuer die Anmeldung freigegeben. Bitte fuegen Sie die aktuelle URL in der Firebase-Konsole unter Authentication \u2192 Settings \u2192 Authorized domains hinzu.";
    case "auth/operation-not-allowed":
      return "Diese Anmeldemethode ist in Firebase nicht aktiviert. Bitte aktivieren Sie sie in der Firebase-Konsole.";
    case "auth/popup-blocked":
      return "Ihr Browser blockiert das Anmeldefenster. Bitte erlauben Sie Pop-ups fuer diese Seite.";
    case "auth/popup-closed-by-user":
      return "Das Anmeldefenster wurde geschlossen, bevor die Anmeldung abgeschlossen war.";
    case "auth/cancelled-popup-request":
      return "Eine andere Anmeldung laeuft bereits. Bitte versuchen Sie es erneut.";
    case "auth/internal-error":
      return "Interner Fehler bei der Anmeldung. Bitte versuchen Sie es erneut.";
    default:
      return code
        ? `Ein Fehler ist aufgetreten (${code}). Bitte versuchen Sie es erneut.`
        : "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.";
  }
}
