import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Plus,
  Send,
  ArrowLeft,
  HelpCircle,
  MessageCircle,
  Bug,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  XCircle,
  Inbox,
} from "lucide-react";
import type { SupportConversation, SupportMessage } from "@shared/models/chat";

type ConversationWithMeta = SupportConversation & {
  lastMessage?: SupportMessage;
  unreadCount: number;
};

type ConversationDetail = {
  conversation: SupportConversation;
  messages: SupportMessage[];
};

const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  hilfe: { label: "Hilfe", icon: <HelpCircle className="h-3.5 w-3.5" /> },
  feedback: { label: "Feedback", icon: <MessageCircle className="h-3.5 w-3.5" /> },
  fehler: { label: "Fehlermeldung", icon: <Bug className="h-3.5 w-3.5" /> },
  sonstiges: { label: "Sonstiges", icon: <MoreHorizontal className="h-3.5 w-3.5" /> },
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "open":
      return (
        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Offen
        </Badge>
      );
    case "answered":
      return (
        <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Beantwortet
        </Badge>
      );
    case "closed":
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
          <XCircle className="h-3 w-3 mr-1" />
          Geschlossen
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(date: string | Date) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Gestern";
  if (diffDays < 7) {
    return d.toLocaleDateString("de-DE", { weekday: "short" });
  }
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

export default function MessagesPage() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("hilfe");
  const [newContent, setNewContent] = useState("");
  const [replyContent, setReplyContent] = useState("");

  const { data: conversations, isLoading } = useQuery<ConversationWithMeta[]>({
    queryKey: ["/api/messages"],
  });

  const { data: detail, isLoading: detailLoading } = useQuery<ConversationDetail>({
    queryKey: ["/api/messages", selectedId],
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { subject: string; category: string; content: string }) => {
      const res = await apiRequest("POST", "/api/messages", data);
      return res.json();
    },
    onSuccess: (convo: SupportConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread"] });
      setNewDialogOpen(false);
      setNewSubject("");
      setNewCategory("hilfe");
      setNewContent("");
      setSelectedId(convo.id);
      toast({ title: "Nachricht gesendet", description: "Wir melden uns schnellstmöglich bei Ihnen." });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Nachricht konnte nicht gesendet werden.", variant: "destructive" });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const res = await apiRequest("POST", `/api/messages/${id}/reply`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedId] });
      setReplyContent("");
    },
    onError: () => {
      toast({ title: "Fehler", description: "Antwort konnte nicht gesendet werden.", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!newSubject.trim() || !newContent.trim()) return;
    createMutation.mutate({ subject: newSubject, category: newCategory, content: newContent });
  };

  const handleReply = () => {
    if (!replyContent.trim() || !selectedId) return;
    replyMutation.mutate({ id: selectedId, content: replyContent });
  };

  const showList = selectedId === null;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold">Support</h1>
          <p className="text-sm text-muted-foreground">
            Schreiben Sie uns – wir helfen Ihnen gerne weiter.
          </p>
        </div>
        <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neue Nachricht
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif">Neue Nachricht</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="category">Kategorie</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hilfe">Hilfe</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                    <SelectItem value="fehler">Fehlermeldung</SelectItem>
                    <SelectItem value="sonstiges">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Betreff</Label>
                <Input
                  id="subject"
                  placeholder="Worum geht es?"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Nachricht</Label>
                <Textarea
                  id="content"
                  placeholder="Beschreiben Sie Ihr Anliegen..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={createMutation.isPending || !newSubject.trim() || !newContent.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "Wird gesendet..." : "Nachricht senden"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-4 min-h-[calc(100vh-220px)]">
        {/* Conversation List */}
        <div className={`${!showList ? "hidden lg:block" : ""}`}>
          <Card className="h-full">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : conversations && conversations.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-240px)]">
                <div className="divide-y">
                  {conversations.map((convo) => {
                    const cat = categoryLabels[convo.category] || categoryLabels.sonstiges;
                    return (
                      <button
                        key={convo.id}
                        onClick={() => setSelectedId(convo.id)}
                        className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                          selectedId === convo.id ? "bg-muted/70" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-medium text-sm truncate flex-1">
                            {convo.subject}
                          </span>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {formatShortDate(convo.updatedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            {cat.icon}
                            {cat.label}
                          </span>
                          <StatusBadge status={convo.status} />
                          {convo.unreadCount > 0 && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        {convo.lastMessage && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {convo.lastMessage.isAdmin ? "Support: " : "Sie: "}
                            {convo.lastMessage.content}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Inbox className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="font-serif text-lg font-semibold mb-1">Noch keine Support-Anfragen</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Haben Sie eine Frage oder Feedback? Wir freuen uns auf Ihre Nachricht.
                </p>
                <Button variant="outline" onClick={() => setNewDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Erste Nachricht schreiben
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Conversation Detail */}
        <div className={`${showList ? "hidden lg:block" : ""}`}>
          <Card className="h-full flex flex-col">
            {selectedId && detail ? (
              <>
                <div className="flex items-center gap-3 p-4 border-b">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden shrink-0"
                    onClick={() => setSelectedId(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-medium text-sm truncate">{detail.conversation.subject}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {categoryLabels[detail.conversation.category]?.label || "Sonstiges"}
                      </span>
                      <StatusBadge status={detail.conversation.status} />
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {detail.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isAdmin ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                            msg.isAdmin
                              ? "bg-muted text-foreground rounded-bl-md"
                              : "bg-primary text-primary-foreground rounded-br-md"
                          }`}
                        >
                          {msg.isAdmin && (
                            <p className="text-[11px] font-medium mb-1 opacity-70">Support</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${msg.isAdmin ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                            {formatDate(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {detail.conversation.status !== "closed" && (
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Antwort schreiben..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={2}
                        className="resize-none flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            handleReply();
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        className="shrink-0 self-end"
                        onClick={handleReply}
                        disabled={replyMutation.isPending || !replyContent.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Strg+Enter zum Senden
                    </p>
                  </div>
                )}

                {detail.conversation.status === "closed" && (
                  <div className="border-t p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Diese Konversation wurde geschlossen.
                    </p>
                  </div>
                )}
              </>
            ) : detailLoading && selectedId ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-20 w-3/4" />
                <Skeleton className="h-20 w-2/3 ml-auto" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Wählen Sie eine Konversation aus oder schreiben Sie eine neue Nachricht.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
