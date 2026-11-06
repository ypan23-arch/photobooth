export const films = [
  { id: "warm", name: "Color 600", short: "600", color: "#c69c73", description: "Soft contrast, warm skin, a little nostalgia." },
  { id: "purple", name: "Reclaimed Purple", short: "Purple", color: "#9a72b6", description: "Inky blue shadows melting into violet and pink." },
  { id: "blue", name: "Reclaimed Blue", short: "Blue", color: "#6a94bf", description: "Deep cobalt shadows and luminous ice-blue highlights." },
  { id: "green", name: "Reclaimed Green", short: "Green", color: "#9fa968", description: "Forest shadows, olive midtones, chartreuse light." },
  { id: "yellow", name: "Duochrome Yellow", short: "Yellow", color: "#d2b547", description: "Bold black shadows with golden-yellow light." },
  { id: "mono", name: "Silver B&W", short: "B&W", color: "#9c9d99", description: "Soft silver highlights, deep blacks, fine grain." },
  { id: "original", name: "Original", short: "Original", color: "#d1c8b5", description: "Your camera’s natural color. No film treatment." },
] as const;
export type FilmId = typeof films[number]["id"];

const palettes = {
  purple: [[23, 23, 57], [103, 57, 142], [231, 170, 218]],
  blue: [[13, 30, 53], [45, 103, 163], [202, 229, 238]],
  green: [[20, 36, 30], [98, 119, 58], [219, 225, 156]],
  yellow: [[23, 24, 21], [149, 126, 30], [244, 216, 87]],
  mono: [[16, 16, 16], [126, 126, 126], [241, 241, 241]],
};

// Deterministic grain makes re-editing reversible: changing paper never changes the photo.
export function applyFilmPixels(data: Uint8ClampedArray, w: number, h: number, film: FilmId, seed = 0) {
  if (film === "original") return;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const luma = r * .299 + g * .587 + b * .114;
    const dx = x / Math.max(1, w - 1) * 2 - 1, dy = y / Math.max(1, h - 1) * 2 - 1;
    const edge = 1 - .1 * (dx * dx + dy * dy) / 2;
    let hash = Math.imul((x + y * w + seed * 101 + 1) ^ 0x45d9f3b, 0x45d9f3b);
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    const grain = (((hash ^ (hash >>> 16)) >>> 0) / 4294967295 - .5) * 9;
    if (film === "warm") {
      data[i] = ((luma + (r - luma) * .8) * .87 + 24 + grain) * edge;
      data[i + 1] = ((luma + (g - luma) * .8) * .88 + 19 + grain) * edge;
      data[i + 2] = ((luma + (b - luma) * .8) * .81 + 22 + grain) * edge;
    } else {
      const palette = palettes[film];
      const t = Math.pow(luma / 255, .94) * 2;
      const a = t < 1 ? palette[0] : palette[1];
      const b = t < 1 ? palette[1] : palette[2];
      const mix = t < 1 ? t : t - 1;
      for (let c = 0; c < 3; c++) data[i + c] = (a[c] + (b[c] - a[c]) * mix + grain) * edge;
    }
  }
}

export function renderFilm(source: CanvasImageSource, film: FilmId, seed = 0, size = 800) {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not render film");
  ctx.drawImage(source, 0, 0, size, size);
  const image = ctx.getImageData(0, 0, size, size);
  applyFilmPixels(image.data, size, size, film, seed);
  ctx.putImageData(image, 0, 0);
  return canvas;
}
