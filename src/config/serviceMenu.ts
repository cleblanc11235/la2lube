import type { Service } from '../types';

/**
 * The shop's oil change menu, matching how it's rung up in DataLube: pick the
 * oil, pick the weight, and any quarts over the included 5 are an extra line
 * ("EO") at a per-quart price. `code` is the DataLube item code, shown on the
 * buttons so the counter can ring the same thing in both systems.
 */
export interface OilGrade {
  weight: string;   // "5W-30"
  code: string;     // DataLube code
}

export interface OilType {
  id: string;
  name: string;
  code: string;            // DataLube code for the oil change itself
  basePrice: number;       // includes the first INCLUDED_QUARTS
  extraQuartPrice: number;
  extraQuartCode: string;  // DataLube code for extra quarts
  grades: OilGrade[];
}

export const INCLUDED_QUARTS = 5;

export const oilTypes: OilType[] = [
  {
    id: 'oil-blend',
    name: 'Synthetic Blend',
    code: '1',
    basePrice: 66.99,
    extraQuartPrice: 9.89,
    extraQuartCode: 'EO CON',
    grades: [
      { weight: '5W-20', code: '6' },
      { weight: '5W-30', code: '7' },
      { weight: '10W-30', code: '15' },
    ],
  },
  {
    id: 'oil-synthetic',
    name: 'Full Synthetic',
    code: '3',
    basePrice: 95.99,
    extraQuartPrice: 10.55,
    extraQuartCode: 'EO SYN',
    grades: [
      { weight: '0W-16', code: '16' },
      { weight: '0W-20', code: '8' },
      { weight: '5W-20', code: '17' },
      { weight: '5W-30', code: '9' },
    ],
  },
  {
    id: 'oil-mobil1',
    name: 'Mobil 1',
    code: 'MOB1',
    basePrice: 88.38,
    extraQuartPrice: 13.48,
    extraQuartCode: 'EO MOB',
    grades: [
      { weight: '0W-8', code: '21' },
      { weight: '0W-16', code: '16' },
      { weight: '0W-20', code: '8' },
      { weight: '0W-30', code: '0w30' },
      { weight: '0W-40', code: '40' },
      { weight: '5W-20', code: '17' },
      { weight: '5W-30', code: '9' },
    ],
  },
];

/** The ticket lines for one oil change: the oil itself, plus an extra-quarts line when over 5 qt. */
export function oilChangeLines(oil: OilType, weight: string | undefined, quarts: number): Service[] {
  const lines: Service[] = [
    {
      id: oil.id,
      name: weight ? `${oil.name} ${weight}` : oil.name,
      price: oil.basePrice,
      category: 'oilchange',
      oilWeight: weight,
      quarts,
    },
  ];
  const extra = quarts - INCLUDED_QUARTS;
  if (extra > 0) {
    lines.push({
      id: `${oil.id}-extra`,
      name: `Extra oil ${extra} qt × $${oil.extraQuartPrice.toFixed(2)} (${oil.extraQuartCode})`,
      price: Math.round(extra * oil.extraQuartPrice * 100) / 100,
      category: 'oilchange',
    });
  }
  return lines;
}

/**
 * Other services with fixed prices. Empty while the trial focuses on oil
 * changes; anything else is rung up as an "Other item" on the Services screen.
 */
export const serviceMenu: Service[] = [];
