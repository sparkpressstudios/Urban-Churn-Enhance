import { useMemo } from "react";

const BASE = import.meta.env.BASE_URL;

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  /** Image path relative to /images/, e.g. "uc-crafted-bg.jpg" */
  src: string;
  /** Set true for above-the-fold / LCP images */
  priority?: boolean;
}

/** Returns WebP path if the source is a raster image we optimize */
function getWebpSrc(src: string): string | null {
  const match = src.match(/^(.+)\.(jpe?g|png)$/i);
  if (!match) return null;
  return `${match[1]}.webp`;
}

/**
 * Renders a <picture> with WebP fallback for optimized public images.
 * Falls back to the original format when no WebP variant exists.
 */
export default function OptimizedImage({
  src,
  alt,
  priority = false,
  loading,
  fetchPriority,
  className,
  ...rest
}: OptimizedImageProps) {
  const fullSrc = src.startsWith("http") || src.startsWith("/api")
    ? src
    : `${BASE}images/${src.replace(/^images\//, "")}`;

  const webpSrc = useMemo(() => {
    if (fullSrc.startsWith("http") || fullSrc.startsWith("/api")) return null;
    const filename = src.replace(/^images\//, "");
    const webp = getWebpSrc(filename);
    return webp ? `${BASE}images/${webp}` : null;
  }, [src, fullSrc]);

  const imgProps: React.ImgHTMLAttributes<HTMLImageElement> = {
    alt: alt ?? "",
    className,
    loading: priority ? "eager" : (loading ?? "lazy"),
    fetchPriority: priority ? "high" : fetchPriority,
    decoding: priority ? "sync" : "async",
    ...rest,
  };

  if (!webpSrc) {
    return <img src={fullSrc} {...imgProps} />;
  }

  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <img src={fullSrc} {...imgProps} />
    </picture>
  );
}
