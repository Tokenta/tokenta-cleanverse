import type { ZoomBucket } from "../hooks/useZoomLevel";

export function ZoomWarningBanner({
  bucket,
  scale,
}: {
  bucket: ZoomBucket;
  scale: number;
}) {
  const pct = Math.round(scale * 100);
  const message =
    bucket === "below"
      ? `WARNING: Zoom level (${pct}%) is below the supported range. Text may be unreadable. Recommended: 50%–200%.`
      : `WARNING: Zoom level (${pct}%) may cause layout issues. Recommended range: 50%–200%.`;

  return (
    <div className="tokenta-zoom-warning" role="status">
      <span>{message}</span>
      <button
        type="button"
        onClick={() => {
          document.documentElement.style.zoom = "1";
          window.dispatchEvent(new Event("resize"));
        }}
      >
        RESET ZOOM
      </button>
    </div>
  );
}
