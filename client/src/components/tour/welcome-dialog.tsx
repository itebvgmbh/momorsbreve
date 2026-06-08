import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useTour } from "@/hooks/use-tour";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles } from "lucide-react";
import type { TranscriptionJobWithSnippet } from "@shared/models/transcription";

export function WelcomeDialog() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { state, isLoading, startTour, setWelcomeAnswer } = useTour();
  const [open, setOpen] = useState(false);

  const { data: jobs, isLoading: jobsLoading } = useQuery<TranscriptionJobWithSnippet[]>({
    queryKey: ["/api/jobs"],
    enabled: isAuthenticated && !state.welcomeSeen,
  });

  useEffect(() => {
    if (!isAuthenticated || authLoading || isLoading || jobsLoading) return;
    if (state.welcomeSeen) return;

    if (jobs && jobs.length > 0) {
      setWelcomeAnswer("no");
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, authLoading, isLoading, jobsLoading, state.welcomeSeen, jobs, setWelcomeAnswer]);

  const handleYes = () => {
    setOpen(false);
    setWelcomeAnswer("yes");
    window.setTimeout(() => startTour("welcome"), 300);
  };

  const handleLater = () => {
    setOpen(false);
    setWelcomeAnswer("later");
  };

  const handleNo = () => {
    setOpen(false);
    setWelcomeAnswer("no");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleLater()}>
      <DialogContent className="sm:max-w-md" data-testid="welcome-dialog">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center font-serif text-2xl">
            {t("tourWelcome.title")}
          </DialogTitle>
          <DialogDescription className="text-center text-base leading-relaxed pt-2">
            {t("tourWelcome.description")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:gap-2 sm:space-x-0">
          <Button
            size="lg"
            className="w-full h-12 text-base"
            onClick={handleYes}
            data-testid="button-welcome-yes"
          >
            {t("tourWelcome.yes")}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 text-base"
            onClick={handleLater}
            data-testid="button-welcome-later"
          >
            {t("tourWelcome.later")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={handleNo}
            data-testid="button-welcome-no"
          >
            {t("tourWelcome.no")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
