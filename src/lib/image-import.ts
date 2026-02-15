/**
 * Utilities for importing images and PDFs into the reference layer.
 * Handles: raster images (png/jpg/etc.), PDFs (first page), and clipboard blobs.
 */
import * as pdfjsLib from 'pdfjs-dist';
import type { ReferenceImageState } from './types';

// ─── PDF.js worker setup ───────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const GRID_PITCH = 25.4;

// ─── PDF rendering ─────────────────────────────────────────────

/**
 * Render the first page of a PDF file to a PNG data-URL.
 * @param file  The PDF File / Blob
 * @param scale Render scale (higher = crisper). Default 3×.
 */
export async function renderPdfToDataUrl(
  file: File | Blob,
  scale = 3,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  await page.render({ canvasContext: ctx, viewport }).promise;

  const dataUrl = canvas.toDataURL('image/png');
  return { dataUrl, width: viewport.width, height: viewport.height };
}

// ─── Image file loading ────────────────────────────────────────

/**
 * Read a raster-image File/Blob and return its data-URL + natural dimensions.
 */
export function loadImageFile(
  file: File | Blob,
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () =>
        resolve({
          dataUrl: reader.result as string,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ─── Unified entry point ───────────────────────────────────────

/**
 * Process any supported file (image or PDF) into a ReferenceImageState
 * ready to be placed on the canvas.
 */
export async function processFileToReferenceImage(
  file: File | Blob,
  rows: number,
  cols: number,
): Promise<ReferenceImageState> {
  const isPdf =
    file.type === 'application/pdf' ||
    (file instanceof File && file.name.toLowerCase().endsWith('.pdf'));

  const { dataUrl, width, height } = isPdf
    ? await renderPdfToDataUrl(file)
    : await loadImageFile(file);

  return createReferenceImage(dataUrl, width, height, rows, cols);
}

/**
 * Build a default ReferenceImageState from raw data.
 */
export function createReferenceImage(
  src: string,
  naturalWidth: number,
  naturalHeight: number,
  rows: number,
  cols: number,
): ReferenceImageState {
  const boardW = cols * GRID_PITCH;
  const boardH = rows * GRID_PITCH;
  const initialScale = Math.min(boardW / naturalWidth, boardH / naturalHeight);

  // Place the image next to the board (right + below) with a small gap
  // so it doesn't sit directly under the PCB and is easy to grab.
  const gap = GRID_PITCH * 2; // 2-hole gap
  const initialX = boardW + gap;
  const initialY = boardH + gap;

  return {
    id: `ref-img-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    src,
    x: initialX,
    y: initialY,
    naturalWidth,
    naturalHeight,
    scale: initialScale,
    opacity: 1.0, // Fully opaque by default
    inverted: false,
    onTop: false,
    visible: true,
  };
}
