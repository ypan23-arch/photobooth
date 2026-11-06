"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { films, FilmId, renderFilm, applyFilmPixels } from "./film";
import { composeStrip, papers, PaperId } from "./paper";

type Mode = "camera" | "shooting" | "result";
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export default function Home() {
  const video = useRef<HTMLVideoElement>(null);
  const liveCanvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const alive = useRef(true);
  const busy = useRef(false);
  const request = useRef(0);
  const date = useRef<Date | null>(null);
  const [format, setFormat] = useState<1 | 4>(1);
  const [film, setFilm] = useState<FilmId>("warm");
  const [editor, setEditor] = useState<"film" | "paper">("film");
  const [showInstall, setShowInstall] = useState(false);
  const [demo, setDemo] = useState(false);
  const [mode, setMode] = useState<Mode>("camera");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [shot, setShot] = useState(0);
  const [flash, setFlash] = useState(false);
  const [photos, setPhotos] = useState<HTMLCanvasElement[]>([]);
  const [paper, setPaper] = useState<PaperId>("classic");
  const [strip, setStrip] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const selected = papers.find(p => p.id === paper)!;
  const selectedFilm = films.find(f => f.id === film)!;

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    const id = ++request.current;
    setError("");
    stop();
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("secure");
      const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1440 } } });
      if (!alive.current || id !== request.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      media.getVideoTracks()[0].onended = () => { setReady(false); setError("Your camera disconnected. Reconnect it, then try again."); };
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play();
        if (alive.current && id === request.current) setReady(video.current.videoWidth > 0);
      }
    } catch (e) {
      if (!alive.current || id !== request.current) return;
      const name = e instanceof Error ? e.name : "";
      setError(e instanceof Error && e.message === "secure"
        ? "Camera access needs a secure connection. Use localhost on this computer, or an HTTPS address on your phone."
        : name === "NotAllowedError"
          ? "Allow camera access to get started. On iPhone, open Safari’s page menu → Website Settings → Camera → Allow. On a computer, allow Camera in the address bar’s site settings, then try again."
          : name === "NotFoundError" ? "No camera found. Connect a camera, then try again."
          : "We couldn’t open your camera. Check your permissions and close any other apps using it, then try again.");
    }
  }, [stop]);

  useEffect(() => {
    alive.current = true;
    start();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => { alive.current = false; request.current++; stream.current?.getTracks().forEach(t => t.stop()); };
  }, [start]);

  useEffect(() => {
    if (!photos.length || !date.current) return;
    let cancelled = false;
    let objectUrl = "";
    setFile(null);
    setNotice("");
    try {
      const canvas = composeStrip(photos.map((p, i) => renderFilm(p, film, i)), paper, date.current);
      canvas.toBlob(blob => {
        if (cancelled) return;
        if (!blob) { setNotice("Couldn’t prepare your print. Change paper or film to try again."); return; }
        objectUrl = URL.createObjectURL(blob);
        setStrip(objectUrl);
        setFile(new File([blob], "little-instant-" + film + "-" + paper + "-" + date.current!.getTime() + ".png", { type: "image/png" }));
      }, "image/png");
    } catch { setNotice("Couldn’t prepare your print. Choose another paper to try again."); }
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photos, paper, film]);

  function selectPaper(id: PaperId) {
    if (saving || mode === "shooting") return;
    if (id !== paper) { setFile(null); setPaper(id); }
  }

  async function takePhotos() {
    if (!ready || busy.current) return;
    busy.current = true;
    setDemo(false); setMode("shooting"); setNotice(""); setPhotos([]); setStrip(""); setFile(null);
    date.current = new Date();
    const captures: HTMLCanvasElement[] = [];
    try {
      for (let i = 0; i < format; i++) {
        setShot(i);
        for (let n = 3; n > 0; n--) { if (!alive.current) return; setCount(n); await wait(1000); }
        if (!alive.current) return;
        setCount(null);
        const v = video.current;
        if (!v || v.readyState < 2 || !stream.current?.active) throw new Error("Camera interrupted");
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 800;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        const side = Math.min(v.videoWidth, v.videoHeight);
        ctx.translate(800, 0); ctx.scale(-1, 1);
        ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, 800, 800);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        captures.push(canvas);
        setFlash(true); setShot(i + 1); await wait(150); setFlash(false); await wait(350);
      }
      if (!alive.current) return;
      setPhotos(captures); setMode("result"); stop();
    } catch { setError("Your camera was interrupted. Try opening it again."); setMode("camera"); stop(); }
    finally { busy.current = false; setCount(null); setFlash(false); }
  }

  async function save() {
    if (!file || saving) return;
    setSaving(true); setNotice("");
    try {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
      if (mobile && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "A little instant" });
      else {
        const a = document.createElement("a"); a.href = strip; a.download = file.name; a.click();
        setNotice(mobile ? "If the image opens, touch and hold it to save to Photos." : "Your print has been downloaded.");
      }
    } catch (e) { if (!(e instanceof Error && e.name === "AbortError")) setNotice("Sharing didn’t open. Try again, or touch and hold the print to save it."); }
    finally { setSaving(false); }
  }

  // The live view uses the same pixel pipeline as exported prints, at a smaller resolution.
  useEffect(() => {
    if (!ready || mode === "result") return;
    let frame = 0, previous = 0;
    const draw = (time: number) => {
      if (time - previous > 100) {
        previous = time;
        const v = video.current, c = liveCanvas.current;
        if (v && c && v.readyState >= 2) {
          const ctx = c.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            const side = Math.min(v.videoWidth, v.videoHeight);
            ctx.setTransform(-1, 0, 0, 1, 320, 0);
            ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, 320, 320);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            const image = ctx.getImageData(0, 0, 320, 320);
            applyFilmPixels(image.data, 320, 320, film);
            ctx.putImageData(image, 0, 0);
          }
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [ready, mode, film]);

  // A clearly labelled, local sample lets people explore film without camera permission.
  function trySample() {
    if (busy.current) return;
    stop(); request.current++;
    const captures: HTMLCanvasElement[] = [];
    for (let i = 0; i < format; i++) {
      const c = document.createElement("canvas"); c.width = c.height = 800;
      const ctx = c.getContext("2d")!;
      const sky = ctx.createLinearGradient(0, 0, 0, 800);
      sky.addColorStop(0, "#b6cad1"); sky.addColorStop(.65, "#e2c9b0"); sky.addColorStop(1, "#9f9d7e");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 800, 800);
      ctx.fillStyle = "#eee0b6"; ctx.beginPath(); ctx.arc(565 - i * 30, 245, 84, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#738a7b"; ctx.beginPath(); ctx.moveTo(0, 520); ctx.bezierCurveTo(220, 300 + i * 20, 390, 710, 800, 390); ctx.lineTo(800, 800); ctx.lineTo(0, 800); ctx.fill();
      ctx.fillStyle = "#3d6255"; ctx.beginPath(); ctx.moveTo(0, 650); ctx.bezierCurveTo(310, 410, 510, 690 - i * 30, 800, 575); ctx.lineTo(800, 800); ctx.lineTo(0, 800); ctx.fill();
      captures.push(c);
    }
    date.current = new Date(); setDemo(true); setFile(null); setStrip(""); setPhotos(captures); setMode("result");
  }

  function retake() {
    setMode("camera"); setShot(0); setNotice(""); setPhotos([]); setStrip(""); setFile(null); setDemo(false); start();
  }

  return <main className={"app " + (mode === "result" ? "result" : "")}>
    <header><span className="brand">little instant<span aria-hidden="true">✳</span></span><button className="install-button" aria-label="How to install this app" onClick={() => setShowInstall(true)}>↗ <span>Get the app</span></button></header>
    <section className="format-row" aria-label="Capture format">
      {mode === "result" ? <><button className="back" onClick={retake} disabled={saving}>‹ Camera</button><span className="format-caption">{demo ? "SAMPLE PRINT" : format === 1 ? "YOUR INSTANT" : "YOUR FOUR MOMENTS"}</span><span className="saved-locally">ON DEVICE</span></> : <><div className="segments" role="group" aria-label="Choose capture format">{([1,4] as const).map(n => <button key={n} disabled={mode === "shooting"} aria-pressed={format === n} onClick={() => {setFormat(n); setShot(0);}}>{n === 1 ? "Single" : "4-shot strip"}</button>)}</div><span className="format-caption">{format === 1 ? "ONE MOMENT. KEEP IT." : "FOUR FRAMES. ONE STORY."}</span></>}
    </section>

    <section className="stage" aria-label={mode === "result" ? "Your finished print" : "Camera preview"}>
      {mode !== "result" ? <div className={"instant-live paper-" + paper} style={{backgroundColor:selected.color, color:selected.ink}}>
        <div className="viewfinder">
          <video ref={video} autoPlay muted playsInline aria-label="Front camera" className="source-video" />
          <canvas ref={liveCanvas} width={320} height={320} className="live-canvas" aria-label={selectedFilm.name + " live preview"} />
          {!ready && <div className="camera-message"><span className="camera-icon">◎</span><h1>{error ? "Let’s get you in frame." : "A little patience."}</h1><p>{error || "Opening your camera…"}</p>{error && <button onClick={start}>Enable camera ↗</button>}</div>}
          <div className="countdown" role="status" aria-live="assertive">{count !== null && <span key={shot + ":" + count}>{count}</span>}</div>
          {mode === "shooting" && <span className="shot-progress">{Math.min(shot + 1, format)} / {format}</span>}
        </div><div className="paper-signature">a little moment</div>
      </div> : <div className={"print-holder " + (format === 4 ? "is-strip" : "")} aria-busy={!file}>{strip ? <img className="print" src={strip} alt={(demo ? "Sample artwork" : format === 1 ? "Your single instant photo" : "Your four photo strip") + " on " + selected.name + " paper with " + selectedFilm.name + " film"} /> : <p>Developing your moment…</p>}</div>}
      <span className="stage-note">{mode === "result" ? "MAKE IT YOURS. CHANGE THE FILM OR PAPER BELOW." : "A SMALL MOMENT, MADE TANGIBLE."}</span>
    </section>

    <section className="editor" aria-label="Customize your print">
      <div className="editor-heading"><div className="editor-tabs" role="group" aria-label="Editing tools"><button aria-pressed={editor === "film"} onClick={() => setEditor("film")}>Film</button><button aria-pressed={editor === "paper"} onClick={() => setEditor("paper")}>Paper</button></div><span className="selection-name">{editor === "film" ? selectedFilm.name : selected.name}</span></div>
      {editor === "film" ? <div className="choices" role="group" aria-label="Choose film filter">{films.map(f => <button key={f.id} aria-label={f.name + " filter"} aria-pressed={film === f.id} disabled={mode === "shooting" || saving} onClick={() => {if (f.id !== film) {setFile(null); setFilm(f.id);}}} className={"choice " + (film === f.id ? "active" : "")}><span className={"film-sample film-" + f.id} style={{backgroundColor:f.color}}><i /><b /></span><span>{f.short}</span></button>)}</div> : <div className="choices paper-choices" role="group" aria-label="Choose paper style">{papers.map(p => <button key={p.id} aria-label={p.name + " paper"} aria-pressed={paper === p.id} disabled={mode === "shooting" || saving} onClick={() => selectPaper(p.id)} className={"choice " + (paper === p.id ? "active" : "")}><span className={"paper-sample paper-" + p.id} style={{backgroundColor:p.color}}><i /></span><span>{p.name}</span></button>)}</div>}
      <p className="editor-description">{editor === "film" ? selectedFilm.description : selected.detail}</p>
    </section>

    <section className="dock">
      {mode !== "result" ? <><div className="capture-row"><button className="sample-button" disabled={mode === "shooting"} onClick={trySample}><span>▧</span>Try sample</button><button className="shutter" aria-label={format === 1 ? "Take single photo" : "Take four photos"} onClick={takePhotos} disabled={!ready || mode === "shooting"}><span /></button><span className="timer"><b>3s</b>SELF-TIMER</span></div><p role="status">{mode === "shooting" ? "Hold that feeling. " + Math.min(shot + 1, format) + " of " + format + "." : "Point. Pause. Keep forever."}</p></> : <><div className="result-actions"><button className="retake" disabled={saving} onClick={retake}>↻ Retake</button><button className="save" disabled={!file || saving} onClick={save}>{saving ? "Opening…" : file ? "Save print ↗" : "Developing…"}</button></div><p role="status">{notice || (demo ? "Sample artwork · try every film and paper." : "On iPhone, choose Save Image in the share sheet.")}</p></>}
    </section>
    <div className={flash ? "flash active" : "flash"} aria-hidden="true" />
    {showInstall && <div className="modal-backdrop" onClick={() => setShowInstall(false)}><section className="install-sheet" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={e => e.stopPropagation()}><button autoFocus className="close" onClick={() => setShowInstall(false)} aria-label="Close install instructions">×</button><span className="brand">little instant ✳</span><h2 id="install-title">A camera in your pocket.</h2><p>Install Little Instant on your home screen for a full-screen experience.</p><h3>iPhone / iPad</h3><p>Open this page in Safari → Share → Add to Home Screen → Open as Web App → Add.</p><h3>Android</h3><p>Open in Chrome → Menu → Add to home screen or Install app.</p><p className="install-footnote">Camera access needs HTTPS on your phone. All photos stay on your device. Film looks are digital interpretations inspired by experimental instant film.</p><button className="save" onClick={() => setShowInstall(false)}>Got it</button></section></div>}
  </main>;
}
