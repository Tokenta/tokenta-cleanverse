import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type WheelEvent,
} from "react";

const TRACK_SIZE = 8;
const THUMB_MIN = 40;
const THUMB_INSET = 2;
const SCROLL_STEP = 40;

type Orientation = "horizontal" | "vertical" | "both";

export type TokentaScrollAreaProps = {
  children: ReactNode;
  orientation?: Orientation;
  className?: string;
  viewportClassName?: string;
  positionHint?: string | null;
  ariaLabel?: string;
};

type Metrics = {
  scrollSize: number;
  clientSize: number;
  scrollPos: number;
};

function readMetrics(el: HTMLElement, horizontal: boolean): Metrics {
  if (horizontal) {
    return { scrollSize: el.scrollWidth, clientSize: el.clientWidth, scrollPos: el.scrollLeft };
  }
  return { scrollSize: el.scrollHeight, clientSize: el.clientHeight, scrollPos: el.scrollTop };
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function computeThumb(m: Metrics, trackPx: number) {
  if (trackPx <= 0 || m.scrollSize <= m.clientSize) {
    return { size: 0, offset: 0, percent: 0 };
  }
  const size = Math.max(
    THUMB_MIN,
    Math.min(trackPx - THUMB_INSET * 2, (m.clientSize / m.scrollSize) * trackPx),
  );
  const maxScroll = m.scrollSize - m.clientSize;
  const maxOffset = trackPx - size;
  const offset = maxScroll > 0 ? (m.scrollPos / maxScroll) * maxOffset : 0;
  const percent = maxScroll > 0 ? Math.round((m.scrollPos / maxScroll) * 100) : 0;
  return { size, offset, percent };
}

export function TokentaScrollArea({
  children,
  orientation = "horizontal",
  className = "",
  viewportClassName = "",
  positionHint = null,
  ariaLabel = "Scrollable content",
}: TokentaScrollAreaProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackHRef = useRef<HTMLDivElement>(null);
  const trackVRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{ axis: "x" | "y"; startPointer: number; startScroll: number } | null>(null);

  const [hMetrics, setHMetrics] = useState<Metrics>({ scrollSize: 0, clientSize: 0, scrollPos: 0 });
  const [vMetrics, setVMetrics] = useState<Metrics>({ scrollSize: 0, clientSize: 0, scrollPos: 0 });
  const [trackHWidth, setTrackHWidth] = useState(0);
  const [trackVHeight, setTrackVHeight] = useState(0);
  const [thumbHover, setThumbHover] = useState(false);
  const [thumbActive, setThumbActive] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);

  const controlId = useId();
  const showH = orientation === "horizontal" || orientation === "both";
  const showV = orientation === "vertical" || orientation === "both";
  const hOverflow = hMetrics.scrollSize > hMetrics.clientSize + 1;
  const vOverflow = vMetrics.scrollSize > vMetrics.clientSize + 1;

  const sync = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    if (showH) setHMetrics(readMetrics(el, true));
    if (showV) setVMetrics(readMetrics(el, false));
    if (trackHRef.current) setTrackHWidth(trackHRef.current.clientWidth);
    if (trackVRef.current) setTrackVHeight(trackVRef.current.clientHeight);
  }, [showH, showV]);

  const scheduleSync = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      sync();
    });
  }, [sync]);

  useLayoutEffect(() => {
    sync();
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(scheduleSync);
    ro.observe(el);
    if (trackHRef.current) ro.observe(trackHRef.current);
    if (trackVRef.current) ro.observe(trackVRef.current);
    const mo = new MutationObserver(scheduleSync);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleSync, sync]);

  const scrollToRatio = useCallback(
    (axis: "x" | "y", ratio: number, smooth: boolean) => {
      const el = viewportRef.current;
      if (!el) return;
      const m = axis === "x" ? hMetrics : vMetrics;
      const max = Math.max(0, m.scrollSize - m.clientSize);
      const target = ratio * max;
      el.scrollTo({
        left: axis === "x" ? target : el.scrollLeft,
        top: axis === "y" ? target : el.scrollTop,
        behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto",
      });
    },
    [hMetrics, vMetrics],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      const el = viewportRef.current;
      const track = drag?.axis === "x" ? trackHRef.current : trackVRef.current;
      if (!drag || !el || !track) return;
      const m = drag.axis === "x" ? hMetrics : vMetrics;
      const trackSize = drag.axis === "x" ? track.clientWidth : track.clientHeight;
      const { size } = computeThumb(m, trackSize);
      const maxThumbTravel = Math.max(1, trackSize - size);
      const maxScroll = Math.max(1, m.scrollSize - m.clientSize);
      const deltaPointer =
        (drag.axis === "x" ? e.clientX : e.clientY) - drag.startPointer;
      const scrollDelta = (deltaPointer / maxThumbTravel) * maxScroll;
      if (drag.axis === "x") el.scrollLeft = drag.startScroll + scrollDelta;
      else el.scrollTop = drag.startScroll + scrollDelta;
      scheduleSync();
    };
    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setThumbActive(false);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [hMetrics, vMetrics, scheduleSync]);

  const hThumb = computeThumb(hMetrics, trackHWidth);
  const vThumb = computeThumb(vMetrics, trackVHeight);

  const hThumbStyle: CSSProperties = {
    width: hThumb.size,
    height: TRACK_SIZE - 2,
    transform: `translateX(${hThumb.offset}px)`,
    willChange: "transform",
  };

  const vThumbStyle: CSSProperties = {
    height: vThumb.size,
    width: TRACK_SIZE - 2,
    transform: `translateY(${vThumb.offset}px)`,
    willChange: "transform",
  };

  const onTrackClick = (axis: "x" | "y", e: ReactMouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).dataset.thumb === "1") return;
    const track = axis === "x" ? trackHRef.current : trackVRef.current;
    if (!track) return;
    const m = axis === "x" ? hMetrics : vMetrics;
    const rect = track.getBoundingClientRect();
    const trackSize = axis === "x" ? rect.width : rect.height;
    const clickPos = axis === "x" ? e.clientX - rect.left : e.clientY - rect.top;
    const { size } = computeThumb(m, trackSize);
    const ratio = Math.max(0, Math.min(1, (clickPos - size / 2) / Math.max(1, trackSize - size)));
    scrollToRatio(axis === "x" ? "x" : "y", ratio, true);
  };

  const overflowX = showH ? "overflow-x-auto" : "overflow-x-hidden";
  const overflowY = showV ? "overflow-y-auto" : showH ? "overflow-y-hidden" : "overflow-y-auto";

  return (
    <div className={`tokenta-scroll-area ${className}`}>
      {positionHint && hOverflow && <div className="tokenta-scroll-area__hint">{positionHint}</div>}
      <div
        ref={viewportRef}
        id={controlId}
        className={`tokenta-scroll-area__viewport ${overflowX} ${overflowY} ${viewportClassName}`}
        onScroll={scheduleSync}
        onWheel={(e: WheelEvent<HTMLDivElement>) => {
          if (e.shiftKey && showH) {
            e.preventDefault();
            viewportRef.current!.scrollLeft += e.deltaY;
            scheduleSync();
          }
        }}
        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
          const el = viewportRef.current;
          if (!el) return;
          setKeyboardFocus(true);
          const smooth = !prefersReducedMotion();
          const hMax = Math.max(0, hMetrics.scrollSize - hMetrics.clientSize);
          if (showH) {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              el.scrollBy({ left: -SCROLL_STEP, behavior: smooth ? "smooth" : "auto" });
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              el.scrollBy({ left: SCROLL_STEP, behavior: smooth ? "smooth" : "auto" });
            } else if (e.key === "Home") {
              e.preventDefault();
              el.scrollTo({ left: 0, behavior: smooth ? "smooth" : "auto" });
            } else if (e.key === "End") {
              e.preventDefault();
              el.scrollTo({ left: hMax, behavior: smooth ? "smooth" : "auto" });
            } else if (e.key === "PageUp") {
              e.preventDefault();
              el.scrollBy({ left: -hMetrics.clientSize, behavior: smooth ? "smooth" : "auto" });
            } else if (e.key === "PageDown") {
              e.preventDefault();
              el.scrollBy({ left: hMetrics.clientSize, behavior: smooth ? "smooth" : "auto" });
            }
          }
        }}
        onBlur={() => setKeyboardFocus(false)}
        tabIndex={0}
        aria-label={ariaLabel}
      >
        {children}
      </div>

      {showH && hOverflow && (
        <div
          ref={trackHRef}
          className={`tokenta-scroll-area__track-h ${thumbActive ? "is-active" : ""}`}
          onClick={(e) => onTrackClick("x", e)}
          role="scrollbar"
          aria-controls={controlId}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={hThumb.percent}
        >
          {hMetrics.scrollPos > 1 && <div className="tokenta-scroll-area__fade tokenta-scroll-area__fade--left" aria-hidden />}
          {hMetrics.scrollPos < hMetrics.scrollSize - hMetrics.clientSize - 1 && (
            <div className="tokenta-scroll-area__fade tokenta-scroll-area__fade--right" aria-hidden />
          )}
          <div
            data-thumb="1"
            className={`tokenta-scroll-area__thumb ${thumbHover ? "is-hover" : ""} ${thumbActive ? "is-active" : ""} ${keyboardFocus ? "is-kbd-focus" : ""}`}
            style={hThumbStyle}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dragRef.current = {
                axis: "x",
                startPointer: e.clientX,
                startScroll: viewportRef.current?.scrollLeft ?? 0,
              };
              setThumbActive(true);
            }}
            onMouseEnter={() => setThumbHover(true)}
            onMouseLeave={() => setThumbHover(false)}
          />
        </div>
      )}

      {showV && vOverflow && (
        <div
          ref={trackVRef}
          className={`tokenta-scroll-area__track-v ${thumbActive ? "is-active" : ""}`}
          onClick={(e) => onTrackClick("y", e)}
          role="scrollbar"
          aria-controls={controlId}
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={vThumb.percent}
        >
          <div
            data-thumb="1"
            className={`tokenta-scroll-area__thumb ${thumbHover ? "is-hover" : ""} ${thumbActive ? "is-active" : ""}`}
            style={vThumbStyle}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dragRef.current = {
                axis: "y",
                startPointer: e.clientY,
                startScroll: viewportRef.current?.scrollTop ?? 0,
              };
              setThumbActive(true);
            }}
            onMouseEnter={() => setThumbHover(true)}
            onMouseLeave={() => setThumbHover(false)}
          />
        </div>
      )}

      {showH && showV && hOverflow && vOverflow && <div className="tokenta-scroll-area__corner" aria-hidden />}
    </div>
  );
}
