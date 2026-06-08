import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Mail,
  Plus,
  Send,
  TestTube2,
  Trash2,
  Pencil,
  Eye,
  Zap,
  PlayCircle,
  AlertTriangle,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  preheader: string | null;
  htmlBody: string;
  textBody: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SegmentFilter {
  hasPurchased?: boolean;
  registeredAfter?: string | null;
  registeredBefore?: string | null;
  registeredAtLeastDaysAgo?: number | null;
  registeredAtMostDaysAgo?: number | null;
}

interface EmailCampaign {
  id: number;
  name: string;
  templateId: number;
  segmentFilter: SegmentFilter;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  scheduledAt: string | null;
  startedAt: string | null;
  sentAt: string | null;
  stats: {
    totalRecipients?: number;
    sent?: number;
    failed?: number;
    skippedCooldown?: number;
  } | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

type FlowTriggerType =
  | "registration"
  | "first_purchase"
  | "no_purchase_after_days"
  | "credits_low"
  | "inactive_since_days";

interface FlowStep {
  id: number;
  flowId: number;
  stepOrder: number;
  delayHours: number;
  templateId: number;
  createdAt: string;
}

interface EmailFlow {
  id: number;
  name: string;
  description: string | null;
  triggerType: FlowTriggerType;
  triggerConfig: { days?: number; threshold?: number } | null;
  enabled: boolean;
  steps: FlowStep[];
  createdAt: string;
  updatedAt: string;
}

interface EmailSend {
  id: number;
  userId: string | null;
  toEmail: string;
  templateId: number | null;
  campaignId: number | null;
  flowId: number | null;
  flowStepId: number | null;
  kind: string;
  status: string;
  subject: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface ResendBroadcastResult {
  id: string;
  segmentId: string;
  subject: string;
  send: boolean;
  scheduledAt: string | null;
}

function triggerLabels(t: TFunction): Record<FlowTriggerType, string> {
  return {
    registration: t("adminMarketing.triggerRegistration"),
    first_purchase: t("adminMarketing.triggerFirstPurchase"),
    no_purchase_after_days: t("adminMarketing.triggerNoPurchaseAfterDays"),
    credits_low: t("adminMarketing.triggerCreditsLow"),
    inactive_since_days: t("adminMarketing.triggerInactiveSinceDays"),
  };
}

const DEFAULT_TEMPLATE_BODY = `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0ebe3;font-family:Helvetica,Arial,sans-serif;color:#2a1f14;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f0ebe3;">
    <tr><td align="center" style="padding:48px 20px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #d9d0c3;border-radius:4px;">
        <tr><td style="height:3px;background:#b8860b;border-radius:4px 4px 0 0;">&nbsp;</td></tr>
        <tr><td style="padding:40px 48px;">
          <h1 style="margin:0 0 16px;font-size:24px;color:#2a1f14;">Hallo {{firstName}},</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#594a3a;">
            hier kommt dein E-Mail-Text. Du kannst Platzhalter wie
            <code>{{firstName}}</code>, <code>{{email}}</code>, <code>{{credits}}</code>
            und <code>{{appUrl}}</code> verwenden.
          </p>
          <p style="margin:24px 0;text-align:center;">
            <a href="{{appUrl}}/app/pricing" style="display:inline-block;padding:14px 36px;background:#2a1f14;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Jetzt entdecken</a>
          </p>
          <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#9a8c7a;">
            Viele Grüße<br>Ihr MormorsBreve-Team
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

function statusBadge(status: EmailCampaign["status"], t: TFunction) {
  const map: Record<EmailCampaign["status"], { label: string; variant: any }> = {
    draft: { label: t("adminMarketing.statusDraft"), variant: "secondary" },
    scheduled: { label: t("adminMarketing.statusScheduled"), variant: "outline" },
    sending: { label: t("adminMarketing.statusSending"), variant: "default" },
    sent: { label: t("adminMarketing.statusSent"), variant: "default" },
    failed: { label: t("adminMarketing.statusFailed"), variant: "destructive" },
  };
  const m = map[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function sendStatusBadge(s: string, t: TFunction) {
  if (s === "sent" || s === "delivered") return <Badge>{t("adminMarketing.sendStatusSent")}</Badge>;
  if (s === "opened" || s === "clicked") return <Badge>{s}</Badge>;
  if (s === "skipped") return <Badge variant="outline">{t("adminMarketing.sendStatusSkipped")}</Badge>;
  if (s === "failed" || s === "bounced")
    return <Badge variant="destructive">{s}</Badge>;
  return <Badge variant="secondary">{s}</Badge>;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AdminMarketingPage() {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center gap-3 mb-6">
        <Mail className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t("adminMarketing.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("adminMarketing.pageSubtitle")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList>
          <TabsTrigger value="templates">{t("adminMarketing.tabTemplates")}</TabsTrigger>
          <TabsTrigger value="campaigns">{t("adminMarketing.tabCampaigns")}</TabsTrigger>
          <TabsTrigger value="flows">{t("adminMarketing.tabFlows")}</TabsTrigger>
          <TabsTrigger value="log">{t("adminMarketing.tabLog")}</TabsTrigger>
        </TabsList>
        <TabsContent value="templates" className="mt-6">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-6">
          <CampaignsTab />
        </TabsContent>
        <TabsContent value="flows" className="mt-6">
          <FlowsTab />
        </TabsContent>
        <TabsContent value="log" className="mt-6">
          <LogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Templates Tab ─────────────────────────────────────────────────────────

function TemplatesTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [previewTpl, setPreviewTpl] = useState<EmailTemplate | null>(null);

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/marketing/templates"],
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        "DELETE",
        `/api/admin/marketing/templates/${id}`,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing/templates"] });
      toast({ title: t("adminMarketing.toastTemplateDeleted") });
    },
    onError: (err: any) =>
      toast({ variant: "destructive", title: t("adminMarketing.toastDeleteFailed"), description: err?.message }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("adminMarketing.placeholdersLabel")} <code className="text-xs">{`{{firstName}} {{email}} {{credits}} {{appUrl}} {{unsubscribeUrl}}`}</code>
        </p>
        <Button onClick={() => setEditing({
          id: 0,
          name: "",
          subject: "",
          preheader: "",
          htmlBody: DEFAULT_TEMPLATE_BODY,
          textBody: "",
          createdAt: "",
          updatedAt: "",
        })}>
          <Plus className="h-4 w-4 mr-2" /> {t("adminMarketing.newTemplate")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="inline h-5 w-5 animate-spin mr-2" /> {t("common.loading")}
            </div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t("adminMarketing.templatesEmpty")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("adminMarketing.colName")}</TableHead>
                  <TableHead>{t("adminMarketing.colSubject")}</TableHead>
                  <TableHead>{t("adminMarketing.colUpdated")}</TableHead>
                  <TableHead className="text-right">{t("adminMarketing.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell className="font-medium">{tpl.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tpl.subject}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(tpl.updatedAt).toLocaleString("de-DE")}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => setPreviewTpl(tpl)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(tpl)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(t("adminMarketing.confirmDeleteTemplate", { name: tpl.name }))) {
                            deleteMut.mutate(tpl.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && (
        <TemplateEditor
          template={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {previewTpl && (
        <TemplatePreview
          template={previewTpl}
          onClose={() => setPreviewTpl(null)}
        />
      )}
    </div>
  );
}

function TemplateEditor({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isNew = template.id === 0;
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject);
  const [preheader, setPreheader] = useState(template.preheader ?? "");
  const [htmlBody, setHtmlBody] = useState(template.htmlBody);
  const [textBody, setTextBody] = useState(template.textBody ?? "");
  const [testEmail, setTestEmail] = useState("");

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = {
        name,
        subject,
        preheader: preheader || null,
        htmlBody,
        textBody: textBody || null,
      };
      const url = isNew
        ? "/api/admin/marketing/templates"
        : `/api/admin/marketing/templates/${template.id}`;
      const res = await apiRequest(isNew ? "POST" : "PUT", url, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing/templates"] });
      toast({ title: isNew ? t("adminMarketing.toastTemplateCreated") : t("adminMarketing.toastTemplateSaved") });
      onClose();
    },
    onError: (err: any) =>
      toast({ variant: "destructive", title: t("adminMarketing.toastSaveFailed"), description: err?.message }),
  });

  const testMut = useMutation({
    mutationFn: async () => {
      if (!template.id) throw new Error(t("adminMarketing.errorSaveFirst"));
      const res = await apiRequest(
        "POST",
        `/api/admin/marketing/templates/${template.id}/test`,
        { to: testEmail },
      );
      return res.json();
    },
    onSuccess: () =>
      toast({ title: t("adminMarketing.toastTestmailSent"), description: t("adminMarketing.toastTestmailSentTo", { email: testEmail }) }),
    onError: (err: any) =>
      toast({ variant: "destructive", title: t("adminMarketing.toastTestSendFailed"), description: err?.message }),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? t("adminMarketing.newTemplate") : t("adminMarketing.editTemplateTitle", { name: template.name })}</DialogTitle>
          <DialogDescription>
            {t("adminMarketing.templateEditorDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>{t("adminMarketing.labelNameInternal")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("adminMarketing.placeholderTemplateName")} />
            </div>
            <div>
              <Label>{t("adminMarketing.labelPreheader")}</Label>
              <Input value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder={t("adminMarketing.placeholderPreheader")} />
            </div>
          </div>
          <div>
            <Label>{t("adminMarketing.labelSubject")}</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("adminMarketing.placeholderSubject")} />
          </div>
          <div>
            <Label>{t("adminMarketing.labelHtmlBody")}</Label>
            <Textarea
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              rows={16}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label>{t("adminMarketing.labelTextFallback")}</Label>
            <Textarea
              value={textBody}
              onChange={(e) => setTextBody(e.target.value)}
              rows={4}
              placeholder={t("adminMarketing.placeholderTextFallback")}
            />
          </div>

          {!isNew && (
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <Label className="flex items-center gap-2 mb-2">
                  <TestTube2 className="h-4 w-4" /> {t("adminMarketing.testmailLabel")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    type="email"
                  />
                  <Button
                    onClick={() => testMut.mutate()}
                    disabled={!testEmail || testMut.isPending}
                    variant="secondary"
                  >
                    {testMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="ml-2">{t("adminMarketing.send")}</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("adminMarketing.testmailHint")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={!name || !subject || !htmlBody || saveMut.isPending}
          >
            {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplatePreview({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
  const { t } = useTranslation();
  const { data: preview } = useQuery<{ subject: string; html: string; text: string }>({
    queryKey: [`/api/admin/marketing/templates/${template.id}/preview-q`],
    queryFn: async () => {
      const res = await apiRequest("POST", `/api/admin/marketing/templates/${template.id}/preview`, {});
      return res.json();
    },
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("adminMarketing.previewTitle", { name: template.name })}</DialogTitle>
          <DialogDescription>{preview?.subject}</DialogDescription>
        </DialogHeader>
        {preview ? (
          <iframe
            srcDoc={preview.html}
            className="w-full flex-1 border rounded"
            style={{ minHeight: "500px" }}
            title="preview"
          />
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="inline h-5 w-5 animate-spin mr-2" /> {t("common.loading")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Segment-Filter-UI (wiederverwendbar) ──────────────────────────────────

function SegmentFilterEditor({
  value,
  onChange,
}: {
  value: SegmentFilter;
  onChange: (v: SegmentFilter) => void;
}) {
  const { t } = useTranslation();
  const { data: preview } = useQuery<{ count: number; sample: { email: string; firstName: string | null }[] }>({
    queryKey: ["/api/admin/marketing/segments/preview", JSON.stringify(value)],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/admin/marketing/segments/preview", value);
      return res.json();
    },
  });

  const purchaseValue =
    value.hasPurchased === true ? "yes" : value.hasPurchased === false ? "no" : "any";

  return (
    <div className="space-y-3 p-4 border rounded-md bg-muted/20">
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <Label>{t("adminMarketing.purchaseStatus")}</Label>
          <Select
            value={purchaseValue}
            onValueChange={(v) =>
              onChange({
                ...value,
                hasPurchased: v === "yes" ? true : v === "no" ? false : undefined,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t("adminMarketing.purchaseAny")}</SelectItem>
              <SelectItem value="yes">{t("adminMarketing.purchaseYes")}</SelectItem>
              <SelectItem value="no">{t("adminMarketing.purchaseNo")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("adminMarketing.registeredFrom")}</Label>
          <Input
            type="date"
            value={value.registeredAfter ? value.registeredAfter.slice(0, 10) : ""}
            onChange={(e) =>
              onChange({
                ...value,
                registeredAfter: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              })
            }
          />
        </div>
        <div>
          <Label>{t("adminMarketing.registeredUntil")}</Label>
          <Input
            type="date"
            value={value.registeredBefore ? value.registeredBefore.slice(0, 10) : ""}
            onChange={(e) =>
              onChange({
                ...value,
                registeredBefore: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              })
            }
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label>{t("adminMarketing.registeredAtLeastDays")}</Label>
          <Input
            type="number"
            min={0}
            value={value.registeredAtLeastDaysAgo ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                registeredAtLeastDaysAgo: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
        <div>
          <Label>{t("adminMarketing.registeredAtMostDays")}</Label>
          <Input
            type="number"
            min={0}
            value={value.registeredAtMostDaysAgo ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                registeredAtMostDaysAgo: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <div>
          <span className="text-sm font-medium">
            {t("adminMarketing.usersInSegment", { n: preview?.count ?? "…" })}
          </span>
          <p className="text-xs text-muted-foreground">
            {t("adminMarketing.segmentOptInHint")}
          </p>
        </div>
        {preview && preview.sample.length > 0 && (
          <div className="text-xs text-muted-foreground text-right">
            {t("adminMarketing.sampleLabel")} {preview.sample.map((s) => s.email).slice(0, 3).join(", ")}
            {preview.count > 3 ? " …" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Campaigns Tab ─────────────────────────────────────────────────────────

function CampaignsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [editing, setEditing] = useState<EmailCampaign | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery<EmailCampaign[]>({
    queryKey: ["/api/admin/marketing/campaigns"],
    refetchInterval: 10_000,
  });

  const sendMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/marketing/campaigns/${id}/send`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing/campaigns"] });
      toast({ title: t("adminMarketing.toastSendStarted") });
    },
    onError: (err: any) =>
      toast({ variant: "destructive", title: t("adminMarketing.toastSendFailed"), description: err?.message }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/marketing/campaigns/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing/campaigns"] });
      toast({ title: t("adminMarketing.toastCampaignDeleted") });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setBroadcastOpen(true)}>
          <Mail className="h-4 w-4 mr-2" /> {t("adminMarketing.resendBroadcast")}
        </Button>
        <Button onClick={() => setEditing({
          id: 0,
          name: "",
          templateId: 0,
          segmentFilter: { hasPurchased: false },
          status: "draft",
          scheduledAt: null,
          startedAt: null,
          sentAt: null,
          stats: null,
          errorMessage: null,
          createdAt: "",
          updatedAt: "",
        })}>
          <Plus className="h-4 w-4 mr-2" /> {t("adminMarketing.newCampaign")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="inline h-5 w-5 animate-spin mr-2" /> {t("common.loading")}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t("adminMarketing.campaignsEmpty")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("adminMarketing.colName")}</TableHead>
                  <TableHead>{t("adminMarketing.colStatus")}</TableHead>
                  <TableHead>{t("adminMarketing.colRecipientsSent")}</TableHead>
                  <TableHead>{t("adminMarketing.colUpdated")}</TableHead>
                  <TableHead className="text-right">{t("adminMarketing.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{statusBadge(c.status, t)}</TableCell>
                    <TableCell className="text-sm">
                      {c.stats ? (
                        <>
                          {t("adminMarketing.statsSent", { sent: c.stats.sent ?? 0, total: c.stats.totalRecipients ?? 0 })}
                          {c.stats.skippedCooldown ? t("adminMarketing.statsSkipped", { count: c.stats.skippedCooldown }) : ""}
                          {c.stats.failed ? t("adminMarketing.statsFailed", { count: c.stats.failed }) : ""}
                        </>
                      ) : (
                        "–"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.updatedAt).toLocaleString("de-DE")}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {c.status === "draft" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (confirm(t("adminMarketing.confirmSendCampaign", { name: c.name }))) {
                              sendMut.mutate(c.id);
                            }
                          }}
                          disabled={sendMut.isPending}
                        >
                          <Send className="h-4 w-4 mr-1" /> {t("adminMarketing.send")}
                        </Button>
                      )}
                      {c.status === "draft" && (
                        <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(t("adminMarketing.confirmDeleteCampaign"))) deleteMut.mutate(c.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && <CampaignEditor campaign={editing} onClose={() => setEditing(null)} />}
      {broadcastOpen && <ResendBroadcastDialog onClose={() => setBroadcastOpen(false)} />}
    </div>
  );
}

