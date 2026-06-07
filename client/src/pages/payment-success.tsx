import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Coins, Loader2, ArrowRight, AlertTriangle } from "lucide-react";
import { queryClient, getAuthHeaders } from "@/lib/queryClient";
import { useEffect, useState, useRef } from "react";
import { trackPurchaseConversion, trackMetaPurchase, ensureConsentRestored } from "@/lib/gtag";

const MAX_POLL_DURATION_MS = 30_000;

interface PaymentStatus {
  status: string;
  credits: number;
  pages: number;
  packageName: string;
  currentCredits: number;
  amountEur: number;
  originalPriceEur: number;
  discountPercent: number;
  promotionLabel: string;
}

export default function PaymentSuccessPage() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const sessionId = params.get("session_id");
  const [timedOut, setTimedOut] = useState(false);
  const pollStartRef = useRef(Date.now());

  const { data, isLoading, error } = useQuery<PaymentStatus>({
    queryKey: ["/api/payment/status", sessionId ?? ""],
    enabled: !!sessionId,
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/payment/status?session_id=${encodeURIComponent(sessionId!)}`,
        { headers }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
      return res.json();
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "pending") {
        if (Date.now() - pollStartRef.current > MAX_POLL_DURATION_MS) {
          setTimedOut(true);
          return false;
        }
        return 2000;
      }
      return false;
    },
  });

  const conversionTrackedRef = useRef(false);

  useEffect(() => {
    ensureConsentRestored();
  }, []);

  useEffect(() => {
    if (data?.status === "completed") {
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });

      if (!conversionTrackedRef.current) {
        conversionTrackedRef.current = true;
        ensureConsentRestored();
        const valuePaid = data.amountEur / 100;
        const originalValue = data.originalPriceEur / 100;
        const discount = originalValue - valuePaid;
        trackPurchaseConversion({
          value: valuePaid,
          transactionId: sessionId ?? undefined,
          promotionActive: data.discountPercent > 0,
          promotionLabel: data.promotionLabel,
          items: [
            {
              item_name: `${data.packageName} – ${data.pages} Credits`,
              item_category: "Credit-Paket",
              price: valuePaid,
              quantity: 1,
              discount: discount > 0 ? discount : undefined,
              promotion_name: data.promotionLabel || undefined,
            },
          ],
        });
        trackMetaPurchase({
          value: valuePaid,
          contentName: `${data.packageName} – ${data.pages} Credits`,
          contentIds: [sessionId ?? "unknown"],
        });
      }
    }
  }, [data?.status, data?.amountEur, data?.originalPriceEur, data?.discountPercent, data?.promotionLabel, data?.packageName, data?.pages, sessionId]);

  if (!sessionId) {
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto mt-12">
        <Card className="p-8 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
          <h1 className="font-serif text-xl font-bold">Ungültiger Link</h1>
          <p className="text-muted-foreground text-sm">
            Diese Seite kann nicht ohne eine gültige Session-ID aufgerufen werden.
          </p>
          <Button onClick={() => navigate("/app/pricing")}>
            Zurück zu den Paketen
          </Button>
        </Card>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto mt-12">
        <Card className="p-8 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
          <h1 className="font-serif text-xl font-bold">Verarbeitung dauert länger als erwartet</h1>
          <p className="text-muted-foreground text-sm">
            Ihre Zahlung wurde von Stripe entgegengenommen. Die Gutschrift
            kann in seltenen Fällen einige Minuten dauern. Bitte prüfen Sie Ihr Guthaben
            auf dem Dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/app")}>
              Zum Dashboard
            </Button>
            <Button onClick={() => navigate("/app/pricing")}>
              Zurück zu den Paketen
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading || data?.status === "pending") {
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto mt-12">
        <Card className="p-8 text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h1 className="font-serif text-xl font-bold">Zahlung wird verarbeitet...</h1>
          <p className="text-muted-foreground text-sm">
            Bitte warten Sie einen Moment, Ihre Zahlung wird überprüft.
          </p>
        </Card>
      </div>
    );
  }

  if (error || data?.status === "failed" || data?.status === "expired") {
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto mt-12">
        <Card className="p-8 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="font-serif text-xl font-bold">Zahlung fehlgeschlagen</h1>
          <p className="text-muted-foreground text-sm">
            Die Zahlung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.
          </p>
          <Button onClick={() => navigate("/app/pricing")}>
            Erneut versuchen
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto mt-12">
      <Card className="p-8 text-center space-y-6">
        <div className="relative mx-auto w-fit">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold">Zahlung erfolgreich!</h1>
          <p className="text-muted-foreground">
            Vielen Dank für Ihren Kauf.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-center gap-2 text-lg font-semibold">
            <Coins className="h-5 w-5 text-primary" />
            <span>+{data?.credits} Credits</span>
          </div>
          {data?.packageName && (
            <p className="text-sm text-muted-foreground">
              Paket: {data.packageName}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Aktuelles Guthaben:{" "}
            <span className="font-semibold text-foreground">
              {data?.currentCredits} {data?.currentCredits === 1 ? "Credit" : "Credits"}
            </span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate("/app")}>
            Zum Dashboard
          </Button>
          <Button onClick={() => navigate("/app/upload")}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Dokument hochladen
          </Button>
        </div>
      </Card>
    </div>
  );
}
