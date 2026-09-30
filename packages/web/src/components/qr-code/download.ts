/** Browser helpers to save an SVG string as a file, or as a PNG. Shared by QrCode and Barcode. */

export function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}

export function downloadSvg(svg: string, filename: string) {
  downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), filename);
}

/** Turns any CSS colour, including `var(--nq-brand)`, into a concrete `rgb(...)` string using the context element's cascade. */
export function resolveColor(value: string, context?: Element | null): string {
  if (typeof document === "undefined" || !/var\(|color-mix|oklch|oklab|light-dark|currentcolor|^[a-z]+$/i.test(value)) return value;
  const probe = document.createElement("span");
  probe.style.color = value;
  probe.style.display = "none";
  (context ?? document.body).appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved || value;
}

/** Fetches an image and returns it as a data: URI so it can travel inside an exported SVG. Returns the input on failure. */
export async function toDataUri(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return src;
  }
}

/** Rasterises an SVG string to a PNG blob, `px` wide, on a canvas. */
export function svgToPng(svg: string, px: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalHeight && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
      const canvas = document.createElement("canvas");
      canvas.width = px;
      canvas.height = Math.max(1, Math.round(px * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png failed"))), "image/png");
    };
    img.onerror = () => reject(new Error("svg failed to load"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export async function downloadPng(svg: string, filename: string, px = 1024) {
  downloadBlob(await svgToPng(svg, px), filename);
}
