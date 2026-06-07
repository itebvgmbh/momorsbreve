import { useEffect, useState } from "react";
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
      toast({ title: "Profil gespeichert" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
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
        <Card className="p-8 text-center text-muted-foreground">Kein aktives Expertenkonto.</Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate("/app/expert")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Zurück
      </Button>

      <Card className="p-5 space-y-4">
        <div>
          <h1 className="font-serif text-xl font-bold">Firmenprofil</h1>
          <p className="text-sm text-muted-foreground">
            Diese Daten werden Kunden beim Angebot als Vertragspartner angezeigt.
          </p>
        </div>

        <Card className={`p-3 ${data?.canQuote ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20" : "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20"}`}>
          <p className="text-sm font-medium">
            {data?.canQuote ? "Profil vollständig" : "Profil noch unvollständig"}
          </p>
          {!data?.canQuote && (
            <p className="text-xs text-muted-foreground mt-1">
              Fehlend: {(data?.missingFields ?? []).join(", ")}
            </p>
          )}
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Firma" value={form.companyName} onChange={(v) => setField("companyName", v)} />
          <Field label="Rechtlicher Name" value={form.legalName} onChange={(v) => setField("legalName", v)} />
          <Field label="Ansprechpartner" value={form.contactName} onChange={(v) => setField("contactName", v)} />
          <Field label="Rechnungs-E-Mail" value={form.invoiceEmail} onChange={(v) => setField("invoiceEmail", v)} />
          <Field label="Straße" value={form.street} onChange={(v) => setField("street", v)} />
          <Field label="PLZ" value={form.postalCode} onChange={(v) => setField("postalCode", v)} />
          <Field label="Ort" value={form.city} onChange={(v) => setField("city", v)} />
          <Field label="Land" value={form.country} onChange={(v) => setField("country", v)} />
          <Field label="USt-IdNr." value={form.vatId} onChange={(v) => setField("vatId", v)} />
          <Field label="Steuernummer" value={form.taxNumber} onChange={(v) => setField("taxNumber", v)} />
          <Field label="Website" value={form.website} onChange={(v) => setField("website", v)} />
          <Field label="Telefon" value={form.phone} onChange={(v) => setField("phone", v)} />
          <Field label="Anbieterart" value={form.businessType} onChange={(v) => setField("businessType", v)} placeholder="z. B. Einzelunternehmen, GmbH, Freiberufler" />
          <Field label="Register / Kammer" value={form.tradeRegisterName} onChange={(v) => setField("tradeRegisterName", v)} />
          <Field label="Registernummer" value={form.tradeRegisterNumber} onChange={(v) => setField("tradeRegisterNumber", v)} />
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <h2 className="text-sm font-medium">Rechtliche Bestätigungen</h2>
          <ConfirmCheckbox
            checked={form.actsAsBusinessConfirmed}
            onCheckedChange={(checked) => setBooleanField("actsAsBusinessConfirmed", checked)}
            label="Ich handle als Unternehmer bzw. selbstständiger Anbieter."
          />
          <ConfirmCheckbox
            checked={form.externalBillingConfirmed}
            onCheckedChange={(checked) => setBooleanField("externalBillingConfirmed", checked)}
            label="Ich stelle Rechnung und wickle Zahlung direkt mit dem Kunden ab."
          />
          <ConfirmCheckbox
            checked={form.legalComplianceConfirmed}
            onCheckedChange={(checked) => setBooleanField("legalComplianceConfirmed", checked)}
            label="Ich hafte für mein Angebot und meine Leistung und halte geltendes Recht ein."
          />
          <ConfirmCheckbox
            checked={form.confidentialityConfirmed}
            onCheckedChange={(checked) => setBooleanField("confidentialityConfirmed", checked)}
            label="Ich behandle Kundendaten und Dokumente vertraulich."
          />
          <ConfirmCheckbox
            checked={form.dataProtectionConfirmed}
            onCheckedChange={(checked) => setBooleanField("dataProtectionConfirmed", checked)}
            label="Ich verarbeite Kundendaten DSGVO-konform und nur zur Angebotsprüfung bzw. Leistungserbringung."
          />
          <ConfirmCheckbox
            checked={form.liabilityInsuranceConfirmed}
            onCheckedChange={(checked) => setBooleanField("liabilityInsuranceConfirmed", checked)}
            label="Optional: Ich verfüge über eine passende berufliche Haftpflichtversicherung."
          />
        </div>

        <div>
          <Label>Eigene Hinweise / Bedingungen</Label>
          <Textarea
            className="mt-1"
            rows={5}
            value={form.termsText ?? ""}
            onChange={(e) => setField("termsText", e.target.value)}
            placeholder="Zahlungsziel, Rechnungsstellung, besondere Bedingungen ..."
          />
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Speichern
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
