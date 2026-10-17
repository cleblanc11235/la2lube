import type { Service } from '../types';
import { NEXT_SERVICE_MILES } from '../config/shopSettings';

/** Oil type and next-service mileage for the windshield sticker. */
export function stickerInfo(lines: Service[], mileage: number) {
  const oil = lines.find((s) => s.category === 'oilchange' && !s.id.endsWith('-extra'));
  return { oilType: oil?.name ?? '', nextServiceMileage: mileage + NEXT_SERVICE_MILES };
}
