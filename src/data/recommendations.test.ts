import { describe, it, expect } from 'vitest';
import { getRecommendations, type Recommendation } from './recommendations';

describe('getRecommendations', () => {
  describe('Threshold detection', () => {
    it('returns empty array when miles since last service is below all thresholds', () => {
      // 12,000 miles is below 12,750 (85% of 15,000)
      const result = getRecommendations(62000, 50000);
      expect(result).toEqual([]);
    });

    it('returns recommendations when exactly at threshold', () => {
      // 12,750 miles is exactly 85% of 15,000 (threshold for cabin and air filters)
      const result = getRecommendations(62750, 50000);

      expect(result.length).toBeGreaterThanOrEqual(2);

      const serviceIds = result.map((r) => r.serviceId);
      expect(serviceIds).toContain('addon-cabin');
      expect(serviceIds).toContain('addon-air');
    });

    it('returns all 4 recommendations when miles exceed all thresholds', () => {
      // 25,500 miles is 85% of 30,000 (threshold for transmission and coolant)
      // This also exceeds the 15,000 interval threshold
      const result = getRecommendations(75500, 50000);

      expect(result).toHaveLength(4);

      const serviceIds = result.map((r) => r.serviceId);
      expect(serviceIds).toContain('fluid-transmission');
      expect(serviceIds).toContain('fluid-coolant');
      expect(serviceIds).toContain('addon-cabin');
      expect(serviceIds).toContain('addon-air');
    });
  });

  describe('Real-world scenario', () => {
    it('Debra Fontenot scenario: triggers all 4 recommendations', () => {
      // From CLAUDE.md: Debra's vehicle was last serviced at 98,700 mi
      // Current mileage: 124,200 mi
      // Delta: 25,500 mi
      const result = getRecommendations(124200, 98700);

      expect(result).toHaveLength(4);

      const serviceIds = result.map((r) => r.serviceId);
      expect(serviceIds).toContain('fluid-transmission');
      expect(serviceIds).toContain('fluid-coolant');
      expect(serviceIds).toContain('addon-cabin');
      expect(serviceIds).toContain('addon-air');
    });
  });

  describe('Edge cases', () => {
    it('returns empty array when current mileage equals last service mileage', () => {
      const result = getRecommendations(50000, 50000);
      expect(result).toEqual([]);
    });

    it('returns empty array when miles delta is 1 (just serviced)', () => {
      const result = getRecommendations(50001, 50000);
      expect(result).toEqual([]);
    });
  });

  describe('Return value shape', () => {
    it('returns objects with correct structure and types', () => {
      const result = getRecommendations(75500, 50000);

      expect(result.length).toBeGreaterThan(0);

      const firstRec: Recommendation = result[0];

      expect(typeof firstRec.id).toBe('string');
      expect(typeof firstRec.service).toBe('string');
      expect(typeof firstRec.serviceId).toBe('string');
      expect(typeof firstRec.reason).toBe('string');
      expect(typeof firstRec.interval).toBe('number');

      // Verify id format
      expect(firstRec.id).toMatch(/^rec-/);

      // Verify reason includes mileage info
      expect(firstRec.reason).toContain('miles since last service');
      expect(firstRec.reason).toContain('recommended every');

      // Verify interval is one of the expected values
      expect([15000, 30000]).toContain(firstRec.interval);
    });

    it('formats mileage with thousand separators in reason', () => {
      const result = getRecommendations(75500, 50000);

      expect(result.length).toBeGreaterThan(0);

      // Should format 25,500 with comma
      const anyReason = result[0].reason;
      expect(anyReason).toContain('25,500');
    });

    it('each recommendation has a unique id', () => {
      const result = getRecommendations(75500, 50000);

      const ids = result.map((r) => r.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe('Interval-specific tests', () => {
    it('15,000 mile interval services trigger at 12,750 miles (85%)', () => {
      // Exactly at threshold for 15,000 mi services
      const result = getRecommendations(62750, 50000);

      const cabinFilter = result.find((r) => r.serviceId === 'addon-cabin');
      const airFilter = result.find((r) => r.serviceId === 'addon-air');

      expect(cabinFilter).toBeDefined();
      expect(airFilter).toBeDefined();

      expect(cabinFilter?.interval).toBe(15000);
      expect(airFilter?.interval).toBe(15000);
    });

    it('30,000 mile interval services trigger at 25,500 miles (85%)', () => {
      // Exactly at threshold for 30,000 mi services
      const result = getRecommendations(75500, 50000);

      const transmission = result.find((r) => r.serviceId === 'fluid-transmission');
      const coolant = result.find((r) => r.serviceId === 'fluid-coolant');

      expect(transmission).toBeDefined();
      expect(coolant).toBeDefined();

      expect(transmission?.interval).toBe(30000);
      expect(coolant?.interval).toBe(30000);
    });

    it('30,000 mile services do not trigger below 25,500 miles', () => {
      // 25,499 miles - just below threshold
      const result = getRecommendations(75499, 50000);

      const serviceIds = result.map((r) => r.serviceId);

      expect(serviceIds).not.toContain('fluid-transmission');
      expect(serviceIds).not.toContain('fluid-coolant');

      // But should still get the 15k interval services
      expect(serviceIds).toContain('addon-cabin');
      expect(serviceIds).toContain('addon-air');
    });
  });
});
