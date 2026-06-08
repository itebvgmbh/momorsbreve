import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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

async function downloadInvoicePdf(id: number, invoiceNumber: string, t: TFunction) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/invoices/${id}/pdf`, { headers });
  if (!res.ok) throw new Error(t("settings.invoiceLoadError"));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoiceNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function InvoicesSection() {
  const { t } = useTranslation();
  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 60_000,
  });
  const { toast } = useToast();

  const handleDownload = (id: number, invoiceNumber: string) => {
    downloadInvoicePdf(id, invoiceNumber, t).then(
      () => toast({ title: t("settings.downloadStarted"), description: `${invoiceNumber}.pdf` }),
      (err) => toast({ title: t("settings.errorTitle"), description: err.message, variant: "destructive" })
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
        {t("settings.invoicesEmpty")}
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
            <TableHead>{t("settings.colDate")}</TableHead>
            <TableHead>{t("settings.colInvoiceNo")}</TableHead>
            <TableHead>{t("settings.colDescription")}</TableHead>
            <TableHead className="text-right">{t("settings.colAmount")}</TableHead>
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
  const { t } = useTranslation();
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
      toast({ title: t("settings.savedTitle"), description: t("settings.savedDescription") });
    },
    onError: (err: Error) => {
      toast({ title: t("settings.errorTitle"), description: err.message, variant: "destructive" });
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
      toast({ title: t("settings.accountDeletedTitle"), description: t("settings.accountDeletedDescription") });
    },
    onError: (err: Error) => {
      toast({ title: t("settings.errorTitle"), description: err.message, variant: "destructive" });
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
        <h1 className="font-serif text-2xl font-bold mb-1">{t("settings.pageTitle")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("settings.pageSubtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.personalTitle")}</CardTitle>
          <CardDescription>{t("settings.personalDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t("settings.firstNameLabel")}</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => updateForm({ firstName: e.target.value })}
                placeholder={t("settings.firstNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t("settings.lastNameLabel")}</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => updateForm({ lastName: e.target.value })}
                placeholder={t("settings.lastNamePlaceholder")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("settings.emailLabel")}</Label>
            <Input id="email" value={user.email ?? ""} disabled className="bg-muted" />
          </div>
          <Button onClick={savePersonal} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("common.save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.addressTitle")}</CardTitle>
          <CardDescription>{t("settings.addressDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">{t("settings.streetLabel")}</Label>
            <Input
              id="street"
              value={form.street}
              onChange={(e) => updateForm({ street: e.target.value })}
              placeholder={t("settings.streetPlaceholder")}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">{t("settings.postalCodeLabel")}</Label>
              <Input
                id="postalCode"
                value={form.postalCode}
                onChange={(e) => updateForm({ postalCode: e.target.value })}
                placeholder={t("settings.postalCodePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{t("settings.cityLabel")}</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => updateForm({ city: e.target.value })}
                placeholder={t("settings.cityPlaceholder")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">{t("settings.countryLabel")}</Label>
            <Input
              id="country"
              value={form.country}
              onChange={(e) => updateForm({ country: e.target.value })}
              placeholder={t("settings.countryPlaceholder")}
            />
          </div>
          <Button onClick={saveAddress} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("common.save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.billingTitle")}</CardTitle>
          <CardDescription>{t("settings.billingDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="billingSame"
              checked={billingSameAsAddress}
              onCheckedChange={(checked) => setBillingSameAsAddress(!!checked)}
            />
            <Label htmlFor="billingSame" className="cursor-pointer">
              {t("settings.billingSameAsAddress")}
            </Label>
          </div>
          {!billingSameAsAddress && (
            <>
              <div className="space-y-2">
                <Label htmlFor="billingName">{t("settings.billingNameLabel")}</Label>
                <Input
                  id="billingName"
                  value={form.billingName}
                  onChange={(e) => updateForm({ billingName: e.target.value })}
                  placeholder={t("settings.billingNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingStreet">{t("settings.streetLabel")}</Label>
                <Input
                  id="billingStreet"
                  value={form.billingStreet}
                  onChange={(e) => updateForm({ billingStreet: e.target.value })}
                  placeholder={t("settings.streetPlaceholder")}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billingPostalCode">{t("settings.postalCodeLabel")}</Label>
                  <Input
                    id="billingPostalCode"
                    value={form.billingPostalCode}
                    onChange={(e) => updateForm({ billingPostalCode: e.target.value })}
                    placeholder={t("settings.postalCodePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billingCity">{t("settings.cityLabel")}</Label>
                  <Input
                    id="billingCity"
                    value={form.billingCity}
                    onChange={(e) => updateForm({ billingCity: e.target.value })}
                    placeholder={t("settings.cityPlaceholder")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingCountry">{t("settings.countryLabel")}</Label>
                <Input
                  id="billingCountry"
                  value={form.billingCountry}
                  onChange={(e) => updateForm({ billingCountry: e.target.value })}
                  placeholder={t("settings.countryPlaceholder")}
                />
              </div>
            </>
          )}
          <Button onClick={saveBilling} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("common.save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t("settings.newsletterTitle")}
          </CardTitle>
          <CardDescription>
            {t("settings.newsletterDescription")}
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
              {t("settings.newsletterOptIn")}
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {t("settings.invoicesTitle")}
          </CardTitle>
          <CardDescription>
            {t("settings.invoicesDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoicesSection />
        </CardContent>
      </Card>

      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">{t("settings.dangerZoneTitle")}</CardTitle>
          <CardDescription>
            {t("settings.dangerZoneDescription")}
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
            {t("settings.deleteAccountButton")}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.deleteDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.deleteDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteAccountMutation.mutate()}
            >
              {t("settings.deleteAccountButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
