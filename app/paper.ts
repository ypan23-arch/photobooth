export const papers = [
  { id: "classic", name: "Classic", color: "#f9f7f0", ink: "#515048", detail: "The original off-white border." },
  { id: "ink", name: "Ink", color: "#282a29", ink: "#e8e6de", detail: "Deep charcoal. A gallery favorite." },
  { id: "rose", name: "Rose", color: "#e8ceca", ink: "#795a57", detail: "A soft, dusty pink." },
  { id: "sage", name: "Sage", color: "#c9d1c1", ink: "#53604e", detail: "Muted green, naturally calm." },
  { id: "grid", name: "Grid", color: "#eeeadf", ink: "#666454", detail: "Fine lines on warm sketchbook paper." },
  { id: "spectrum", name: "Spectrum", color: "#f9f7f0", ink: "#515048", detail: "A little color, along the edges." },
] as const;
export type PaperId = typeof papers[number]["id"];
export const printSize = { w: 800, h: 800, border: 48, gap: 48, footer: 194 };

export function composeStrip(photos: HTMLCanvasElement[], paperId: PaperId, date: Date) {
  const paper = papers.find(p => p.id === paperId)!;
  const { w, h, border, gap, footer } = printSize;
  const canvas = document.createElement("canvas");
  canvas.width = w + border * 2;
  canvas.height = h * photos.length + gap * Math.max(0, photos.length - 1) + border * 2 + footer;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create print");
  ctx.fillStyle = paper.color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (paperId === "grid") {
    ctx.strokeStyle = "#c8c4b655";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += 24) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y = 0; y < canvas.height; y += 24) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();
  }
  if (paperId === "spectrum") {
    const colors = ["#be594b", "#d68e53", "#d7b562", "#8d9f80", "#6d8b9a"];
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(17 + i * 6, 0, 6, canvas.height);
    });
  }
  photos.forEach((photo, i) => ctx.drawImage(photo, border, border + i * (h + gap), w, h));
  ctx.fillStyle = paper.ink;
  ctx.textAlign = "center";
  ctx.font = "italic 30px Georgia, serif";
  ctx.fillText("little instant", canvas.width / 2, canvas.height - 110);
  ctx.font = "17px monospace";
  ctx.fillText(date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase(), canvas.width / 2, canvas.height - 68);
  return canvas;
}
