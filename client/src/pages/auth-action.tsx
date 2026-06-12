import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
  signInWithEmailAndPassword,
  isSignInWithEmailLink,
  signInWithEmailLink,
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
  const { t } = useTranslation();
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
      setError(t("authAction.invalidLink"));
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
          setError(t("authAction.verifyLinkInvalid"));
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
          setError(t("authAction.resetLinkInvalid"));
          setStatus("error");
        });
    } else if (mode === "signIn") {
      // Magic-Link-Anmeldung (passwortlos). E-Mail kommt aus localStorage,
      // wenn der Link auf demselben Gerät geöffnet wird – sonst nachfragen.
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setError(t("authAction.signInLinkInvalid"));
        setStatus("error");
        return;
      }
      const storedEmail = window.localStorage.getItem("emailForSignIn");
      if (storedEmail) {
        void completeMagicSignIn(storedEmail);
      } else {
        setStatus("input");
      }
    } else {
      setError(t("authAction.unknownAction"));
      setStatus("error");
    }
  }, [mode, oobCode]);

  const completeMagicSignIn = async (signInEmail: string) => {
    setSubmitting(true);
    setError("");
    try {
      await signInWithEmailLink(auth, signInEmail, window.location.href);
      window.localStorage.removeItem("emailForSignIn");
      setAutoLogin(true);
      setStatus("success");
      setTimeout(() => navigate("/"), 1500);
    } catch (err: any) {
      const code = err?.code;
      if (code === "auth/invalid-email") {
        setError(t("authAction.signInEmailMismatch"));
        setStatus("input");
      } else if (code === "auth/invalid-action-code" || code === "auth/expired-action-code") {
        setError(t("authAction.signInLinkInvalid"));
        setStatus("error");
      } else {
        setError(t("authAction.signInFailed"));
        setStatus("error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMagicEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    await completeMagicSignIn(email.trim().toLowerCase());
  };

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
        setLoginError(t("authAction.wrongPassword"));
      } else if (code === "auth/too-many-requests") {
        setLoginError(t("authAction.tooManyRequests"));
      } else {
        setLoginError(t("authAction.loginFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError(t("authAction.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPw) {
      setError(t("authAction.passwordsMismatch"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus("success");
    } catch {
      setError(t("authAction.resetFailed"));
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === "verifyEmail"
      ? t("authAction.titleVerify")
      : mode === "resetPassword"
        ? t("authAction.titleReset")
        : mode === "signIn"
          ? t("authAction.signInTitle")
          : t("authAction.titleDefault");

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t("authAction.metaTitle", { title })}</title>
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
          {t("authAction.backToHome")}
        </Link>

        {status === "loading" && (
          <div className="flex flex-col items-center text-center py-12 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">{t("authAction.processing")}</p>
          </div>
        )}

        {status === "success" && mode === "signIn" && (
          <div className="flex flex-col items-center text-center py-12 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="font-serif text-2xl font-bold">
              {t("authAction.signInSuccessTitle")}
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              {t("authAction.signInSuccessBody")}
            </p>
            <Loader2 className="h-5 w-5 animate-spin text-primary mt-2" />
          </div>
        )}

        {status === "input" && mode === "signIn" && (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <KeyRound className="h-7 w-7 text-primary" />
              </div>
              <h1 className="font-serif text-2xl font-bold">
                {t("authAction.signInConfirmTitle")}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                {t("authAction.signInConfirmBody")}
              </p>
            </div>

            <form onSubmit={handleMagicEmailSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="magic-confirm-email">{t("authAction.emailLabel")}</Label>
                <Input
                  id="magic-confirm-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {t("authAction.signInSubmit")}
              </Button>
            </form>
          </div>
        )}

        {status === "success" && mode === "verifyEmail" && (
          <div className="flex flex-col items-center text-center py-12 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="font-serif text-2xl font-bold">
              {t("authAction.emailVerifiedTitle")}
            </h1>
            {autoLogin ? (
              <>
                <p className="text-muted-foreground leading-relaxed">
                  {t("authAction.emailVerifiedAutoRedirect")}
                </p>
                <Loader2 className="h-5 w-5 animate-spin text-primary mt-2" />
              </>
            ) : needsLogin ? (
              <>
                <p className="text-muted-foreground leading-relaxed">
                  {t("authAction.emailVerifiedEnterPassword")}
                </p>
                <form onSubmit={handleQuickLogin} className="w-full max-w-sm space-y-3 mt-2 text-left">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-sm">{t("authAction.emailLabel")}</Label>
                    <Input
                      type="email"
                      value={verifiedEmail}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-login-pw">{t("authAction.passwordLabel")}</Label>
                    <Input
                      id="quick-login-pw"
                      type="password"
                      placeholder={t("authAction.passwordPlaceholder")}
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
                    {t("authAction.signIn")}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <p className="text-muted-foreground leading-relaxed">
                  {t("authAction.emailVerifiedCanLogin")}
                </p>
                <Button asChild className="mt-4">
                  <Link href="/">{t("authAction.toLogin")}</Link>
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
              {t("authAction.passwordChangedTitle")}
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              {t("authAction.passwordChangedBody")}
            </p>
            <Button asChild className="mt-4">
              <Link href="/">{t("authAction.toLogin")}</Link>
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
                {t("authAction.setNewPasswordTitle")}
              </h1>
              {email && (
                <p className="text-muted-foreground text-sm">
                  {t("authAction.forEmail")} <strong>{email}</strong>
                </p>
              )}
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">{t("authAction.newPasswordLabel")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder={t("authAction.minCharsPlaceholder")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">{t("authAction.confirmPasswordLabel")}</Label>
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
                {t("authAction.savePassword")}
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
              {t("authAction.somethingWrong")}
            </h1>
            <p className="text-muted-foreground leading-relaxed">{error}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/">{t("authAction.toHome")}</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
