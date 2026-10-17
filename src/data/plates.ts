import type { Customer, Vehicle } from '../types';

export interface PlateMatch {
  customer: Customer;
  vehicle: Vehicle;
  /** Edit distance between the (confusable-folded) query and this vehicle's plate. */
  distance: number;
}

export interface PlateMatches {
  /** Plates that read identically, ignoring spaces, dashes and look-alike characters. */
  exact: PlateMatch[];
  /** Plates that differ by a single character — "did you mean?" suggestions. */
  near: PlateMatch[];
}

/** "lsu 4477" -> "LSU4477". Strips everything that is not a letter or digit. */
export function normalizePlate(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Characters OCR (and tired eyes) routinely swap. Folding both sides to one
// canonical character means "L5U 44T7"-style misreads still line up.
const LOOK_ALIKES: Record<string, string> = {
  O: '0',
  Q: '0',
  D: '0',
  I: '1',
  L: '1',
  Z: '2',
  S: '5',
  G: '6',
  B: '8',
};

export function foldPlate(text: string): string {
  return normalizePlate(text)
    .split('')
    .map((ch) => LOOK_ALIKES[ch] ?? ch)
    .join('');
}

/** Levenshtein distance. Plates are < 10 chars so the simple version is plenty. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

// Too short to fuzzy-match: with 3-4 characters, one wrong letter is a
// different plate, not a misread.
const MIN_FUZZY_LENGTH = 5;

/** Find vehicles whose plate matches `query`, exactly or within one character. */
export function findPlateMatches(query: string, customers: Customer[]): PlateMatches {
  const folded = foldPlate(query);
  const result: PlateMatches = { exact: [], near: [] };
  if (folded.length < MIN_FUZZY_LENGTH) return result;

  for (const customer of customers) {
    for (const vehicle of customer.vehicles) {
      const plate = foldPlate(vehicle.plate);
      if (!plate) continue;
      const distance = editDistance(folded, plate);
      if (distance === 0) result.exact.push({ customer, vehicle, distance });
      else if (distance === 1) result.near.push({ customer, vehicle, distance });
    }
  }
  return result;
}

/**
 * Pull plausible plate strings out of raw OCR output, best guess first.
 *
 * A photo of a plate also contains "LOUISIANA", slogans, dealer frames and
 * registration stickers, so we only keep alphanumeric runs of 5-8 characters
 * (US plates), preferring ones that mix letters and digits. Neighbouring
 * pieces are joined too, because OCR often splits "LSU 4477" into two words.
 */
export function extractPlateCandidates(ocrText: string): string[] {
  const pieces = ocrText
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  const seen = new Set<string>();
  const scored: { plate: string; score: number }[] = [];

  const consider = (plate: string) => {
    if (plate.length < 5 || plate.length > 8 || seen.has(plate)) return;
    seen.add(plate);
    const hasLetter = /[A-Z]/.test(plate);
    const hasDigit = /[0-9]/.test(plate);
    // Mixed letter+digit strings are by far the most plate-like.
    let score = hasLetter && hasDigit ? 10 : 4;
    // 6-7 characters is the common US plate length.
    if (plate.length === 6 || plate.length === 7) score += 2;
    // A purely alphabetic 8-letter run is almost always a word ("SPORTSMAN").
    if (!hasDigit && plate.length >= 8) score -= 3;
    scored.push({ plate, score });
  };

  for (let i = 0; i < pieces.length; i++) {
    consider(pieces[i]);
    if (i + 1 < pieces.length) consider(pieces[i] + pieces[i + 1]);
    if (i + 2 < pieces.length) consider(pieces[i] + pieces[i + 1] + pieces[i + 2]);
  }

  // Stable sort keeps reading order within the same score.
  return scored.sort((a, b) => b.score - a.score).map((s) => s.plate);
}

/**
 * Of everything OCR produced, which known plate (if any) is it looking at?
 * Checks candidates first, then the whole blob of text, since the plate may
 * be buried in noise. Returns the matches for the first thing that hits.
 */
export function matchScannedText(
  ocrText: string,
  customers: Customer[]
): { plate: string; matches: PlateMatches } | null {
  const candidates = extractPlateCandidates(ocrText);

  for (const plate of candidates) {
    const matches = findPlateMatches(plate, customers);
    if (matches.exact.length > 0) return { plate, matches };
  }
  for (const plate of candidates) {
    const matches = findPlateMatches(plate, customers);
    if (matches.near.length > 0) return { plate, matches };
  }
  return null;
}
