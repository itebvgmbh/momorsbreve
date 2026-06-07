import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  LayoutDashboard,
  Upload,
  Coins,
  LogOut,
  FlaskConical,
  BookOpen,
  CreditCard,
  MessageSquare,
  Activity,
  User,
  ScanSearch,
  Settings,
  ClipboardCheck,
  Headphones,
  Receipt,
  BarChart3,
  Mail,
  Building2,
  HelpCircle,
} from "lucide-react";
import { Logo } from "@/components/logo";

type MenuItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  external?: boolean;
};

const transcriptionItems: MenuItem[] = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard },
  { title: "Hochladen", url: "/app/upload", icon: Upload },
  { title: "Meine Audios", url: "/app/audio", icon: Headphones },
  { title: "Meine Anfragen", url: "/app/human-transcription", icon: User },
];

const accountItems: MenuItem[] = [
  { title: "Preise", url: "/app/pricing", icon: Coins },
  { title: "Einstellungen", url: "/app/settings", icon: Settings },
];

const helpItems: MenuItem[] = [
  { title: "Häufige Fragen", url: "/faq", icon: HelpCircle, external: true },
  { title: "Support", url: "/app/support", icon: MessageSquare },
  { title: "Blog", url: "/blog", icon: BookOpen, external: true },
];

interface HumanTranscriptionRequestSummary {
  status: string;
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: adminCheck, isError: adminCheckError } = useQuery<{ admin: boolean }>({
    queryKey: ["/api/admin/check"],
    retry: false,
    staleTime: 30_000,
  });
  const isAdmin = !adminCheckError && adminCheck?.admin === true;

  const { data: expertCheck } = useQuery<{ expert: { companyName: string | null } | null }>({
    queryKey: ["/api/expert/me"],
    retry: false,
    staleTime: 30_000,
  });
  const isExpert = !!expertCheck?.expert;

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread"],
    staleTime: 30_000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const { data: humanRequests } = useQuery<HumanTranscriptionRequestSummary[]>({
    queryKey: ["/api/human-transcription/requests"],
    staleTime: 30_000,
  });
  const actionableHumanRequestsCount = (humanRequests ?? []).filter((request) =>
    request.status === "quoted" || request.status === "completed"
  ).length;

  const { data: adminUnreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/messages/unread"],
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const adminUnreadCount = adminUnreadData?.count ?? 0;

  const { data: stripeMode } = useQuery<{ mode: "live" | "test"; publicKey: string | null }>({
    queryKey: ["/api/admin/stripe-mode"],
    enabled: isAdmin,
    retry: false,
    staleTime: 30_000,
  });

  const stripeModeMutation = useMutation({
    mutationFn: async (mode: "live" | "test") => {
      const res = await apiRequest("POST", "/api/admin/stripe-mode", { mode });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stripe-mode"] });
    },
  });

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Logo height="h-8" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Meine Transkriptionen</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {transcriptionItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.url === "/app"
                        ? location === "/app"
                        : location.startsWith(item.url)
                    }
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.url === "/app/human-transcription" && actionableHumanRequestsCount > 0 && (
                        <Badge variant="default" className="h-5 min-w-5 px-1.5 text-[10px] font-semibold">
                          {actionableHumanRequestsCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Mein Konto</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith(item.url)}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Hilfe & Mehr</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {helpItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={!item.external && location.startsWith(item.url)}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.url === "/app/support" && unreadCount > 0 && (
                        <Badge variant="default" className="h-5 min-w-5 px-1.5 text-[10px] font-semibold">
                          {unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isExpert && (
          <SidebarGroup>
            <SidebarGroupLabel>Experte</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith("/app/expert")}
                  >
                    <Link href="/app/expert" data-testid="nav-expert-dashboard">
                      <Building2 className="h-4 w-4" />
                      <span>Expertenbereich</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith("/app/admin/dashboard")}
                  >
                    <Link href="/app/admin/dashboard" data-testid="nav-admin-dashboard">
                      <BarChart3 className="h-4 w-4" />
                      <span>Umsatz</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith("/app/admin/support")}
                  >
                    <Link href="/app/admin/support" data-testid="nav-admin-messages">
                      <MessageSquare className="h-4 w-4" />
                      <span className="flex-1">Support</span>
                      {adminUnreadCount > 0 && (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith("/app/admin/evaluation")}
                  >
                    <Link href="/app/admin/evaluation" data-testid="nav-evaluation">
                      <FlaskConical className="h-4 w-4" />
                      <span>Evaluation</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith("/app/admin/tokens")}
                  >
                    <Link href="/app/admin/tokens" data-testid="nav-admin-tokens">
                      <Activity className="h-4 w-4" />
                      <span>Token-Verbrauch</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith("/app/admin/human-transcription")}
                  >
                    <Link href="/app/admin/human-transcription" data-testid="nav-admin-human-transcription">
                      <User className="h-4 w-4" />
                      <span>Experten-Anfragen</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith("/app/admin/orders")}
                  >
                    <Link href="/app/admin/orders" data-testid="nav-admin-orders">
                      <ClipboardCheck className="h-4 w-4" />
                      <span>Bezahlte Aufträge</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith("/app/admin/invoices")}
                  >
                    <Link href="/app/admin/invoices" data-testid="nav-admin-invoices">
                      <Receipt className="h-4 w-4" />
                      <span>Rechnungen</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith("/app/admin/analysen")}
                  >
                    <Link href="/app/admin/analysen" data-testid="nav-admin-analysen">
                      <ScanSearch className="h-4 w-4" />
                      <span>Anonyme Analysen</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith("/app/admin/marketing")}
                  >
                    <Link href="/app/admin/marketing" data-testid="nav-admin-marketing">
                      <Mail className="h-4 w-4" />
                      <span>Marketing</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith("/app/admin/settings")}
                  >
                    <Link href="/app/admin/settings" data-testid="nav-admin-settings">
                      <Settings className="h-4 w-4" />
                      <span>Einstellungen</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith("/app/admin/experts")}
                  >
                    <Link href="/app/admin/experts" data-testid="nav-admin-experts">
                      <Building2 className="h-4 w-4" />
                      <span>Experten</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm flex-1">Stripe</span>
                    <Badge
                      variant={stripeMode?.mode === "test" ? "secondary" : "default"}
                      className={`text-[10px] px-1.5 py-0 ${
                        stripeMode?.mode === "test"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {stripeMode?.mode === "test" ? "Test" : "Live"}
                    </Badge>
                    <Switch
                      checked={stripeMode?.mode === "test"}
                      disabled={stripeModeMutation.isPending}
                      onCheckedChange={(checked) =>
                        stripeModeMutation.mutate(checked ? "test" : "live")
                      }
                      aria-label="Stripe Sandbox Modus"
                      className="scale-75"
                    />
                  </div>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <div className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-3">
        {user && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">
                {user.firstName?.[0] || user.email?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName
                  ? `${user.firstName} ${user.lastName || ""}`
                  : user.email || "Benutzer"}
              </p>
              {user.email && (
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              )}
            </div>
          </div>
        )}
        <Button variant="ghost" className="w-full justify-start" data-testid="button-logout" onClick={() => logout()}>
          <LogOut className="h-4 w-4 mr-2" />
          Abmelden
        </Button>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground/60">
          <Link href="/impressum" className="hover:text-muted-foreground transition-colors">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-muted-foreground transition-colors">Datenschutz</Link>
          <Link href="/agb" className="hover:text-muted-foreground transition-colors">AGB</Link>
          <Link href="/widerrufsbelehrung" className="hover:text-muted-foreground transition-colors">Widerruf</Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
