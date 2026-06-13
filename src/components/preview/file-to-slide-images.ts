import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// PDF.js renders in a web worker; point it at the bundled worker (Vite ?url).
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// Output canvas is the slide's 16:9 aspect, so the server/preview can full-bleed
// the result with no distortion. Content is letterboxed onto white.
const CANVAS_W = 1600;
const CANVAS_H = 900;

function blankCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  return { canvas, ctx };
}

function toJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), 'image/jpeg', 0.92);
  });
}

/** Centre a srcW×srcH source inside the 16:9 canvas, preserving aspect. */
function containedRect(srcW: number, srcH: number): { x: number; y: number; w: number; h: number } {
  const scale = Math.min(CANVAS_W / srcW, CANVAS_H / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: (CANVAS_W - w) / 2, y: (CANVAS_H - h) / 2, w, h };
}

/**
 * Convert an uploaded one-pager (PDF or image) into one 16:9 JPEG per page.
 * PDF pages are rasterized in the browser via PDF.js — the server never sees a
 * PDF, so no server-side rasterization dependency is needed.
 */
export async function fileToSlideImages(file: File): Promise<Blob[]> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  return isPdf ? pdfToImages(file) : [await imageToSlideImage(file)];
}

async function pdfToImages(file: File): Promise<Blob[]> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const blobs: Blob[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(CANVAS_W / base.width, CANVAS_H / base.height);
    const viewport = page.getViewport({ scale });

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = Math.ceil(viewport.width);
    pageCanvas.height = Math.ceil(viewport.height);
    const pageCtx = pageCanvas.getContext('2d');
    if (!pageCtx) throw new Error('Canvas 2D context unavailable');
    await page.render({ canvasContext: pageCtx, viewport, canvas: pageCanvas }).promise;

    const { canvas, ctx } = blankCanvas();
    const r = containedRect(pageCanvas.width, pageCanvas.height);
    ctx.drawImage(pageCanvas, r.x, r.y, r.w, r.h);
    blobs.push(await toJpegBlob(canvas));
  }
  return blobs;
}

async function imageToSlideImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { canvas, ctx } = blankCanvas();
  const r = containedRect(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, r.x, r.y, r.w, r.h);
  return toJpegBlob(canvas);
}
