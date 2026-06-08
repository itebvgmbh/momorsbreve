import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  ImageOff,
  Loader2,
  Search,
  Minus,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface DocumentPreviewProps {
  src: string;
  alt?: string;
  className?: string;
  hidePageNav?: boolean;
  hideZoom?: boolean;
  "data-testid"?: string;
}

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;

/* ------------------------------------------------------------------ */
/*  Magnifier: constants, hook & shared UI                             */
/* ------------------------------------------------------------------ */

const MAGNIFIER_MIN_SIZE = 120;
const MAGNIFIER_MAX_SIZE = 580;
const MAGNIFIER_MIN_ZOOM = 1.5;
const MAGNIFIER_MAX_ZOOM = 6;
const MAGNIFIER_DEFAULT_ZOOM = 2.5;
const MAGNIFIER_ZOOM_STEP = 0.5;

/** Compute a magnifier size that fits the viewport (max 70% of viewport width on mobile). */
function getDefaultMagnifierSize(): number {
  if (typeof window === "undefined") return 460;
  const maxByViewport = Math.floor(window.innerWidth * 0.7);
  return Math.max(MAGNIFIER_MIN_SIZE, Math.min(460, maxByViewport));
}

function isInteractiveTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "BUTTON" || tag === "INPUT" || tag === "A") return true;
  if (el.closest("button, [role='slider'], [data-magnifier-toolbar]")) return true;
  return false;
}

function useMagnifier(contentRef: React.RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);
  const [zoom, setZoom] = useState(MAGNIFIER_DEFAULT_ZOOM);
  const [size, setSize] = useState(() => getDefaultMagnifierSize());
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [show, setShow] = useState(false);
  const [overToolbar, setOverToolbar] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setSize((current) => {
        const maxByViewport = Math.floor(window.innerWidth * 0.7);
        const upperBound = Math.max(MAGNIFIER_MIN_SIZE, Math.min(MAGNIFIER_MAX_SIZE, maxByViewport));
        return Math.min(current, upperBound);
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggle = useCallback(() => setActive((v) => !v), []);

  const updatePos = useCallback(
    (clientX: number, clientY: number) => {
      if (!contentRef.current) return;
      const rect = contentRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const clampedX = Math.max(0, Math.min(rect.width, x));
      const clampedY = Math.max(0, Math.min(rect.height, y));

      const margin = size / 2;
      const tooFar =
        x < -margin || y < -margin || x > rect.width + margin || y > rect.height + margin;

      if (tooFar) {
        setShow(false);
        return;
      }
      setShow(true);
      setPos({ x: clampedX, y: clampedY });
    },
    [contentRef, size],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!active || e.pointerType !== "touch") return;
      if (isInteractiveTarget(e.target)) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updatePos(e.clientX, e.clientY);
    },
    [active, updatePos],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!active) return;
      if (isInteractiveTarget(e.target)) return;
      updatePos(e.clientX, e.clientY);
    },
    [active, updatePos],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") {
        setShow(false);
      }
    },
    [],
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") {
        setShow(false);
      }
    },
    [],
  );

  const handlePointerCancel = useCallback(() => {
    setShow(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!active) return;
      e.preventDefault();
      setZoom((prev) => {
        const next =
          prev + (e.deltaY < 0 ? MAGNIFIER_ZOOM_STEP : -MAGNIFIER_ZOOM_STEP);
        return Math.min(MAGNIFIER_MAX_ZOOM, Math.max(MAGNIFIER_MIN_ZOOM, next));
      });
    },
    [active],
  );

  const showLens = show && !overToolbar;

  return {
    active,
    zoom,
    size,
    pos,
    show: showLens,
    toggle,
    setZoom,
    setSize,
    setOverToolbar,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handlePointerCancel,
    handleWheel,
  };
}

/* ------------------------------------------------------------------ */
/*  Drag-to-pan: click & drag to scroll when content overflows          */
/* ------------------------------------------------------------------ */

