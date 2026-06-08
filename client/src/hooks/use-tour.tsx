import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  driver,
  type AllowedButtons,
  type Config,
  type Driver,
  type DriveStep,
} from "driver.js";
import "driver.js/dist/driver.css";
import "@/lib/tour-styles.css";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { loc } from "@/i18n/localized";
import { useAuth } from "@/hooks/use-auth";
import type { TourState } from "@shared/models/auth";
import {
  tours,
  audioNoJobsSteps,
  combineNoJobsSteps,
  type TourId,
  type TourStep,
} from "@/data/tours";
import type { TranscriptionJobWithSnippet } from "@shared/models/transcription";

interface TourContextValue {
  state: TourState;
  isLoading: boolean;
  startTour: (id: TourId) => void;
  endTour: () => void;
  markCompleted: (id: TourId) => void;
  markDismissed: (id: TourId) => void;
  setWelcomeAnswer: (answer: "yes" | "no" | "later") => void;
}

const TourContext = createContext<TourContextValue | null>(null);

const PAGE_TRANSITION_KEY = "tour:resume";

function elementInDom(selector: string | undefined): boolean {
  if (!selector || typeof document === "undefined") return false;
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return false;
  return el.offsetWidth > 0 || el.offsetHeight > 0;
}

function buildDriveStep(step: TourStep, lang: string): DriveStep {
  const isInteractive = !!step.advanceOn;
  const buttons: AllowedButtons[] = isInteractive
    ? ["previous", "close"]
    : ["next", "previous", "close"];

  const popover: DriveStep["popover"] = {
    title: loc(step.title, lang),
    description: loc(step.description, lang),
    side: step.side,
    align: step.align,
    showButtons: buttons,
    nextBtnText: step.nextBtnText ? loc(step.nextBtnText, lang) : "Weiter",
    prevBtnText: step.prevBtnText ? loc(step.prevBtnText, lang) : "Zurück",
    doneBtnText: step.doneBtnText ? loc(step.doneBtnText, lang) : "Fertig",
  };

  return {
    element: step.element
      ? (() => {
          const el = document.querySelector<HTMLElement>(step.element!);
          if (!el || (el.offsetWidth === 0 && el.offsetHeight === 0))
            return null as unknown as Element;
          return el as Element;
        })
      : undefined,
    popover,
    disableActiveInteraction: false,
  };
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { i18n } = useTranslation();
  const [location, navigate] = useLocation();
  const qc = useQueryClient();
  const driverRef = useRef<Driver | null>(null);
  const currentTourRef = useRef<TourId | null>(null);

  const advanceCleanupRef = useRef<(() => void) | null>(null);
  const elementWatchCleanupRef = useRef<(() => void) | null>(null);
  const pendingRouteAdvanceRef = useRef<string | null>(null);
  const locationRef = useRef<string>(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const { data: state = {}, isLoading } = useQuery<TourState>({
    queryKey: ["/api/tours/state"],
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const patchMutation = useMutation({
    mutationFn: async (partial: Partial<TourState>) => {
      const res = await apiRequest("PATCH", "/api/tours/state", partial);
      return (await res.json()) as TourState;
    },
    onSuccess: (data) => {
      qc.setQueryData(["/api/tours/state"], data);
    },
  });

  const clearAdvanceListener = useCallback(() => {
    advanceCleanupRef.current?.();
    advanceCleanupRef.current = null;
    pendingRouteAdvanceRef.current = null;
  }, []);

  const clearElementWatch = useCallback(() => {
    elementWatchCleanupRef.current?.();
    elementWatchCleanupRef.current = null;
  }, []);

  const clearAllListeners = useCallback(() => {
    clearAdvanceListener();
    clearElementWatch();
  }, [clearAdvanceListener, clearElementWatch]);

  const endTour = useCallback(() => {
    clearAllListeners();
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
    currentTourRef.current = null;
    try {
      sessionStorage.removeItem(PAGE_TRANSITION_KEY);
    } catch {}
  }, [clearAllListeners]);

  const markCompleted = useCallback(
    (id: TourId) => patchMutation.mutate({ completedTours: [id] }),
    [patchMutation]
  );

  const markDismissed = useCallback(
    (id: TourId) => patchMutation.mutate({ dismissedTours: [id] }),
    [patchMutation]
  );

  const setWelcomeAnswer = useCallback(
    (answer: "yes" | "no" | "later") =>
      patchMutation.mutate({ welcomeSeen: true, welcomeAnswer: answer }),
    [patchMutation]
  );

  /**
   * Re-drive the current step with fresh DOM queries. Used when an element
   * appeared after the step was already activated (e.g. after page transition).
   */
  const reDriveStep = useCallback(
    (tourId: TourId, stepIndex: number) => {
      const inst = driverRef.current;
      if (!inst || currentTourRef.current !== tourId) return;
      if (inst.getActiveIndex() !== stepIndex) return;
      const def = tours[tourId];
      if (!def) return;
      const freshSteps = def.steps.map((s) => buildDriveStep(s, i18n.language));
      inst.setConfig({ ...inst.getConfig(), steps: freshSteps });
      inst.drive(stepIndex);
    },
    [i18n.language]
  );

  /**
   * Watch for a DOM element to appear (for steps where the element isn't
   * in the DOM yet). When it appears, re-drive the step so driver.js
   * picks it up and highlights it properly.
   */
  const watchForElement = useCallback(
    (tourId: TourId, step: TourStep, stepIndex: number) => {
      if (!step.element || elementInDom(step.element)) return;
      clearElementWatch();

      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        window.clearInterval(pollId);
        window.clearTimeout(timeoutId);
        elementWatchCleanupRef.current = null;
        window.setTimeout(() => reDriveStep(tourId, stepIndex), 200);
      };

      const observer = new MutationObserver(() => {
        if (elementInDom(step.element!)) settle();
      });
      observer.observe(document.body, { childList: true, subtree: true });

      const pollId = window.setInterval(() => {
        if (step.action) {
          try { step.action(); } catch {}
        }
        if (elementInDom(step.element!)) settle();
      }, 250);

      const timeoutId = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          observer.disconnect();
          window.clearInterval(pollId);
          elementWatchCleanupRef.current = null;
        }
      }, 30_000);

      elementWatchCleanupRef.current = () => {
        settled = true;
        observer.disconnect();
        window.clearInterval(pollId);
        window.clearTimeout(timeoutId);
      };
    },
    [clearElementWatch, reDriveStep]
  );

  const advanceToNext = useCallback(() => {
    clearAdvanceListener();
    clearElementWatch();
    const inst = driverRef.current;
    if (!inst) return;

    window.setTimeout(() => {
      if (driverRef.current !== inst) return;
      if (inst.hasNextStep()) {
        inst.moveNext();
      } else {
        inst.destroy();
      }
    }, 350);
  }, [clearAdvanceListener, clearElementWatch]);

  const installAdvanceListener = useCallback(
    (step: TourStep) => {
      clearAdvanceListener();
      const wait = step.advanceOn;
      if (!wait) return;

      if (wait.type === "click") {
        const sel = wait.selector ?? step.element;
        if (!sel) return;
        const tryAttach = () => {
          const el = document.querySelector<HTMLElement>(sel);
          if (!el) return false;
          const handler = () => advanceToNext();
          el.addEventListener("click", handler, { once: true });
          advanceCleanupRef.current = () =>
            el.removeEventListener("click", handler);
          return true;
        };
        if (!tryAttach()) {
          const observer = new MutationObserver(() => {
            if (tryAttach()) observer.disconnect();
          });
          observer.observe(document.body, { childList: true, subtree: true });
          advanceCleanupRef.current = () => observer.disconnect();
        }
      } else if (wait.type === "elementAppears") {
        const sel = wait.selector;
        if (!sel) return;
        if (elementInDom(sel)) {
          advanceToNext();
          return;
        }
        const observer = new MutationObserver(() => {
          if (elementInDom(sel)) {
            observer.disconnect();
            advanceToNext();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        let timeoutId: number | undefined;
        if (wait.timeoutMs) {
          timeoutId = window.setTimeout(
            () => observer.disconnect(),
            wait.timeoutMs
          );
        }
        advanceCleanupRef.current = () => {
          observer.disconnect();
          if (timeoutId) window.clearTimeout(timeoutId);
        };
      } else if (wait.type === "routeChange") {
        const prefix = wait.routePrefix;
        if (!prefix) return;
        if (locationRef.current.startsWith(prefix)) {
          advanceToNext();
          return;
        }
        pendingRouteAdvanceRef.current = prefix;
        advanceCleanupRef.current = () => {
          pendingRouteAdvanceRef.current = null;
        };
      }
    },
    [advanceToNext, clearAdvanceListener]
  );

  useEffect(() => {
    const prefix = pendingRouteAdvanceRef.current;
    if (!prefix) return;
    if (location.startsWith(prefix)) {
      advanceToNext();
    }
  }, [location, advanceToNext]);

  const runStepsFromIndex = useCallback(
    (id: TourId, startIndex: number, overrideDef?: { steps: TourStep[] }) => {
      const def = overrideDef
        ? { ...tours[id]!, steps: overrideDef.steps }
        : tours[id];
      if (!def) return;
      const steps = def.steps.map((s) => buildDriveStep(s, i18n.language));

      const config: Config = {
        steps,
        showProgress: def.steps.length > 1,
        progressText: "Schritt {{current}} von {{total}}",
        nextBtnText: "Weiter",
        prevBtnText: "Zurück",
        doneBtnText: "Fertig",
        showButtons: ["next", "previous", "close"],
        allowClose: true,
        animate: true,
        smoothScroll: true,
        stagePadding: 8,
        stageRadius: 8,
        overlayOpacity: 0.45,
        popoverClass: "ot-popover",
        disableActiveInteraction: false,
        overlayClickBehavior: () => {},

        onHighlightStarted: (_el, _stepCfg, opts) => {
          const activeIndex = opts.state.activeIndex ?? 0;
          const tourStep = def.steps[activeIndex];
          if (!tourStep) return;

          clearAdvanceListener();
          clearElementWatch();

          if (tourStep.preventScroll) {
            const scrollY = window.scrollY;
            setTimeout(() => window.scrollTo({ top: scrollY, behavior: "auto" }), 0);
          }

          if (tourStep.action) {
            try {
              tourStep.action();
            } catch (err) {
              console.warn("[Tour] action failed:", err);
            }
          }

          if (tourStep.navigateTo) {
            const target = tourStep.navigateTo;
            try {
              sessionStorage.setItem(
                PAGE_TRANSITION_KEY,
                JSON.stringify({ tourId: id, nextIndex: activeIndex + 1 })
              );
            } catch {}
            driverRef.current?.destroy();
            driverRef.current = null;
            navigate(target);
            return;
          }

          if (tourStep.element && !elementInDom(tourStep.element)) {
            watchForElement(id, tourStep, activeIndex);
          }

          installAdvanceListener(tourStep);
        },

        onCloseClick: () => {
          markDismissed(id);
          endTour();
        },

        onDestroyStarted: () => {
          const inst = driverRef.current;
          if (inst && !inst.hasNextStep()) {
            markCompleted(id);
          }
          inst?.destroy();
        },

        onDestroyed: () => {
          clearAllListeners();
          if (currentTourRef.current === id) {
            currentTourRef.current = null;
          }
        },
      };

      const inst = driver(config);
      driverRef.current = inst;
      currentTourRef.current = id;
      inst.drive(startIndex);
    },
    [
      clearAdvanceListener,
      clearAllListeners,
      clearElementWatch,
      endTour,
      i18n.language,
      installAdvanceListener,
      markCompleted,
      markDismissed,
      navigate,
      watchForElement,
    ]
  );

  const startTour = useCallback(
    (id: TourId) => {
      endTour();
      const def = tours[id];
      if (!def) return;

      if (id === "audio") {
        if (location.match(/^\/app\/result\/\d+/)) {
          runStepsFromIndex(id, 0);
          return;
        }

        const cachedJobs =
          qc.getQueryData<TranscriptionJobWithSnippet[]>(["/api/jobs"]);
        const latestCompleted = cachedJobs
          ?.filter((j) => j.status === "completed")
          .sort((a, b) => b.id - a.id)[0];

        if (!latestCompleted) {
          runStepsFromIndex(id, 0, { steps: audioNoJobsSteps });
          return;
        }

        try {
          sessionStorage.setItem(
            PAGE_TRANSITION_KEY,
            JSON.stringify({ tourId: id, nextIndex: 0 })
          );
        } catch {}
        navigate(`/app/result/${latestCompleted.id}`);
        return;
      }

      if (id === "combine") {
        const cachedJobs =
          qc.getQueryData<TranscriptionJobWithSnippet[]>(["/api/jobs"]);
        const completedCount =
          cachedJobs?.filter((j) => j.status === "completed").length ?? 0;
        if (completedCount < 2) {
          runStepsFromIndex(id, 0, { steps: combineNoJobsSteps });
          return;
        }
      }

      const firstStep = def.steps[0];
      const needsNav =
        firstStep?.requirePath &&
        (!location.startsWith(firstStep.requirePath) ||
          (firstStep.element && !elementInDom(firstStep.element)));
      if (needsNav) {
        try {
          sessionStorage.setItem(
            PAGE_TRANSITION_KEY,
            JSON.stringify({ tourId: id, nextIndex: 0 })
          );
        } catch {}
        navigate(firstStep!.requirePath!);
        return;
      }
      runStepsFromIndex(id, 0);
    },
    [endTour, location, navigate, qc, runStepsFromIndex]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(PAGE_TRANSITION_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    let parsed: { tourId: TourId; nextIndex: number } | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      try {
        sessionStorage.removeItem(PAGE_TRANSITION_KEY);
      } catch {}
      return;
    }
    if (!parsed) return;
    const def = tours[parsed.tourId];
    if (!def) {
      try {
        sessionStorage.removeItem(PAGE_TRANSITION_KEY);
      } catch {}
      return;
    }
    const nextStep = def.steps[parsed.nextIndex];
    if (!nextStep) {
      try {
        sessionStorage.removeItem(PAGE_TRANSITION_KEY);
      } catch {}
      return;
    }
    if (nextStep.requirePath && !location.startsWith(nextStep.requirePath)) {
      return;
    }
    try {
      sessionStorage.removeItem(PAGE_TRANSITION_KEY);
    } catch {}
    const timer = window.setTimeout(() => {
      runStepsFromIndex(parsed!.tourId, parsed!.nextIndex);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, location, runStepsFromIndex]);

  useEffect(() => {
    return () => {
      clearAllListeners();
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, [clearAllListeners]);

  const value = useMemo<TourContextValue>(
    () => ({
      state,
      isLoading,
      startTour,
      endTour,
      markCompleted,
      markDismissed,
      setWelcomeAnswer,
    }),
    [
      state,
      isLoading,
      startTour,
      endTour,
      markCompleted,
      markDismissed,
      setWelcomeAnswer,
    ]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return ctx;
}
