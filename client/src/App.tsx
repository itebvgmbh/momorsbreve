import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { parsePath } from "@/i18n/lang";
import { HreflangTags } from "@/components/hreflang-tags";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { CookieBanner } from "@/components/cookie-banner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth, AuthProvider } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Loader2 } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { captureGclid } from "@/lib/gtag";
import { TourProvider } from "@/hooks/use-tour";
import { WelcomeDialog } from "@/components/tour/welcome-dialog";
import { HelpMenu } from "@/components/tour/help-menu";

import LandingPage from "@/pages/landing";
import NotFound from "@/pages/not-found";

const DashboardPage = lazy(() => import("@/pages/dashboard"));
const UploadPage = lazy(() => import("@/pages/upload"));
const PreviewPage = lazy(() => import("@/pages/preview"));
const ResultPage = lazy(() => import("@/pages/result"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const PaymentSuccessPage = lazy(() => import("@/pages/payment-success"));
const PaymentCancelPage = lazy(() => import("@/pages/payment-cancel"));
const AdminEvaluationPage = lazy(() => import("@/pages/admin-evaluation"));
const AdminMessagesPage = lazy(() => import("@/pages/admin-messages"));
const AdminTokenUsagePage = lazy(() => import("@/pages/admin-token-usage"));
const AdminHumanTranscriptionPage = lazy(() => import("@/pages/admin-human-transcription"));
const AdminAnonymousAnalysesPage = lazy(() => import("@/pages/admin-anonymous-analyses"));
const HumanTranscriptionRequestPage = lazy(() => import("@/pages/human-transcription-request"));
const HumanTranscriptionOverviewPage = lazy(() => import("@/pages/human-transcription-overview"));
const MessagesPage = lazy(() => import("@/pages/messages"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const ImpressumPage = lazy(() => import("@/pages/impressum"));
const DatenschutzPage = lazy(() => import("@/pages/datenschutz"));
const AGBPage = lazy(() => import("@/pages/agb"));
const WiderrufsbelehrungPage = lazy(() => import("@/pages/widerrufsbelehrung"));
const AuthActionPage = lazy(() => import("@/pages/auth-action"));
const BlogPage = lazy(() => import("@/pages/blog"));
const BlogPostPage = lazy(() => import("@/pages/blog-post"));
const BeispielePage = lazy(() => import("@/pages/beispiele"));
const AnalysierenPage = lazy(() => import("@/pages/analysieren"));
const FaqPage = lazy(() => import("@/pages/faq"));
const SpecialistPaymentSuccessPage = lazy(() => import("@/pages/specialist-payment-success"));
const AdminDashboardPage = lazy(() => import("@/pages/admin-dashboard"));
const AdminOrdersPage = lazy(() => import("@/pages/admin-orders"));
const AdminInvoicesPage = lazy(() => import("@/pages/admin-invoices"));
const AdminSettingsPage = lazy(() => import("@/pages/admin-settings"));
const AdminMarketingPage = lazy(() => import("@/pages/admin-marketing"));
const AdminExpertsPage = lazy(() => import("@/pages/admin-experts"));
const ExpertDashboardPage = lazy(() => import("@/pages/expert-dashboard"));
const ExpertProfilePage = lazy(() => import("@/pages/expert-profile"));
const ExpertRequestDetailPage = lazy(() => import("@/pages/expert-request-detail"));
const AudioPage = lazy(() => import("@/pages/audio"));
const CombinePage = lazy(() => import("@/pages/combine"));
const TopicLandingPage = lazy(() => import("@/pages/topic-landing"));

function LazyFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/");
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

function AppLayout() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <AuthGuard>
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <TourProvider>
          <WelcomeDialog />
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center justify-between gap-4 p-2 border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex items-center gap-1">
                  <HelpMenu />
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-auto">
                <Suspense fallback={<LazyFallback />}>
                  <Switch>
                    <Route path="/app" component={DashboardPage} />
                    <Route path="/app/upload" component={UploadPage} />
                    <Route path="/app/audio" component={AudioPage} />
                    <Route path="/app/combine" component={CombinePage} />
                    <Route path="/app/preview/:id" component={PreviewPage} />
                    <Route path="/app/result/:id" component={ResultPage} />
                    <Route path="/app/pricing" component={PricingPage} />
                    <Route path="/app/human-transcription" component={HumanTranscriptionOverviewPage} />
                    <Route path="/app/human-transcription/:jobId" component={HumanTranscriptionRequestPage} />
                    <Route path="/app/expert" component={ExpertDashboardPage} />
                    <Route path="/app/expert/profile" component={ExpertProfilePage} />
                    <Route path="/app/expert/requests/:id" component={ExpertRequestDetailPage} />
                    <Route path="/app/support" component={MessagesPage} />
                    <Route path="/app/settings" component={SettingsPage} />
                    <Route path="/app/payment/success" component={PaymentSuccessPage} />
                    <Route path="/app/payment/cancel" component={PaymentCancelPage} />
                    <Route path="/app/specialist-payment/success" component={SpecialistPaymentSuccessPage} />
                    <Route path="/app/admin/dashboard" component={AdminDashboardPage} />
                    <Route path="/app/admin/support" component={AdminMessagesPage} />
                    <Route path="/app/admin/evaluation" component={AdminEvaluationPage} />
                    <Route path="/app/admin/tokens" component={AdminTokenUsagePage} />
                    <Route path="/app/admin/human-transcription" component={AdminHumanTranscriptionPage} />
                    <Route path="/app/admin/orders" component={AdminOrdersPage} />
                    <Route path="/app/admin/invoices" component={AdminInvoicesPage} />
                    <Route path="/app/admin/analysen" component={AdminAnonymousAnalysesPage} />
                    <Route path="/app/admin/settings" component={AdminSettingsPage} />
                    <Route path="/app/admin/marketing" component={AdminMarketingPage} />
                    <Route path="/app/admin/experts" component={AdminExpertsPage} />
                    <Route component={NotFound} />
                  </Switch>
                </Suspense>
              </main>
            </div>
          </div>
        </TourProvider>
      </SidebarProvider>
    </AuthGuard>
  );
}

function Router() {
  // Sprach-Präfix aus der URL ableiten (/de, /en); Dänisch ist präfixlos.
  const base = parsePath(typeof window !== "undefined" ? window.location.pathname : "/").base;
  return (
    <WouterRouter base={base}>
      <HreflangTags />
      <Suspense fallback={<LazyFallback />}>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/impressum" component={ImpressumPage} />
        <Route path="/datenschutz" component={DatenschutzPage} />
        <Route path="/agb" component={AGBPage} />
        <Route path="/widerrufsbelehrung" component={WiderrufsbelehrungPage} />
        <Route path="/blog" component={BlogPage} />
        <Route path="/blog/:slug">{(params) => <BlogPostPage slug={params.slug} />}</Route>
        <Route path="/beispiele" component={BeispielePage} />
        <Route path="/analysieren" component={AnalysierenPage} />
        <Route path="/faq" component={FaqPage} />
        <Route path="/feldpostbriefe-transkribieren">{() => <TopicLandingPage slug="feldpostbriefe-transkribieren" />}</Route>
        <Route path="/rezeptbuecher-transkribieren">{() => <TopicLandingPage slug="rezeptbuecher-transkribieren" />}</Route>
        <Route path="/kriegstagebuecher-transkribieren">{() => <TopicLandingPage slug="kriegstagebuecher-transkribieren" />}</Route>
        <Route path="/__/auth/action" component={AuthActionPage} />
        <Route path="/app" component={AppLayout} />
        <Route path="/app/*" component={AppLayout} />
        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </WouterRouter>
  );
}

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    captureGclid();
  }, []);

  return (
    <HelmetProvider>
      <Helmet htmlAttributes={{ lang: i18n.language }} />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <TooltipProvider>
              <Toaster />
              <CookieBanner />
              <Router />
            </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
