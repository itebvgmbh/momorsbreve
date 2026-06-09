import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Loader2, ArrowRight, AlertTriangle, FileText } from "lucide-react";
import { queryClient, getAuthHeaders } from "@/lib/queryClient";
import { useEffect, useState, useRef } from "react";
import { trackPurchaseConversion, trackMetaPurchase, ensureConsentRestored } from "@/lib/gtag";

const MAX_POLL_DURATION_MS = 30_000;

interface SpecialistPaymentStatus {
  status: string;
  requestId?: number;
  pricePaid?: number;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "DKK",
  }).format(cents / 100);
}

export default function SpecialistPaymentSuccessPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const requestId = params.get("request_id");
  const [timedOut, setTimedOut] = useState(false);
  const pollStartRef = useRef(Date.now());

  const { data, isLoading, error } = useQuery<SpecialistPaymentStatus>({
    queryKey: ["/api/human-transcription/requests/payment-status", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/human-transcription/requests/${encodeURIComponent(requestId!)}/payment-status`,
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
      queryClient.invalidateQueries({ queryKey: ["/api/human-transcription/requests"] });

      if (!conversionTrackedRef.current && data.pricePaid != null) {
        conversionTrackedRef.current = true;
        ensureConsentRestored();
        trackPurchaseConversion({
          value: data.pricePaid / 100,
          transactionId: requestId ?? undefined,
          items: [
            {
              item_name: `Experten-Transkription #${requestId}`,
              item_category: "Experten-Service",
              price: data.pricePaid / 100,
              quantity: 1,
            },
          ],
        });
        trackMetaPurchase({
          value: data.pricePaid / 100,
          contentName: `Experten-Transkription #${requestId}`,
          contentIds: [requestId ?? "unknown"],
        });
      }
    }
  }, [data?.status, data?.pricePaid, requestId]);

  if (!requestId) {
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto mt-12">
        <Card className="p-8 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
          <h1 className="font-serif text-xl font-bold">{t("specialistPaySuccess.invalidLinkTitle")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("specialistPaySuccess.invalidLinkBody")}
          </p>
          <Button onClick={() => navigate("/app/human-transcription")}>
            {t("specialistPaySuccess.toOrders")}
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
          <h1 className="font-serif text-xl font-bold">{t("specialistPaySuccess.timeoutTitle")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("specialistPaySuccess.timeoutBody")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/app")}>
              {t("specialistPaySuccess.toDashboard")}
            </Button>
            <Button onClick={() => navigate("/app/human-transcription")}>
              {t("specialistPaySuccess.toOrders")}
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
          <h1 className="font-serif text-xl font-bold">{t("specialistPaySuccess.processingTitle")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("specialistPaySuccess.processingBody")}
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto mt-12">
        <Card className="p-8 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="font-serif text-xl font-bold">{t("specialistPaySuccess.errorTitle")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("specialistPaySuccess.errorBody")}
          </p>
          <Button onClick={() => navigate("/app/human-transcription")}>
            {t("specialistPaySuccess.toOrders")}
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
          <h1 className="font-serif text-2xl font-bold">{t("specialistPaySuccess.successTitle")}</h1>
          <p className="text-muted-foreground">
            {t("specialistPaySuccess.successBody")}
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5 text-primary" />
            <span>{t("specialistPaySuccess.orderNumber", { id: data?.requestId ?? requestId })}</span>
          </div>
          {data?.pricePaid != null && (
            <p className="text-sm text-muted-foreground">
              {t("specialistPaySuccess.paidLabel", { amount: formatPrice(data.pricePaid) })}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {t("specialistPaySuccess.processingNote")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate("/app")}>
            {t("specialistPaySuccess.toDashboard")}
          </Button>
          <Button onClick={() => navigate("/app/human-transcription")}>
            <ArrowRight className="h-4 w-4 mr-2" />
            {t("specialistPaySuccess.toOrders")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
