import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Save } from "lucide-react";

interface ExpertProfile {
  companyName: string | null;
  legalName: string | null;
  contactName: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  vatId: string | null;
  taxNumber: string | null;
  website: string | null;
  phone: string | null;
  invoiceEmail: string | null;
  businessType: string | null;
  tradeRegisterName: string | null;
  tradeRegisterNumber: string | null;
  legalComplianceConfirmed: boolean;
  actsAsBusinessConfirmed: boolean;
  externalBillingConfirmed: boolean;
  confidentialityConfirmed: boolean;
  dataProtectionConfirmed: boolean;
  liabilityInsuranceConfirmed: boolean;
  termsText: string | null;
}

const emptyProfile: ExpertProfile = {
  companyName: "",
  legalName: "",
  contactName: "",
  street: "",
  postalCode: "",
  city: "",
  country: "Deutschland",
  vatId: "",
  taxNumber: "",
  website: "",
  phone: "",
  invoiceEmail: "",
  businessType: "",
  tradeRegisterName: "",
  tradeRegisterNumber: "",
  legalComplianceConfirmed: false,
  actsAsBusinessConfirmed: false,
  externalBillingConfirmed: false,
  confidentialityConfirmed: false,
  dataProtectionConfirmed: false,
  liabilityInsuranceConfirmed: false,
  termsText: "",
};

export default function ExpertProfilePage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<ExpertProfile>(emptyProfile);

  const { data, isLoading } = useQuery<{ expert: ExpertProfile | null; canQuote: boolean; missingFields: string[] }>({
    queryKey: ["/api/expert/me"],
  });

  useEffect(() => {
    if (data?.expert) setForm({ ...emptyProfile, ...data.expert });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/expert/profile", form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expert/me"] });
      toast({ title: t("expertProfile.profileSaved") });
    },
    onError: (error: Error) => {
      toast({ title: t("expertProfile.errorTitle"), description: error.message, variant: "destructive" });
    },
  });

  const setField = (key: keyof ExpertProfile, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const setBooleanField = (key: keyof ExpertProfile, value: boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.expert) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <Card className="p-8 text-center text-muted-foreground">{t("expertProfile.noActiveExpertAccount")}</Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate("/app/expert")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("expertProfile.back")}
      </Button>

      <Card className="p-5 space-y-4">
        <div>
          <h1 className="font-serif text-xl font-bold">{t("expertProfile.companyProfile")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("expertProfile.companyProfileDescription")}
          </p>
        </div>

        <Card className={`p-3 ${data?.canQuote ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20" : "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20"}`}>
          <p className="text-sm font-medium">
            {data?.canQuote ? t("expertProfile.profileComplete") : t("expertProfile.profileIncomplete")}
          </p>
          {!data?.canQuote && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("expertProfile.missing", { fields: (data?.missingFields ?? []).join(", ") })}
            </p>
          )}
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t("expertProfile.fieldCompany")} value={form.companyName} onChange={(v) => setField("companyName", v)} />
          <Field label={t("expertProfile.fieldLegalName")} value={form.legalName} onChange={(v) => setField("legalName", v)} />
          <Field label={t("expertProfile.fieldContactName")} value={form.contactName} onChange={(v) => setField("contactName", v)} />
          <Field label={t("expertProfile.fieldInvoiceEmail")} value={form.invoiceEmail} onChange={(v) => setField("invoiceEmail", v)} />
          <Field label={t("expertProfile.fieldStreet")} value={form.street} onChange={(v) => setField("street", v)} />
          <Field label={t("expertProfile.fieldPostalCode")} value={form.postalCode} onChange={(v) => setField("postalCode", v)} />
          <Field label={t("expertProfile.fieldCity")} value={form.city} onChange={(v) => setField("city", v)} />
          <Field label={t("expertProfile.fieldCountry")} value={form.country} onChange={(v) => setField("country", v)} />
          <Field label={t("expertProfile.fieldVatId")} value={form.vatId} onChange={(v) => setField("vatId", v)} />
          <Field label={t("expertProfile.fieldTaxNumber")} value={form.taxNumber} onChange={(v) => setField("taxNumber", v)} />
          <Field label={t("expertProfile.fieldWebsite")} value={form.website} onChange={(v) => setField("website", v)} />
          <Field label={t("expertProfile.fieldPhone")} value={form.phone} onChange={(v) => setField("phone", v)} />
          <Field label={t("expertProfile.fieldBusinessType")} value={form.businessType} onChange={(v) => setField("businessType", v)} placeholder={t("expertProfile.fieldBusinessTypePlaceholder")} />
          <Field label={t("expertProfile.fieldTradeRegisterName")} value={form.tradeRegisterName} onChange={(v) => setField("tradeRegisterName", v)} />
          <Field label={t("expertProfile.fieldTradeRegisterNumber")} value={form.tradeRegisterNumber} onChange={(v) => setField("tradeRegisterNumber", v)} />
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <h2 className="text-sm font-medium">{t("expertProfile.legalConfirmations")}</h2>
          <ConfirmCheckbox
            checked={form.actsAsBusinessConfirmed}
            onCheckedChange={(checked) => setBooleanField("actsAsBusinessConfirmed", checked)}
            label={t("expertProfile.confirmActsAsBusiness")}
          />
          <ConfirmCheckbox
            checked={form.externalBillingConfirmed}
            onCheckedChange={(checked) => setBooleanField("externalBillingConfirmed", checked)}
            label={t("expertProfile.confirmExternalBilling")}
          />
          <ConfirmCheckbox
            checked={form.legalComplianceConfirmed}
            onCheckedChange={(checked) => setBooleanField("legalComplianceConfirmed", checked)}
            label={t("expertProfile.confirmLegalCompliance")}
          />
          <ConfirmCheckbox
            checked={form.confidentialityConfirmed}
            onCheckedChange={(checked) => setBooleanField("confidentialityConfirmed", checked)}
            label={t("expertProfile.confirmConfidentiality")}
          />
          <ConfirmCheckbox
            checked={form.dataProtectionConfirmed}
            onCheckedChange={(checked) => setBooleanField("dataProtectionConfirmed", checked)}
            label={t("expertProfile.confirmDataProtection")}
          />
          <ConfirmCheckbox
            checked={form.liabilityInsuranceConfirmed}
            onCheckedChange={(checked) => setBooleanField("liabilityInsuranceConfirmed", checked)}
            label={t("expertProfile.confirmLiabilityInsurance")}
          />
        </div>

        <div>
          <Label>{t("expertProfile.termsLabel")}</Label>
          <Textarea
            className="mt-1"
            rows={5}
            value={form.termsText ?? ""}
            onChange={(e) => setField("termsText", e.target.value)}
            placeholder={t("expertProfile.termsPlaceholder")}
          />
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {t("common.save")}
        </Button>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string | null; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1" value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ConfirmCheckbox({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <span>{label}</span>
    </label>
  );
}
