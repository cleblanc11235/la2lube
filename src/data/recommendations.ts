export interface Recommendation {
  id: string;
  service: string;       // display name
  serviceId: string;     // matches Service.id in mockData
  reason: string;        // e.g. "32,000 miles since last service"
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

export function getRecommendations(
  currentMileage: number,
  lastServiceMileage: number
): Recommendation[] {
  const milesSinceLastService = currentMileage - lastServiceMileage;
  const recommendations: Recommendation[] = [];

  for (const rule of recommendationRules) {
    const threshold = rule.interval * 0.85;

    // Recommend if enough miles have passed since the last service
    // Recommendations are based on mileage intervals, not previous service history
    if (milesSinceLastService >= threshold) {
      recommendations.push({
        id: `rec-${rule.serviceId}`,
        service: rule.serviceName,
        serviceId: rule.serviceId,
        reason: `${milesSinceLastService.toLocaleString()} miles since last service — recommended every ${rule.interval.toLocaleString()} mi`,
        interval: rule.interval,
      });
    }
  }

  return recommendations;
}
