import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, FileDown, Receipt, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getAuthHeaders } from "@/lib/queryClient";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/models/auth";

type Invoice = {
  id: number;
  invoiceNumber: string;
  type: string;
  grossAmountEur: number;
  description: string;
  createdAt: string;
  pdfPath: string | null;
};

type ProfilePayload = Partial<{
  firstName: string;
  lastName: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  billingName: string;
  billingStreet: string;
  billingPostalCode: string;
  billingCity: string;
  billingCountry: string;
  newsletterOptIn: boolean;
}>;

async function downloadInvoicePdf(id: number, invoiceNumber: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/invoices/${id}/pdf`, { headers });
  if (!res.ok) throw new Error("Rechnung konnte nicht geladen werden.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoiceNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function InvoicesSection() {
  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 60_000,
  });
  const { toast } = useToast();

  const handleDownload = (id: number, invoiceNumber: string) => {
    downloadInvoicePdf(id, invoiceNumber).then(
      () => toast({ title: "Download gestartet", description: `${invoiceNumber}.pdf` }),
      (err) => toast({ title: "Fehler", description: err.message, variant: "destructive" })
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoices?.length) {
    return (
      <p className="text-muted-foreground text-sm py-4">
        Noch keine Rechnungen vorhanden. Rechnungen werden automatisch bei Seiten-Käufen und
        Spezialistenaufträgen erstellt.
      </p>
    );
  }

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  const formatEur = (cents: number) =>
    (cents / 100).toFixed(2).replace(".", ",") + " €";

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead>Datum</TableHead>
            <TableHead>Rechnungsnr.</TableHead>
            <TableHead>Beschreibung</TableHead>
            <TableHead className="text-right">Betrag</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="text-muted-foreground">{formatDate(inv.createdAt)}</TableCell>
              <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
              <TableCell className="max-w-[200px] truncate">{inv.description}</TableCell>
              <TableCell className="text-right">{formatEur(inv.grossAmountEur)}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(inv.id, inv.invoiceNumber)}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function syncUserToForm(user: User | null) {
  if (!user) return null;
  const u = user as User & {
    street?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    billingName?: string | null;
    billingStreet?: string | null;
    billingPostalCode?: string | null;
    billingCity?: string | null;
    billingCountry?: string | null;
  };
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    street: u.street ?? "",
    postalCode: u.postalCode ?? "",
    city: u.city ?? "",
    country: u.country ?? "",
    billingName: u.billingName ?? "",
    billingStreet: u.billingStreet ?? "",
    billingPostalCode: u.billingPostalCode ?? "",
    billingCity: u.billingCity ?? "",
    billingCountry: u.billingCountry ?? "",
  };
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [form, setForm] = useState<ReturnType<typeof syncUserToForm>>(null);
  const [billingSameAsAddress, setBillingSameAsAddress] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const next = syncUserToForm(user);
    setForm(next);
    if (next) {
      const hasBilling =
        next.billingStreet ||
        next.billingPostalCode ||
        next.billingCity ||
        next.billingCountry ||
        next.billingName;
      setBillingSameAsAddress(!hasBilling && !!(next.street || next.postalCode || next.city || next.country));
    }
  }, [user]);

  const updateForm = (updates: Partial<NonNullable<typeof form>>) => {
    setForm((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const profileMutation = useMutation({
    mutationFn: async (payload: ProfilePayload) => {
      const res = await apiRequest("PATCH", "/api/user/profile", payload);
      return res.json() as Promise<User>;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["/api/auth/user"], updated);
      toast({ title: "Gespeichert", description: "Ihre Angaben wurden aktualisiert." });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/user/account");
    },
    onSuccess: () => {
      setDeleteDialogOpen(false);
      logout();
      navigate("/");
      toast({ title: "Konto gelöscht", description: "Ihr Konto wurde unwiderruflich gelöscht." });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  if (!user) return null;
  if (!form) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const savePersonal = () => {
    profileMutation.mutate({ firstName: form.firstName, lastName: form.lastName });
  };

  const saveAddress = () => {
    profileMutation.mutate({
      street: form.street,
      postalCode: form.postalCode,
      city: form.city,
      country: form.country,
    });
  };

  const saveBilling = () => {
    if (billingSameAsAddress) {
      profileMutation.mutate({
        billingName: form.firstName || form.lastName ? `${form.firstName} ${form.lastName}`.trim() : undefined,
        billingStreet: form.street,
        billingPostalCode: form.postalCode,
        billingCity: form.city,
        billingCountry: form.country,
      });
    } else {
      profileMutation.mutate({
        billingName: form.billingName,
        billingStreet: form.billingStreet,
        billingPostalCode: form.billingPostalCode,
        billingCity: form.billingCity,
        billingCountry: form.billingCountry,
      });
    }
  };

  const isPending = profileMutation.isPending;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold mb-1">Einstellungen</h1>
        <p className="text-muted-foreground text-sm">
          Verwalten Sie Ihre persönlichen Daten, Adresse und Rechnungsanschrift.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Persönliche Daten</CardTitle>
          <CardDescription>Name und E-Mail (E-Mail wird über Ihr Konto verwaltet)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Vorname</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => updateForm({ firstName: e.target.value })}
                placeholder="Vorname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nachname</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => updateForm({ lastName: e.target.value })}
                placeholder="Nachname"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" value={user.email ?? ""} disabled className="bg-muted" />
          </div>
          <Button onClick={savePersonal} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Speichern
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adresse</CardTitle>
          <CardDescription>Ihre Anschrift</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Straße und Hausnummer</Label>
            <Input
              id="street"
              value={form.street}
              onChange={(e) => updateForm({ street: e.target.value })}
              placeholder="Musterstraße 1"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">PLZ</Label>
              <Input
                id="postalCode"
                value={form.postalCode}
                onChange={(e) => updateForm({ postalCode: e.target.value })}
                placeholder="12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ort</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => updateForm({ city: e.target.value })}
                placeholder="Berlin"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Land</Label>
            <Input
              id="country"
              value={form.country}
              onChange={(e) => updateForm({ country: e.target.value })}
              placeholder="Deutschland"
            />
          </div>
          <Button onClick={saveAddress} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Speichern
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rechnungsanschrift</CardTitle>
          <CardDescription>Für Rechnungen und Abrechnungen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="billingSame"
              checked={billingSameAsAddress}
              onCheckedChange={(checked) => setBillingSameAsAddress(!!checked)}
            />
            <Label htmlFor="billingSame" className="cursor-pointer">
              Gleich wie Adresse
            </Label>
          </div>
          {!billingSameAsAddress && (
            <>
              <div className="space-y-2">
                <Label htmlFor="billingName">Firma / Name</Label>
                <Input
                  id="billingName"
                  value={form.billingName}
                  onChange={(e) => updateForm({ billingName: e.target.value })}
                  placeholder="Firma oder Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingStreet">Straße und Hausnummer</Label>
                <Input
                  id="billingStreet"
                  value={form.billingStreet}
                  onChange={(e) => updateForm({ billingStreet: e.target.value })}
                  placeholder="Musterstraße 1"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billingPostalCode">PLZ</Label>
                  <Input
                    id="billingPostalCode"
                    value={form.billingPostalCode}
                    onChange={(e) => updateForm({ billingPostalCode: e.target.value })}
                    placeholder="12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billingCity">Ort</Label>
                  <Input
                    id="billingCity"
                    value={form.billingCity}
                    onChange={(e) => updateForm({ billingCity: e.target.value })}
                    placeholder="Berlin"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingCountry">Land</Label>
                <Input
                  id="billingCountry"
                  value={form.billingCountry}
                  onChange={(e) => updateForm({ billingCountry: e.target.value })}
                  placeholder="Deutschland"
                />
              </div>
            </>
          )}
          <Button onClick={saveBilling} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Speichern
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Newsletter
          </CardTitle>
          <CardDescription>
            Erhalten Sie Tipps und Neuigkeiten rund um historische Handschriften.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="newsletterOptIn"
              checked={user.newsletterOptIn ?? true}
              onCheckedChange={(checked) => {
                profileMutation.mutate({ newsletterOptIn: checked === true });
              }}
            />
            <Label htmlFor="newsletterOptIn" className="cursor-pointer">
              Ich möchte den Newsletter erhalten
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Rechnungen & Zahlungen
          </CardTitle>
          <CardDescription>
            Ihre Rechnungen und getätigten Zahlungen. Rechnungen können Sie als PDF herunterladen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoicesSection />
        </CardContent>
      </Card>

      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Gefahrenzone</CardTitle>
          <CardDescription>
            Wenn Sie Ihr Konto löschen, werden alle Ihre Daten unwiderruflich gelöscht: Transkriptionen,
            hochgeladene Dokumente, Support-Nachrichten und Zahlungsinformationen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteAccountMutation.isPending}
          >
            {deleteAccountMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Konto löschen
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konto wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Ihre Transkriptionen, Uploads und
              zugehörigen Daten werden dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteAccountMutation.mutate()}
            >
              Konto löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