function useDragToPan(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const scrollL = useRef(0);
  const scrollT = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || e.button !== 0) return;
      if (isInteractiveTarget(e.target)) return;
      const el = scrollRef.current;
      if (!el) return;
      if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return;

      dragging.current = true;
      startX.current = e.clientX;
      startY.current = e.clientY;
      scrollL.current = el.scrollLeft;
      scrollT.current = el.scrollTop;
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
      e.preventDefault();
    },
    [enabled, scrollRef],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging.current) return;
      const el = scrollRef.current;
      if (!el) return;
      el.scrollLeft = scrollL.current - (e.clientX - startX.current);
      el.scrollTop = scrollT.current - (e.clientY - startY.current);
    },
    [scrollRef],
  );

  const stopDrag = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    const el = scrollRef.current;
    if (el) {
      el.style.cursor = "";
      el.style.userSelect = "";
    }
  }, [scrollRef]);

  useEffect(() => {
    window.addEventListener("mouseup", stopDrag);
    return () => window.removeEventListener("mouseup", stopDrag);
  }, [stopDrag]);

  return { onMouseDown, onMouseMove, onMouseUp: stopDrag };
}

function MagnifierToggleButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur-sm transition-colors ${
        active
          ? "bg-amber-600 text-white hover:bg-amber-700"
          : "bg-background/90 text-foreground hover:bg-background border border-border/50"
      }`}
      title={active ? t("documentPreview.magnifierDeactivate") : t("documentPreview.magnifierActivate")}
    >
      <Search className="h-3.5 w-3.5" />
      {active ? t("documentPreview.magnifierOff") : t("documentPreview.magnifier")}
    </button>
  );
}

function MagnifierToolbar({
  zoom,
  onZoomChange,
  size,
  onSizeChange,
  onToggle,
  onEnter,
  onLeave,
}: {
  zoom: number;
  onZoomChange: (v: number) => void;
  size: number;
  onSizeChange: (v: number) => void;
  onToggle: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center gap-2 rounded-xl bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg px-2.5 py-1.5"
      style={{ cursor: "default" }}
      data-magnifier-toolbar
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0"
      >
        <Search className="h-3 w-3" />
        {t("documentPreview.off")}
      </button>

      <div className="w-px h-3.5 bg-border" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() =>
            onZoomChange(Math.max(MAGNIFIER_MIN_ZOOM, zoom - MAGNIFIER_ZOOM_STEP))
          }
          disabled={zoom <= MAGNIFIER_MIN_ZOOM}
          className="p-0.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
          title={t("documentPreview.zoomDecrease")}
        >
          <Minus className="h-3 w-3" />
        </button>
        <Slider
          min={MAGNIFIER_MIN_ZOOM}
          max={MAGNIFIER_MAX_ZOOM}
          step={MAGNIFIER_ZOOM_STEP}
          value={[zoom]}
          onValueChange={([v]) => onZoomChange(v)}
          className="w-16"
        />
        <button
          type="button"
          onClick={() =>
            onZoomChange(Math.min(MAGNIFIER_MAX_ZOOM, zoom + MAGNIFIER_ZOOM_STEP))
          }
          disabled={zoom >= MAGNIFIER_MAX_ZOOM}
          className="p-0.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
          title={t("documentPreview.zoomIncrease")}
        >
          <Plus className="h-3 w-3" />
        </button>
        <span className="text-[10px] tabular-nums font-medium min-w-[26px] text-center text-muted-foreground">
          {zoom.toFixed(1)}×
        </span>
      </div>

      <div className="w-px h-3.5 bg-border" />

      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{t("documentPreview.size")}</span>
        <Slider
          min={MAGNIFIER_MIN_SIZE}
          max={MAGNIFIER_MAX_SIZE}
          step={10}
          value={[size]}
          onValueChange={([v]) => onSizeChange(v)}
          className="w-14"
        />
        <span className="text-[10px] tabular-nums font-medium min-w-[24px] text-center text-muted-foreground">
          {Math.round((size / MAGNIFIER_MAX_SIZE) * 100)}%
        </span>
      </div>
    </div>
  );
}

function MagnifierLens({
  pos,
  zoom,
  size,
  magnifierSrc,
  contentRect,
  positionOffset,
}: {
  pos: { x: number; y: number };
  zoom: number;
  size: number;
  magnifierSrc: string;
  contentRect: DOMRect;
  positionOffset?: { x: number; y: number };
}) {
  const bgPosX = (pos.x / contentRect.width) * 100;
  const bgPosY = (pos.y / contentRect.height) * 100;
  const ox = positionOffset?.x ?? 0;
  const oy = positionOffset?.y ?? 0;

  return (
    <div
      className="pointer-events-none absolute z-40 rounded-2xl border-2 border-amber-500/80 shadow-xl"
      style={{
        width: size,
        height: size,
        left: ox + pos.x - size / 2,
        top: oy + pos.y - size / 2,
        backgroundImage: `url(${magnifierSrc})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${contentRect.width * zoom}px ${contentRect.height * zoom}px`,
        backgroundPosition: `${bgPosX}% ${bgPosY}%`,
        boxShadow:
          "0 0 0 3px rgba(180,83,9,0.15), 0 8px 32px rgba(0,0,0,0.25)",
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-px h-3 bg-amber-500/50 absolute" />
        <div className="h-px w-3 bg-amber-500/50 absolute" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export function DocumentPreview({
  src,
  alt,
  className = "",
  hidePageNav = false,
  hideZoom = false,
  ...props
}: DocumentPreviewProps) {
  const { t } = useTranslation();
  const resolvedAlt = alt ?? t("documentPreview.documentAlt");
  const isPdf = src.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return (
      <ImageWithFallback
        src={src}
        alt={resolvedAlt}
        className={className}
        hideZoom={hideZoom}
        data-testid={props["data-testid"]}
      />
    );
  }

  return (
    <PdfViewer
      src={src}
      className={className}
      hidePageNav={hidePageNav}
      hideZoom={hideZoom}
      data-testid={props["data-testid"]}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Image with error fallback + magnifier                              */
/* ------------------------------------------------------------------ */

function ImageWithFallback({
  src,
  alt,
  className = "",
  hideZoom = false,
  ...props
}: {
  src: string;
  alt?: string;
  className?: string;
  hideZoom?: boolean;
  "data-testid"?: string;
}) {
  const { t } = useTranslation();
  const resolvedAlt = alt ?? t("documentPreview.documentAlt");
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(1.0);
  const imgRef = useRef<HTMLImageElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);
  const mag = useMagnifier(imgRef);
  const drag = useDragToPan(scrollRef, !mag.active);

  useEffect(() => {
    if (!scrollRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries)
        setContainerWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, []);

  const zoomIn = useCallback(() => setScale((s) => Math.min(MAX_ZOOM, s + ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(MIN_ZOOM, s - ZOOM_STEP)), []);
  const resetZoom = useCallback(() => setScale(1.0), []);

  const imgOffset = useCallback((): { x: number; y: number } => {
    if (!imgRef.current || !outerRef.current) return { x: 0, y: 0 };
    const ir = imgRef.current.getBoundingClientRect();
    const or2 = outerRef.current.getBoundingClientRect();
    return { x: ir.left - or2.left, y: ir.top - or2.top };
  }, []);

  if (error) {
    return (
      <div
        className={`w-full min-h-[300px] flex flex-col items-center justify-center gap-3 bg-muted rounded-md p-6 ${className}`}
        data-testid={props["data-testid"]}
      >
        <ImageOff className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">
          {t("documentPreview.imageUnavailable")}
        </p>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          {t("documentPreview.imageLoadFailed")}
        </p>
      </div>
    );
  }

  const contentRect = imgRef.current?.getBoundingClientRect();

  return (
    <div data-testid={props["data-testid"]}>
      <div className="flex items-center justify-between mb-1.5 min-h-[32px]">
        {!hideZoom ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={scale <= MIN_ZOOM}
              onClick={zoomOut}
              aria-label={t("documentPreview.zoomOut")}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <button
              className="text-xs tabular-nums min-w-[48px] text-center hover:underline cursor-pointer bg-transparent border-0"
              onClick={resetZoom}
              title={t("documentPreview.zoomReset")}
            >
              {Math.round(scale * 100)}%
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={scale >= MAX_ZOOM}
              onClick={zoomIn}
              aria-label={t("documentPreview.zoomIn")}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={resetZoom}
              aria-label={t("documentPreview.zoomReset")}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div />
        )}

        {mag.active ? (
          <MagnifierToolbar
            zoom={mag.zoom}
            onZoomChange={mag.setZoom}
            size={mag.size}
            onSizeChange={mag.setSize}
            onToggle={mag.toggle}
            onEnter={() => mag.setOverToolbar(true)}
            onLeave={() => mag.setOverToolbar(false)}
          />
        ) : (
          <MagnifierToggleButton active={false} onToggle={mag.toggle} />
        )}
      </div>

      <div
        ref={outerRef}
        className="relative rounded-xl overflow-visible"
        onPointerDown={mag.handlePointerDown}
        onPointerMove={mag.handlePointerMove}
        onPointerUp={mag.handlePointerUp}
        onPointerLeave={mag.handlePointerLeave}
        onPointerCancel={mag.handlePointerCancel}
        onWheel={mag.active ? mag.handleWheel : undefined}
        style={{
          cursor: mag.active ? "none" : undefined,
        }}
      >
        <div
          ref={scrollRef}
          className="overflow-auto bg-muted/30 rounded-xl"
          onMouseDown={drag.onMouseDown}
          onMouseMove={drag.onMouseMove}
          onMouseUp={drag.onMouseUp}
          style={{
            maxHeight: "600px",
            scrollbarGutter: "stable",
            ...(!mag.active && scale > 1 ? { cursor: "grab" } : {}),
            ...(mag.active ? { touchAction: "none" } : {}),
          } as React.CSSProperties}
        >
          <img
            ref={imgRef}
            src={src}
            alt={resolvedAlt}
            className={`rounded-xl ${className}`}
            style={{
              ...(scale <= 1 ? {
                width: "100%",
                maxHeight: "600px",
                objectFit: "contain" as const,
              } : {
                width: containerWidth ? `${Math.round(containerWidth * scale)}px` : `${scale * 100}%`,
                maxWidth: "none",
                maxHeight: "none",
              }),
              ...(mag.active ? {
                touchAction: "none",
                userSelect: "none",
                WebkitTouchCallout: "none",
                WebkitUserSelect: "none",
              } : {}),
            } as React.CSSProperties}
            draggable={false}
            onError={() => setError(true)}
          />
        </div>

        {mag.active &&
          mag.show &&
          contentRect &&
          contentRect.width > 0 && (
            <MagnifierLens
              pos={mag.pos}
              zoom={mag.zoom}
              size={mag.size}
              magnifierSrc={src}
              contentRect={contentRect}
              positionOffset={imgOffset()}
            />
          )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PDF Viewer with magnifier                                          */
/* ------------------------------------------------------------------ */

interface PdfViewerProps {
  src: string;
  className?: string;
  hidePageNav?: boolean;
  hideZoom?: boolean;
  "data-testid"?: string;
}

function PdfViewer({
  src,
  className = "",
  hidePageNav = false,
  hideZoom = false,
  ...props
}: PdfViewerProps) {
  const { t } = useTranslation();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(
    undefined,
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasSnapshot, setCanvasSnapshot] = useState<string | null>(null);
  const pdfOuterRef = useRef<HTMLDivElement | null>(null);
  const mag = useMagnifier(canvasRef as React.RefObject<HTMLElement | null>);
  const drag = useDragToPan(containerRef, !mag.active);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries)
        setContainerWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      setNumPages(total);
      setCurrentPage(1);
      setIsLoading(false);
      setLoadError(false);
    },
    [],
  );

  const onDocumentLoadError = useCallback(() => {
    setLoadError(true);
    setIsLoading(false);
  }, []);

  const onPageRenderSuccess = useCallback(() => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (canvas) {
      canvasRef.current = canvas as HTMLCanvasElement;
      try {
        setCanvasSnapshot(canvas.toDataURL("image/jpeg", 0.85));
      } catch {
        setCanvasSnapshot(null);
      }
    }
  }, []);

  useEffect(() => {
    setCanvasSnapshot(null);
  }, [currentPage, scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (mag.active) {
      canvas.style.touchAction = "none";
      canvas.style.userSelect = "none";
      canvas.style.setProperty("-webkit-touch-callout", "none");
      canvas.style.setProperty("-webkit-user-select", "none");
    } else {
      canvas.style.touchAction = "";
      canvas.style.userSelect = "";
      canvas.style.removeProperty("-webkit-touch-callout");
      canvas.style.removeProperty("-webkit-user-select");
    }
  }, [mag.active]);

  const goToPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNext = () =>
    setCurrentPage((p) => Math.min(numPages ?? p, p + 1));

  const zoomIn = () => setScale((s) => Math.min(MAX_ZOOM, s + ZOOM_STEP));
  const zoomOut = () => setScale((s) => Math.max(MIN_ZOOM, s - ZOOM_STEP));
  const resetZoom = () => setScale(1.0);

  const pageWidth = containerWidth
    ? Math.min(containerWidth - 2, 800) * scale
    : undefined;

  const getCanvasOffset = useCallback((): { x: number; y: number } => {
    if (!canvasRef.current || !pdfOuterRef.current) return { x: 0, y: 0 };
    const cr = canvasRef.current.getBoundingClientRect();
    const or = pdfOuterRef.current.getBoundingClientRect();
    return {
      x: cr.left - or.left,
      y: cr.top - or.top,
    };
  }, []);

  if (loadError) {
    return (
      <div
        className={`w-full min-h-[400px] flex flex-col items-center justify-center gap-3 bg-muted rounded-md p-6 ${className}`}
        data-testid={props["data-testid"]}
      >
        <FileText className="h-16 w-16 text-red-500" />
        <p className="text-sm font-medium text-muted-foreground">
          {t("documentPreview.pdfLoadFailed")}
        </p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline hover:no-underline"
        >
          {t("documentPreview.pdfOpenNewTab")}
        </a>
      </div>
    );
  }

  const canvasRect = canvasRef.current?.getBoundingClientRect();
  const canvasOffset = getCanvasOffset();

  const mergePdfRefs = useCallback(
    (el: HTMLDivElement | null) => {
      pdfOuterRef.current = el;
    },
    [],
  );

  return (
    <div data-testid={props["data-testid"]}>
      {!isLoading && (
        <div className="flex justify-end mb-1.5 min-h-[32px] items-center">
          {mag.active ? (
            <MagnifierToolbar
              zoom={mag.zoom}
              onZoomChange={mag.setZoom}
              size={mag.size}
              onSizeChange={mag.setSize}
              onToggle={mag.toggle}
              onEnter={() => mag.setOverToolbar(true)}
              onLeave={() => mag.setOverToolbar(false)}
            />
          ) : (
            <MagnifierToggleButton active={false} onToggle={mag.toggle} />
          )}
        </div>
      )}

      <div
        ref={mergePdfRefs}
        className={`flex flex-col relative rounded-xl overflow-visible ${className}`}
        onPointerDown={mag.handlePointerDown}
        onPointerMove={mag.handlePointerMove}
        onPointerUp={mag.handlePointerUp}
        onPointerLeave={mag.handlePointerLeave}
        onPointerCancel={mag.handlePointerCancel}
        onWheel={mag.active ? mag.handleWheel : undefined}
        style={{
          cursor: mag.active ? "none" : undefined,
        }}
      >
        {/* Toolbar */}
      {!isLoading && numPages && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/50 border-b text-sm rounded-t-xl">
          {!hidePageNav && numPages > 1 ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage <= 1}
                onClick={goToPrev}
                aria-label={t("documentPreview.prevPage")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs tabular-nums min-w-[80px] text-center">
                {currentPage} / {numPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage >= numPages}
                onClick={goToNext}
                aria-label={t("documentPreview.nextPage")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {t("documentPreview.pageCount", { count: numPages })}
              </span>
            </div>
          )}

          {!hideZoom && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={scale <= MIN_ZOOM}
                onClick={zoomOut}
                aria-label={t("documentPreview.zoomOut")}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <button
                className="text-xs tabular-nums min-w-[48px] text-center hover:underline cursor-pointer bg-transparent border-0"
                onClick={resetZoom}
                title={t("documentPreview.zoomReset")}
              >
                {Math.round(scale * 100)}%
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={scale >= MAX_ZOOM}
                onClick={zoomIn}
                aria-label={t("documentPreview.zoomIn")}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={resetZoom}
                aria-label={t("documentPreview.zoomReset")}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* PDF Canvas */}
      <div
        ref={containerRef}
        className="relative overflow-auto bg-muted/30 rounded-b-xl"
        onMouseDown={drag.onMouseDown}
        onMouseMove={drag.onMouseMove}
        onMouseUp={drag.onMouseUp}
        style={{
          maxHeight: "600px",
          scrollbarGutter: "stable",
          ...(!mag.active && scale > 1 ? { cursor: "grab" } : {}),
          touchAction: mag.active ? "none" : undefined,
        } as React.CSSProperties}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">
                {t("documentPreview.pdfLoading")}
              </span>
            </div>
          </div>
        )}

        <Document
          file={src}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="flex justify-center py-2 min-w-full w-max"
        >
          <Page
            pageNumber={currentPage}
            width={pageWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-sm"
            loading={null}
            onRenderSuccess={onPageRenderSuccess}
          />
        </Document>
      </div>

      {mag.active &&
        mag.show &&
        canvasSnapshot &&
        canvasRect &&
        canvasRect.width > 0 && (
          <MagnifierLens
            pos={mag.pos}
            zoom={mag.zoom}
            size={mag.size}
            magnifierSrc={canvasSnapshot}
            contentRect={canvasRect}
            positionOffset={canvasOffset}
          />
        )}
      </div>
    </div>
  );
}
