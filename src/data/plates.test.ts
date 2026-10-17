import { testCustomers } from '../test/fixtures';
import {
  editDistance,
  extractPlateCandidates,
  findPlateMatches,
  foldPlate,
  matchScannedText,
  normalizePlate,
} from './plates';

describe('normalizePlate', () => {
  test('strips spaces, dashes and case', () => {
    expect(normalizePlate('lsu 4477')).toBe('LSU4477');
    expect(normalizePlate(' L-S-U 44.77 ')).toBe('LSU4477');
  });
});

describe('foldPlate', () => {
  test('treats look-alike characters as the same', () => {
    expect(foldPlate('LSU 4477')).toBe(foldPlate('L5U 4477'));
    expect(foldPlate('HON 2233')).toBe(foldPlate('H0N 2Z33'));
    expect(foldPlate('CAM 7890')).toBe(foldPlate('CAM 789O'));
  });

  test('does not merge genuinely different plates', () => {
    expect(foldPlate('LSU 4477')).not.toBe(foldPlate('LSU 4478'));
  });
});

describe('editDistance', () => {
  test('counts single edits', () => {
    expect(editDistance('LSU4477', 'LSU4477')).toBe(0);
    expect(editDistance('LSU4477', 'LSU4478')).toBe(1);
    expect(editDistance('LSU4477', 'LSU447')).toBe(1);
    expect(editDistance('LSU4477', 'LSUX4477')).toBe(1);
    expect(editDistance('LSU4477', 'RED1122')).toBeGreaterThan(1);
  });
});

describe('findPlateMatches', () => {
  test('finds an exact plate regardless of spacing and case', () => {
    const { exact, near } = findPlateMatches('lsu4477', testCustomers);
    expect(exact).toHaveLength(1);
    expect(exact[0].customer.name).toBe('Mike Johnson');
    expect(exact[0].vehicle.plate).toBe('LSU 4477');
    expect(near).toHaveLength(0);
  });

  test('forgives look-alike misreads as an exact match', () => {
    const { exact } = findPlateMatches('RED 1l22', testCustomers);
    expect(exact.map((m) => m.customer.name)).toEqual(['Sandra Lee']);
  });

  test('offers a one-character miss as a near match, not an exact one', () => {
    const { exact, near } = findPlateMatches('CAM 7899', testCustomers);
    expect(exact).toHaveLength(0);
    expect(near.map((m) => m.customer.name)).toEqual(['Robert Williams']);
  });

  test('a dropped character is still a near match', () => {
    const { near } = findPlateMatches('HON 223', testCustomers);
    expect(near.map((m) => m.customer.name)).toEqual(['Debra Fontenot']);
  });

  test('two wrong characters is a different plate', () => {
    const { exact, near } = findPlateMatches('CAM 7000', testCustomers);
    expect(exact).toHaveLength(0);
    expect(near).toHaveLength(0);
  });

  test('short fragments are never fuzzy matched', () => {
    expect(findPlateMatches('LSU', testCustomers)).toEqual({ exact: [], near: [] });
    expect(findPlateMatches('', testCustomers)).toEqual({ exact: [], near: [] });
  });
});

describe('extractPlateCandidates', () => {
  test('joins a plate that OCR split into two words', () => {
    const candidates = extractPlateCandidates('LSU\n4477');
    expect(candidates).toContain('LSU4477');
  });

  test('ranks mixed letter+digit strings above plain words', () => {
    const candidates = extractPlateCandidates('LOUISIANA\nSPORTSMAN\nLSU 4477\nPARADISE');
    expect(candidates[0]).toBe('LSU4477');
  });

  test('ignores fragments that are too short or too long to be a plate', () => {
    const candidates = extractPlateCandidates('LA\nOK\nTHEPELICANSTATE');
    expect(candidates).toEqual([]);
  });

  test('copes with empty and garbage input', () => {
    expect(extractPlateCandidates('')).toEqual([]);
    expect(extractPlateCandidates('!!! --- ...')).toEqual([]);
  });
});

describe('matchScannedText', () => {
  test('finds a known plate among noisy OCR output', () => {
    const noisy = 'LOUISIANA\n\nLSU 4477\nSPORTSMANS PARADISE\nBIG TRUCK TOYS';
    const result = matchScannedText(noisy, testCustomers);
    expect(result?.plate).toBe('LSU4477');
    expect(result?.matches.exact[0].customer.name).toBe('Mike Johnson');
  });

  test('prefers an exact hit over a near hit that appears earlier', () => {
    const result = matchScannedText('CAM 7899\nRED 1122', testCustomers);
    expect(result?.matches.exact[0].customer.name).toBe('Sandra Lee');
  });

  test('falls back to a near match', () => {
    const result = matchScannedText('LOUISIANA\nLSU 4417', testCustomers);
    expect(result?.matches.exact).toHaveLength(0);
    expect(result?.matches.near[0].customer.name).toBe('Mike Johnson');
  });

  test('returns null when nothing on file resembles the text', () => {
    expect(matchScannedText('XYZ 9981', testCustomers)).toBeNull();
  });
});
