import type Tesseract from 'tesseract.js';

// Reads text out of a photo of a license plate, entirely in the browser.
// No server and no API key: the OCR engine (Tesseract, compiled to WebAssembly)
// is downloaded on first use and cached by the browser after that.

// Photos from a modern iPhone are 12 megapixels. OCR gets slower and *less*
// accurate on huge images, and iOS Safari will kill the tab if we are careless
// with memory, so shrink to something plate characters are still easy to read in.
const MAX_SIDE = 1800;

const WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

let workerPromise: Promise<Tesseract.Worker> | null = null;

function getWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const mod = await import('tesseract.js');
      const createWorker = mod.createWorker ?? mod.default.createWorker;
      // OEM 1 = LSTM only: smaller download and more accurate than the legacy engine.
      const worker = await createWorker('eng', 1);
      await worker.setParameters({
        // Sparse text: "find words anywhere in the picture" — a plate photo is a
        // scene, not a page, and it also contains bumper, frame and stickers.
        tessedit_pageseg_mode: '11' as Tesseract.PSM,
        tessedit_char_whitelist: WHITELIST,
      });
      return worker;
    })();
    // A failed download (no signal in the lot) should be retryable.
    workerPromise.catch(() => {
      workerPromise = null;
    });
  }
  return workerPromise;
}

/** Start downloading the OCR engine so it is ready by the time the photo is taken. */
export function warmUpPlateScanner(): void {
  getWorker().catch(() => {
    /* surfaced when the scan itself runs */
  });
}

async function photoToCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Grayscale + stretch contrast so dull, glare-washed photos read better. */
function enhance(canvas: HTMLCanvasElement, invert: boolean): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  const gray = new Uint8ClampedArray(px.length / 4);
  const histogram = new Array<number>(256).fill(0);

  for (let i = 0, g = 0; i < px.length; i += 4, g++) {
    const v = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    gray[g] = v;
    histogram[v]++;
  }

  // Ignore the darkest/brightest 2% so one specular glint doesn't flatten everything.
  const clip = gray.length * 0.02;
  let lo = 0;
  let hi = 255;
  for (let acc = 0; lo < 255; lo++) {
    acc += histogram[lo];
    if (acc > clip) break;
  }
  for (let acc = 0; hi > 0; hi--) {
    acc += histogram[hi];
    if (acc > clip) break;
  }
  const range = Math.max(1, hi - lo);

  for (let i = 0, g = 0; i < px.length; i += 4, g++) {
    let v = Math.min(255, Math.max(0, ((gray[g] - lo) * 255) / range));
    if (invert) v = 255 - v;
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/**
 * OCR a photo and return the raw text found in it.
 *
 * `isGoodEnough` lets the caller stop early: if the first pass already
 * produced something usable (e.g. a plate that is on file) we skip the second,
 * inverted pass, which exists for light-on-dark plates.
 */
export async function scanPlatePhoto(
  file: File,
  isGoodEnough: (text: string) => boolean = () => false
): Promise<string> {
  const [worker, canvas] = await Promise.all([getWorker(), photoToCanvas(file)]);

  const first = await worker.recognize(enhance(canvas, false));
  let text = first.data.text;
  if (isGoodEnough(text)) return text;

  // enhance() works in place, so re-draw from the (already grayscale) pixels.
  const second = await worker.recognize(enhance(canvas, true));
  text += '\n' + second.data.text;
  return text;
}
