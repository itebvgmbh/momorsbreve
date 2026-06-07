import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, CheckCircle2, XCircle, ArrowLeft, KeyRound } from "lucide-react";

type Status = "loading" | "success" | "error" | "input";

export default function AuthActionPage() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const oobCode = params.get("oobCode") ?? "";
  const [, navigate] = useLocation();

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [email, setEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (!oobCode) {
      setError("Ungueltiger Link. Bitte fordern Sie eine neue E-Mail an.");
      setStatus("error");
      return;
    }

    if (mode === "verifyEmail") {
      (async () => {
        try {
          const actionInfo = await checkActionCode(auth, oobCode);
          const verifiedEmail = actionInfo.data.email?.toLowerCase();

          await applyActionCode(auth, oobCode);

          const currentUser = auth.currentUser;
          const currentEmail = currentUser?.email?.toLowerCase();

          if (currentUser && currentEmail === verifiedEmail) {
            await currentUser.reload();
            await currentUser.getIdToken(true);
            setAutoLogin(true);
            setTimeout(() => navigate("/"), 2000);
          } else if (currentUser && currentEmail !== verifiedEmail) {
            await signOut(auth);
            setVerifiedEmail(verifiedEmail ?? "");
            setNeedsLogin(true);
          } else {
            setVerifiedEmail(verifiedEmail ?? "");
            setNeedsLogin(true);
          }

          setStatus("success");
        } catch {
          setError(
            "Der Bestaetigungslink ist ungueltig oder abgelaufen. Bitte fordern Sie eine neue E-Mail an."
          );
          setStatus("error");
        }
      })();
    } else if (mode === "resetPassword") {
      verifyPasswordResetCode(auth, oobCode)
        .then((userEmail) => {
          setEmail(userEmail);
          setStatus("input");
        })
        .catch(() => {
          setError(
            "Der Link zum Zuruecksetzen ist ungueltig oder abgelaufen. Bitte fordern Sie einen neuen an."
          );
          setStatus("error");
        });
    } else {
      setError("Unbekannte Aktion.");
      setStatus("error");
    }
  }, [mode, oobCode]);

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword) return;
    setSubmitting(true);
    setLoginError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, verifiedEmail, loginPassword);
      if (cred.user.emailVerified) {
        setAutoLogin(true);
        setNeedsLogin(false);
        setTimeout(() => navigate("/"), 1500);
      }
    } catch (err: any) {
      const code = err?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setLoginError("Passwort falsch. Bitte versuchen Sie es erneut.");
      } else if (code === "auth/too-many-requests") {
        setLoginError("Zu viele Versuche. Bitte versuchen Sie es spaeter erneut.");
      } else {
        setLoginError("Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }
    if (newPassword !== confirmPw) {
      setError("Die Passwoerter stimmen nicht ueberein.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus("success");
    } catch {
      setError("Fehler beim Zuruecksetzen. Bitte fordern Sie einen neuen Link an.");
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === "verifyEmail"
      ? "E-Mail bestaetigen"
      : mode === "resetPassword"
        ? "Passwort zuruecksetzen"
        : "Auth-Aktion";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title} – MormorsBreve</title>
      </Helmet>

      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Logo height="h-8" />
          <ThemeToggle />
        </div>
      </nav>

      <main className="pt-24 pb-16 max-w-md mx-auto px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck zur Startseite
        </Link>

        {status === "loading" && (
          <div className="flex flex-col items-center text-center py-12 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Wird verarbeitet...</p>
          </div>
        )}

        {status === "success" && mode === "verifyEmail" && (
          <div className="flex flex-col items-center text-center py-12 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="font-serif text-2xl font-bold">
              E-Mail bestaetigt!
            </h1>
            {autoLogin ? (
              <>
                <p className="text-muted-foreground leading-relaxed">
                  Ihre E-Mail-Adresse wurde erfolgreich verifiziert. Sie werden
                  automatisch weitergeleitet...
                </p>
                <Loader2 className="h-5 w-5 animate-spin text-primary mt-2" />
              </>
            ) : needsLogin ? (
              <>
                <p className="text-muted-foreground leading-relaxed">
                  Ihre E-Mail-Adresse wurde erfolgreich verifiziert. Geben Sie
                  Ihr Passwort ein, um sich direkt anzumelden.
                </p>
                <form onSubmit={handleQuickLogin} className="w-full max-w-sm space-y-3 mt-2 text-left">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-sm">E-Mail</Label>
                    <Input
                      type="email"
                      value={verifiedEmail}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-login-pw">Passwort</Label>
                    <Input
                      id="quick-login-pw"
                      type="password"
                      placeholder="Ihr Passwort"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="current-password"
                      autoFocus
                    />
                  </div>
                  {loginError && (
                    <p className="text-sm text-destructive">{loginError}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Anmelden
                  </Button>
                </form>
              </>
            ) : (
              <>
                <p className="text-muted-foreground leading-relaxed">
                  Ihre E-Mail-Adresse wurde erfolgreich verifiziert. Sie koennen
                  sich jetzt anmelden.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/">Zur Anmeldung</Link>
                </Button>
              </>
            )}
          </div>
        )}

        {status === "success" && mode === "resetPassword" && (
          <div className="flex flex-col items-center text-center py-12 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="font-serif text-2xl font-bold">
              Passwort geaendert!
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Ihr Passwort wurde erfolgreich zurueckgesetzt. Sie koennen sich
              jetzt mit dem neuen Passwort anmelden.
            </p>
            <Button asChild className="mt-4">
              <Link href="/">Zur Anmeldung</Link>
            </Button>
          </div>
        )}

        {status === "input" && mode === "resetPassword" && (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <KeyRound className="h-7 w-7 text-primary" />
              </div>
              <h1 className="font-serif text-2xl font-bold">
                Neues Passwort festlegen
              </h1>
              {email && (
                <p className="text-muted-foreground text-sm">
                  fuer <strong>{email}</strong>
                </p>
              )}
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Neues Passwort</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Mind. 6 Zeichen"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Passwort wiederholen</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Passwort speichern
              </Button>
            </form>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center text-center py-12 space-y-4">
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="font-serif text-2xl font-bold">
              Etwas ist schiefgelaufen
            </h1>
            <p className="text-muted-foreground leading-relaxed">{error}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/">Zur Startseite</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
