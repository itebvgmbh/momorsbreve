import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { HelpCircle, BookOpen, MessageSquare, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTour } from "@/hooks/use-tour";
import { tourOrder, tours, type TourId } from "@/data/tours";
import { cn } from "@/lib/utils";

export function HelpMenu() {
  const { t } = useTranslation();
  const { startTour, state } = useTour();

  const handleStart = (id: TourId) => {
    startTour(id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          data-tour="help-button"
          data-testid="button-help-menu"
          aria-label={t("tourHelp.helpAndToursAria")}
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2 text-base">
          <Compass className="h-4 w-4 text-primary" />
          {t("tourHelp.guidedTours")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tourOrder.map((id) => {
          const tour = tours[id];
          const isCompleted =
            (state.completedTours ?? []).includes(id);
          return (
            <DropdownMenuItem
              key={id}
              onSelect={() => handleStart(id)}
              className="cursor-pointer flex-col items-start gap-0.5 py-2.5"
              data-testid={`menu-tour-${id}`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="font-medium text-sm">{tour.shortLabel}</span>
                {isCompleted && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t("tourHelp.seen")}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-xs leading-snug",
                  isCompleted ? "text-muted-foreground/70" : "text-muted-foreground"
                )}
              >
                {tour.description}
              </span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/faq" data-testid="menu-help-faq">
            <BookOpen className="h-4 w-4 mr-2" />
            <span>{t("tourHelp.faq")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/app/support" data-testid="menu-help-support">
            <MessageSquare className="h-4 w-4 mr-2" />
            <span>{t("tourHelp.contactSupport")}</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
