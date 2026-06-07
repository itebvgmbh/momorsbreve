import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, Plus, Save } from "lucide-react";

interface ExpertAccount {
  id: number;
  email: string;
  isActive: boolean;
  companyName: string | null;
  legalName: string | null;
  contactName: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
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
  adminNotes: string | null;
}

function getMissingFields(expert: ExpertAccount): string[] {
  const missing: string[] = [];
  if (!expert.companyName && !expert.legalName) missing.push("Firma oder rechtlicher Name");
  if (!expert.street) missing.push("Straße");
  if (!expert.postalCode) missing.push("PLZ");
  if (!expert.city) missing.push("Ort");
  if (!expert.country) missing.push("Land");
  if (!expert.phone) missing.push("Telefon");
  if (!expert.invoiceEmail) missing.push("Rechnungs-E-Mail");
  if (!expert.businessType) missing.push("Anbieterart");
  if (!expert.actsAsBusinessConfirmed) missing.push("Unternehmerstatus");
  if (!expert.externalBillingConfirmed) missing.push("Externe Abrechnung");
  if (!expert.legalComplianceConfirmed) missing.push("Recht/Haftung");
  if (!expert.confidentialityConfirmed) missing.push("Vertraulichkeit");
  if (!expert.dataProtectionConfirmed) missing.push("Datenschutz");
  return missing;
}

export default function AdminExpertsPage() {
  const { toast } = useToast();
  const [newEmail, setNewEmail] = useState("");
  const { data: experts, isLoading } = useQuery<ExpertAccount[]>({
    queryKey: ["/api/admin/experts"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/experts", {
        email: newEmail.trim(),
        isActive: true,
      });
      return res.json();
    },
    onSuccess: () => {
      setNewEmail("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/experts"] });
      toast({ title: "Experte angelegt" });
    },
    onError: (error: Error) => toast({ title: "Fehler", description: error.message, variant: "destructive" }),
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Expertenaccounts</h1>
        <p className="text-sm text-muted-foreground">
          Aktive Experten werden über ihre Login-E-Mail erkannt und erhalten den Expertenbereich.
        </p>
      </div>

      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px]">
          <Label>Neue Experten-E-Mail</Label>
          <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="experte@example.de" />
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={!newEmail.trim() || createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Anlegen
        </Button>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !experts?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-2 opacity-60" />
          Noch keine Expertenaccounts.
        </Card>
      ) : (
        <div className="space-y-3">
          {experts.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExpertCard({ expert }: { expert: ExpertAccount }) {
  const { toast } = useToast();
  const [form, setForm] = useState(expert);
  const missingFields = getMissingFields(form);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/admin/experts/${expert.id}`, form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/experts"] });
      toast({ title: "Experte gespeichert" });
    },
    onError: (error: Error) => toast({ title: "Fehler", description: error.message, variant: "destructive" }),
  });

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">{expert.email}</p>
          <p className="text-sm text-muted-foreground">
            {expert.companyName || expert.contactName || "Noch kein Firmenprofil"}{expert.city ? ` · ${expert.city}` : ""}
          </p>
          <p className={`text-xs mt-1 ${missingFields.length === 0 ? "text-emerald-600" : "text-amber-600"}`}>
            {missingFields.length === 0 ? "Pflichtprofil vollständig" : `Fehlend: ${missingFields.join(", ")}`}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          Aktiv
          <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))} />
        </label>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label>E-Mail</Label>
          <Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
        </div>
        <div>
          <Label>Firma</Label>
          <Input value={form.companyName ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))} />
        </div>
        <div>
          <Label>Rechtlicher Name</Label>
          <Input value={form.legalName ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, legalName: e.target.value }))} />
        </div>
        <div>
          <Label>Ansprechpartner</Label>
          <Input value={form.contactName ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))} />
        </div>
        <div>
          <Label>Straße</Label>
          <Input value={form.street ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, street: e.target.value }))} />
        </div>
        <div>
          <Label>PLZ</Label>
          <Input value={form.postalCode ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))} />
        </div>
        <div>
          <Label>Ort</Label>
          <Input value={form.city ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} />
        </div>
        <div>
          <Label>Land</Label>
          <Input value={form.country ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))} />
        </div>
        <div>
          <Label>Telefon</Label>
          <Input value={form.phone ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
        </div>
        <div>
          <Label>Rechnungs-E-Mail</Label>
          <Input value={form.invoiceEmail ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, invoiceEmail: e.target.value }))} />
        </div>
        <div>
          <Label>Anbieterart</Label>
          <Input value={form.businessType ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, businessType: e.target.value }))} />
        </div>
        <div>
          <Label>Register / Kammer</Label>
          <Input value={form.tradeRegisterName ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, tradeRegisterName: e.target.value }))} />
        </div>
        <div>
          <Label>Registernummer</Label>
          <Input value={form.tradeRegisterNumber ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, tradeRegisterNumber: e.target.value }))} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2 text-sm">
        <ConfirmCheckbox checked={form.actsAsBusinessConfirmed} onCheckedChange={(v) => setForm((p) => ({ ...p, actsAsBusinessConfirmed: v }))} label="Unternehmerstatus bestätigt" />
        <ConfirmCheckbox checked={form.externalBillingConfirmed} onCheckedChange={(v) => setForm((p) => ({ ...p, externalBillingConfirmed: v }))} label="Externe Abrechnung bestätigt" />
        <ConfirmCheckbox checked={form.legalComplianceConfirmed} onCheckedChange={(v) => setForm((p) => ({ ...p, legalComplianceConfirmed: v }))} label="Recht/Haftung bestätigt" />
        <ConfirmCheckbox checked={form.confidentialityConfirmed} onCheckedChange={(v) => setForm((p) => ({ ...p, confidentialityConfirmed: v }))} label="Vertraulichkeit bestätigt" />
        <ConfirmCheckbox checked={form.dataProtectionConfirmed} onCheckedChange={(v) => setForm((p) => ({ ...p, dataProtectionConfirmed: v }))} label="Datenschutz bestätigt" />
        <ConfirmCheckbox checked={form.liabilityInsuranceConfirmed} onCheckedChange={(v) => setForm((p) => ({ ...p, liabilityInsuranceConfirmed: v }))} label="Haftpflicht vorhanden (optional)" />
      </div>
      <div>
        <Label>Adminnotiz</Label>
        <Textarea
          className="mt-1"
          value={form.adminNotes ?? ""}
          onChange={(e) => setForm((prev) => ({ ...prev, adminNotes: e.target.value }))}
          rows={3}
        />
      </div>
      <Button size="sm" variant="outline" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Speichern
      </Button>
    </Card>
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
    <label className="flex items-start gap-2">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <span>{label}</span>
    </label>
  );
}
