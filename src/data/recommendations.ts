import type { Ticket } from '../types';

export interface Recommendation {
  id: string;
  service: string;       // display name
  serviceId: string;     // matches Service.id in config/serviceMenu
  reason: string;        // e.g. "32,000 miles since the last Transmission Flush (at 83,400 mi)"
  interval: number;      // miles
}

interface RecommendationRule {
  serviceId: string;
  serviceName: string;
  interval: number;
}

const recommendationRules: RecommendationRule[] = [
  {
    serviceId: 'fluid-transmission',
    serviceName: 'Transmission Flush',
    interval: 30000,
  },
  {
    serviceId: 'fluid-coolant',
    serviceName: 'Coolant Flush',
    interval: 30000,
  },
  {
    serviceId: 'addon-cabin',
    serviceName: 'Cabin Air Filter',
    interval: 15000,
  },
  {
    serviceId: 'addon-air',
    serviceName: 'Air Filter',
    interval: 15000,
  },
];

/** A past visit, as far as recommendations care. */
export type VisitRecord = Pick<Ticket, 'mileage' | 'lines'>;

// Imported history may only have the service name, so match on either.
const visitIncludes = (visit: VisitRecord, rule: RecommendationRule) =>
  visit.lines.some((line) => line.id === rule.serviceId || line.name === rule.serviceName);

/**
 * Recommend a service when it's due: at least 85% of its interval since the
 * last time *that service* was done here. If it has never been done here, count
 * from the vehicle's first visit — we know it hasn't been done here since then.
 * With no history at all there's nothing to go on, so nothing is recommended.
 */
export function getRecommendations(currentMileage: number, history: VisitRecord[]): Recommendation[] {
  if (history.length === 0) return [];

  const firstVisitMileage = Math.min(...history.map((v) => v.mileage));
  const recommendations: Recommendation[] = [];

  for (const rule of recommendationRules) {
    const done = history.filter((v) => visitIncludes(v, rule));
    const lastDoneAt = done.length > 0 ? Math.max(...done.map((v) => v.mileage)) : null;
    const since = currentMileage - (lastDoneAt ?? firstVisitMileage);

    if (since < rule.interval * 0.85) continue;

    const miles = since.toLocaleString();
    const every = `recommended every ${rule.interval.toLocaleString()} mi`;
    recommendations.push({
      id: `rec-${rule.serviceId}`,
      service: rule.serviceName,
      serviceId: rule.serviceId,
      reason:
        lastDoneAt !== null
          ? `${miles} miles since the last ${rule.serviceName} (at ${lastDoneAt.toLocaleString()} mi) — ${every}`
          : `No ${rule.serviceName} on record here in ${miles} miles of visits — ${every}`,
      interval: rule.interval,
    });
  }

  return recommendations;
}
