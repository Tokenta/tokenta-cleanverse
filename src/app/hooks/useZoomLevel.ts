import { useCallback, useEffect, useState } from "react";

export type ZoomBucket = "50" | "75" | "100" | "125" | "150" | "200" | "below" | "above";

export function readBrowserZoom(): number {
  if (typeof window === "undefined") return 1;
  const vv = window.visualViewport;
  if (vv?.scale && vv.scale > 0) return vv.scale;
  return 1;
}

export function scaleToBucket(scale: number): ZoomBucket {
  if (scale < 0.5) return "below";
  if (scale < 0.63) return "50";
  if (scale < 0.88) return "75";
  if (scale < 1.12) return "100";
  if (scale < 1.38) return "125";
  if (scale < 1.62) return "150";
  if (scale <= 2.05) return "200";
  return "above";
}

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function useZoomLevel() {
  const [scale, setScale] = useState(readBrowserZoom);
  const [bucket, setBucket] = useState<ZoomBucket>(() => scaleToBucket(readBrowserZoom()));

  const refresh = useCallback(() => {
    const s = readBrowserZoom();
    setScale(s);
    setBucket(scaleToBucket(s));
  }, []);

  useEffect(() => {
    const onChange = debounce(refresh, 150);
    refresh();
    window.visualViewport?.addEventListener("resize", onChange);
    window.visualViewport?.addEventListener("scroll", onChange);
    window.addEventListener("resize", onChange);
    return () => {
      window.visualViewport?.removeEventListener("resize", onChange);
      window.visualViewport?.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, [refresh]);

  const isExtreme = bucket === "below" || bucket === "above";

  return { scale, bucket, isExtreme, refresh };
}