function CampaignEditor({ campaign, onClose }: { campaign: EmailCampaign; onClose: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isNew = campaign.id === 0;
  const [name, setName] = useState(campaign.name);
  const [templateId, setTemplateId] = useState<number>(campaign.templateId);
  const [filter, setFilter] = useState<SegmentFilter>(campaign.segmentFilter);

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/marketing/templates"],
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = { name, templateId, segmentFilter: filter };
      const url = isNew
        ? "/api/admin/marketing/campaigns"
        : `/api/admin/marketing/campaigns/${campaign.id}`;
      const res = await apiRequest(isNew ? "POST" : "PUT", url, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing/campaigns"] });
      toast({ title: isNew ? t("adminMarketing.toastCampaignCreated") : t("adminMarketing.toastCampaignSaved") });
      onClose();
    },
    onError: (err: any) =>
      toast({ variant: "destructive", title: t("adminMarketing.toastSaveFailed"), description: err?.message }),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? t("adminMarketing.newCampaign") : t("adminMarketing.editCampaignTitle", { name: campaign.name })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t("adminMarketing.labelNameInternal")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("adminMarketing.placeholderCampaignName")} />
          </div>
          <div>
            <Label>{t("adminMarketing.labelTemplate")}</Label>
            <Select value={String(templateId)} onValueChange={(v) => setTemplateId(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder={t("adminMarketing.selectTemplate")} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={String(tpl.id)}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">{t("adminMarketing.targetGroup")}</Label>
            <SegmentFilterEditor value={filter} onChange={setFilter} />
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-500/10 text-amber-900 dark:text-amber-200 rounded-md text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              {t("adminMarketing.campaignSendWarning")}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={!name || !templateId || saveMut.isPending}
          >
            {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResendBroadcastDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState<number>(0);
  const [segmentId, setSegmentId] = useState("");
  const [name, setName] = useState("");
  const [sendNow, setSendNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");
  const [lastResult, setLastResult] = useState<ResendBroadcastResult | null>(null);

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/marketing/templates"],
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/marketing/resend-broadcasts", {
        templateId,
        segmentId: segmentId.trim() || undefined,
        name: name.trim() || undefined,
        send: sendNow,
        scheduledAt: scheduledAt.trim() || undefined,
      });
      return (await res.json()) as ResendBroadcastResult;
    },
    onSuccess: (data) => {
      setLastResult(data);
      toast({
        title: data.send ? t("adminMarketing.toastBroadcastStarted") : t("adminMarketing.toastBroadcastCreated"),
        description: t("adminMarketing.broadcastIdLabel", { id: data.id }),
      });
    },
    onError: (err: any) =>
      toast({
        variant: "destructive",
        title: t("adminMarketing.toastBroadcastFailed"),
        description: err?.message,
      }),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("adminMarketing.broadcastDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("adminMarketing.broadcastDialogDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t("adminMarketing.labelTemplate")}</Label>
            <Select value={templateId ? String(templateId) : ""} onValueChange={(v) => setTemplateId(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder={t("adminMarketing.selectTemplate")} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={String(tpl.id)}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="broadcast-segment">{t("adminMarketing.labelSegmentId")}</Label>
            <Input
              id="broadcast-segment"
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              placeholder="z. B. 78261eea-8f8b-4381-83c6-79fa7120f1cf"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("adminMarketing.segmentIdHint")}
            </p>
          </div>

          <div>
            <Label htmlFor="broadcast-name">{t("adminMarketing.labelNameInResend")}</Label>
            <Input
              id="broadcast-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("adminMarketing.placeholderResendName")}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div>
              <Label htmlFor="broadcast-send-now">{t("adminMarketing.labelSendNow")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("adminMarketing.sendNowHint")}
              </p>
            </div>
            <Switch id="broadcast-send-now" checked={sendNow} onCheckedChange={setSendNow} />
          </div>

          {sendNow && (
            <div>
              <Label htmlFor="broadcast-schedule">{t("adminMarketing.labelScheduledTime")}</Label>
              <Input
                id="broadcast-schedule"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                placeholder={t("adminMarketing.placeholderScheduledTime")}
              />
            </div>
          )}

          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
            {t("adminMarketing.placeholderMappingPrefix")} <code>{`{{firstName}}`}</code> → <code>{`{{{contact.first_name|}}}`}</code>, <code>{`{{email}}`}</code> → <code>{`{{{contact.email}}}`}</code> {t("adminMarketing.placeholderMappingAnd")} <code>{`{{unsubscribeUrl}}`}</code> → <code>{`{{{RESEND_UNSUBSCRIBE_URL}}}`}</code>.
          </div>

          {lastResult && (
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">{t("adminMarketing.broadcastCreatedTitle")}</div>
              <div className="text-muted-foreground">
                {t("adminMarketing.broadcastResultLine", { id: lastResult.id, segment: lastResult.segmentId, subject: lastResult.subject })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createMut.isPending}>
            {t("common.close")}
          </Button>
          <Button
            onClick={() => createMut.mutate()}
            disabled={!templateId || createMut.isPending}
          >
            {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {sendNow ? t("adminMarketing.sendAsBroadcast") : t("adminMarketing.createBroadcastDraft")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Flows Tab ─────────────────────────────────────────────────────────────

function FlowsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [editing, setEditing] = useState<EmailFlow | null>(null);
  const TRIGGER_LABELS = triggerLabels(t);

  const { data: flows = [], isLoading } = useQuery<EmailFlow[]>({
    queryKey: ["/api/admin/marketing/flows"],
  });

  const toggleMut = useMutation({
    mutationFn: async ({ flow, enabled }: { flow: EmailFlow; enabled: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/marketing/flows/${flow.id}`, {
        name: flow.name,
        description: flow.description,
        triggerType: flow.triggerType,
        triggerConfig: flow.triggerConfig,
        enabled,
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing/flows"] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/marketing/flows/${id}`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing/flows"] }),
  });

  const runNowMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/marketing/flows/run-now");
      return res.json();
    },
    onSuccess: () =>
      toast({ title: t("adminMarketing.toastSchedulerStarted"), description: t("adminMarketing.toastSchedulerStartedDesc") }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("adminMarketing.flowsHint")}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => runNowMut.mutate()} disabled={runNowMut.isPending}>
            <PlayCircle className="h-4 w-4 mr-2" /> {t("adminMarketing.runSchedulerNow")}
          </Button>
          <Button onClick={() => setEditing({
            id: 0,
            name: "",
            description: "",
            triggerType: "no_purchase_after_days",
            triggerConfig: { days: 7 },
            enabled: false,
            steps: [],
            createdAt: "",
            updatedAt: "",
          })}>
            <Plus className="h-4 w-4 mr-2" /> {t("adminMarketing.newFlow")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-8 text-center"><Loader2 className="inline h-5 w-5 animate-spin" /></CardContent></Card>
      ) : flows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          {t("adminMarketing.flowsEmpty")}
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {flows.map((f) => (
            <Card key={f.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" /> {f.name}
                    </CardTitle>
                    <CardDescription>
                      {t("adminMarketing.triggerPrefix")} <strong>{TRIGGER_LABELS[f.triggerType]}</strong>
                      {f.triggerType === "no_purchase_after_days" && f.triggerConfig?.days != null && (
                        <> {t("adminMarketing.afterDays", { days: f.triggerConfig.days })}</>
                      )}
                      {f.triggerType === "inactive_since_days" && f.triggerConfig?.days != null && (
                        <> {t("adminMarketing.afterDays", { days: f.triggerConfig.days })}</>
                      )}
                      {f.triggerType === "credits_low" && f.triggerConfig?.threshold != null && (
                        <> {t("adminMarketing.creditsThreshold", { threshold: f.triggerConfig.threshold })}</>
                      )}
                    </CardDescription>
                    {f.description && <p className="text-xs text-muted-foreground mt-1">{f.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">{t("adminMarketing.active")}</Label>
                      <Switch
                        checked={f.enabled}
                        onCheckedChange={(v) => toggleMut.mutate({ flow: f, enabled: v })}
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(f)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(t("adminMarketing.confirmDeleteFlow"))) deleteMut.mutate(f.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {f.steps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("adminMarketing.noStepsAddHint")}</p>
                ) : (
                  <ol className="space-y-2">
                    {f.steps.map((s) => (
                      <FlowStepRow key={s.id} step={s} />
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && <FlowEditor flow={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function FlowStepRow({ step }: { step: FlowStep }) {
  const { t } = useTranslation();
  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/marketing/templates"],
  });
  const tpl = templates.find((tp) => tp.id === step.templateId);
  return (
    <li className="flex items-center gap-3 p-2 border rounded bg-muted/20">
      <Badge variant="outline">{t("adminMarketing.stepN", { n: step.stepOrder + 1 })}</Badge>
      <span className="text-sm">
        {t("adminMarketing.stepAfterHoursPrefix")} <strong>{t("adminMarketing.hoursValue", { hours: step.delayHours })}</strong> {t("adminMarketing.stepTemplateArrow", { name: tpl?.name ?? `#${step.templateId}` })}
      </span>
    </li>
  );
}

function FlowEditor({ flow, onClose }: { flow: EmailFlow; onClose: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const TRIGGER_LABELS = triggerLabels(t);
  const isNew = flow.id === 0;
  const [name, setName] = useState(flow.name);
  const [description, setDescription] = useState(flow.description ?? "");
  const [triggerType, setTriggerType] = useState<FlowTriggerType>(flow.triggerType);
  const [days, setDays] = useState<number>(flow.triggerConfig?.days ?? 7);
  const [threshold, setThreshold] = useState<number>(flow.triggerConfig?.threshold ?? 1);
  const [enabled, setEnabled] = useState(flow.enabled);

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/marketing/templates"],
  });

  const triggerConfig = useMemo(() => {
    if (triggerType === "no_purchase_after_days" || triggerType === "inactive_since_days") {
      return { days };
    }
    if (triggerType === "credits_low") {
      return { threshold };
    }
    return null;
  }, [triggerType, days, threshold]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = { name, description: description || null, triggerType, triggerConfig, enabled };
      const url = isNew ? "/api/admin/marketing/flows" : `/api/admin/marketing/flows/${flow.id}`;
      const res = await apiRequest(isNew ? "POST" : "PUT", url, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing/flows"] });
      toast({ title: isNew ? t("adminMarketing.toastFlowCreated") : t("adminMarketing.toastFlowSaved") });
      if (isNew) onClose();
    },
    onError: (err: any) =>
      toast({ variant: "destructive", title: t("adminMarketing.toastSaveFailed"), description: err?.message }),
  });

  const addStepMut = useMutation({
    mutationFn: async (body: { stepOrder: number; delayHours: number; templateId: number }) => {
      const res = await apiRequest("POST", `/api/admin/marketing/flows/${flow.id}/steps`, body);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing/flows"] }),
  });

  const deleteStepMut = useMutation({
    mutationFn: async (stepId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/marketing/flows/${flow.id}/steps/${stepId}`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing/flows"] }),
  });

  const [newStepDelay, setNewStepDelay] = useState(24);
  const [newStepTemplate, setNewStepTemplate] = useState<number>(0);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? t("adminMarketing.newFlow") : t("adminMarketing.editFlowTitle", { name: flow.name })}</DialogTitle>
          <DialogDescription>
            {t("adminMarketing.flowEditorDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t("adminMarketing.colName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("adminMarketing.labelDescription")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>{t("adminMarketing.labelTrigger")}</Label>
              <Select value={triggerType} onValueChange={(v) => setTriggerType(v as FlowTriggerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(triggerType === "no_purchase_after_days" || triggerType === "inactive_since_days") && (
              <div>
                <Label>{t("adminMarketing.labelDays")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                />
              </div>
            )}
            {triggerType === "credits_low" && (
              <div>
                <Label>{t("adminMarketing.labelCreditThreshold")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <Label>{t("adminMarketing.flowActiveLabel")}</Label>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => saveMut.mutate()} disabled={!name || saveMut.isPending}>
              {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isNew ? t("adminMarketing.createFlow") : t("adminMarketing.saveFlow")}
            </Button>
          </div>

          {!isNew && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold">{t("adminMarketing.stepsHeading")}</h3>
              {flow.steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("adminMarketing.noStepsYet")}</p>
              ) : (
                <ul className="space-y-2">
                  {flow.steps.map((s) => {
                    const tpl = templates.find((tp) => tp.id === s.templateId);
                    return (
                      <li key={s.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="text-sm">
                          <Badge variant="outline" className="mr-2">{t("adminMarketing.stepN", { n: s.stepOrder + 1 })}</Badge>
                          {t("adminMarketing.stepAfterHoursLower")} <strong>{t("adminMarketing.hoursValue", { hours: s.delayHours })}</strong> {t("adminMarketing.stepTemplateArrowShort", { name: tpl?.name ?? `#${s.templateId}` })}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(t("adminMarketing.confirmDeleteStep"))) deleteStepMut.mutate(s.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="flex items-end gap-2 pt-2">
                <div className="flex-1">
                  <Label>{t("adminMarketing.labelDelayHours")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={newStepDelay}
                    onChange={(e) => setNewStepDelay(Number(e.target.value))}
                  />
                </div>
                <div className="flex-[2]">
                  <Label>{t("adminMarketing.labelTemplate")}</Label>
                  <Select value={String(newStepTemplate)} onValueChange={(v) => setNewStepTemplate(Number(v))}>
                    <SelectTrigger><SelectValue placeholder={t("adminMarketing.selectTemplate")} /></SelectTrigger>
                    <SelectContent>
                      {templates.map((tpl) => (
                        <SelectItem key={tpl.id} value={String(tpl.id)}>{tpl.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => {
                    if (!newStepTemplate) return;
                    addStepMut.mutate({
                      stepOrder: flow.steps.length,
                      delayHours: newStepDelay,
                      templateId: newStepTemplate,
                    });
                  }}
                  disabled={!newStepTemplate || addStepMut.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" /> {t("adminMarketing.add")}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Log Tab ───────────────────────────────────────────────────────────────

function LogTab() {
  const { t } = useTranslation();
  const { data: sends = [], isLoading } = useQuery<EmailSend[]>({
    queryKey: ["/api/admin/marketing/sends"],
    refetchInterval: 15_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("adminMarketing.logTitle")}</CardTitle>
        <CardDescription>{t("adminMarketing.logDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="inline h-5 w-5 animate-spin" /></div>
        ) : sends.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{t("adminMarketing.logEmpty")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("adminMarketing.colTime")}</TableHead>
                <TableHead>{t("adminMarketing.colRecipient")}</TableHead>
                <TableHead>{t("adminMarketing.colKind")}</TableHead>
                <TableHead>{t("adminMarketing.colStatus")}</TableHead>
                <TableHead>{t("adminMarketing.colSubject")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sends.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleString("de-DE")}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.toEmail}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.kind}</Badge>
                  </TableCell>
                  <TableCell>
                    {sendStatusBadge(s.status, t)}
                    {s.errorMessage && (
                      <div className="text-xs text-destructive mt-1 max-w-xs truncate">{s.errorMessage}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm truncate max-w-md">{s.subject}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
