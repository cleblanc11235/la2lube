/**
 * Single source of truth for public marketing copy and owner playbooks.
 * Replace placeholders with your real NAP, GBP links, and story before launch.
 */
export const SHOP = {
  name: 'LA 2 Oil & Lube',
  tagline: 'Honest oil changes in 15 minutes. No upsells. No appointments. No nonsense.',
  city: 'Farmerville',
  parish: 'Union Parish',
  region: 'North Louisiana',
  phoneDisplay: '(318) 608-5331',
  phoneTel: 'tel:+13186085331',
  smsTel: 'sms:+13186085331',
  addressLine: '1040 Sterlington Hwy',
  state: 'LA',
  zip: '71241',
  fullAddress: '1040 Sterlington Hwy, Farmerville, LA 71241',
  hours: {
    weekdays: 'Mon–Fri: 8:00 AM – 5:00 PM',
    saturday: 'Sat: 8:00 AM – 12:00 PM',
    sunday: 'Sun: Closed',
  },
  /** Replace with your real Google review URL from Business Profile */
  googleReviewUrl: 'https://www.google.com/maps/search/?api=1&query=LA+2+Oil+%26+Lube+Farmerville+LA',
  /** Replace with "Share" link from Google Maps for your business */
  googleMapsDirectionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=1040+Sterlington+Hwy%2C+Farmerville%2C+LA+71241',
  ownerNames: 'Barry Hayes and the crew',
  yearsInBusiness: 12,
  ownerStory:
    "We're not a franchise — we're your neighbors. Barry is here most days because your trust matters more than a corporate script. We hire from the parish and treat your vehicle like we'd treat our own.",
  certifications: ['ASE-certified technicians', 'Major-brand oils'],
  oilBrands: ['Pennzoil', 'Castrol', 'Shell Rotella (diesel)'],
  ourPromise: [
    'No surprise charges — we confirm prices before work starts.',
    'Honest recommendations only — if you don\'t need it, we say so.',
    'Fast bay service — most oil changes in about 15 minutes.',
  ],
  bundledValue: [
    'Multi-point fluid level check & top-off (as needed)',
    'Tire pressure check',
    'Complimentary cold water in the waiting area',
  ],
  lagniappeClub:
    'Lagniappe Club: buy 5 oil changes, get $10 off the 6th — ask at the counter for a punch card.',
  speedPromise: 'Most oil changes in about 15 minutes',
  metaDescription:
    'Independent oil change in Farmerville, Union Parish — honest service, clear prices, no upsells. No appointment needed. Call (318) 608-5331.',
  /** Optional: Facebook page URL when you create one */
  facebookUrl: '' as string | undefined,
} as const;
