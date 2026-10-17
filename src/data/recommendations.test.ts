import { describe, it, expect } from 'vitest';
import { getRecommendations, type Recommendation, type VisitRecord } from './recommendations';
import { testServices } from '../test/fixtures';

/** A past visit at `mileage` that included the given service ids. */
const visit = (mileage: number, ...serviceIds: string[]): VisitRecord => ({
  mileage,
  lines: serviceIds.map((id) => testServices.find((s) => s.id === id)!),
});

const ids = (recs: Recommendation[]) => recs.map((r) => r.serviceId);

describe('getRecommendations', () => {
  describe('Threshold detection (single prior visit, nothing done yet)', () => {
    it('returns empty array when miles since the first visit are below all thresholds', () => {
      // 12,000 miles is below 12,750 (85% of 15,000)
      expect(getRecommendations(62000, [visit(50000, 'oil-synthetic')])).toEqual([]);
    });

    it('returns recommendations when exactly at threshold', () => {
      // 12,750 miles is exactly 85% of 15,000 (threshold for cabin and air filters)
      const result = getRecommendations(62750, [visit(50000, 'oil-synthetic')]);
      expect(ids(result)).toEqual(['addon-cabin', 'addon-air']);
    });

    it('returns all 4 recommendations when miles exceed all thresholds', () => {
      // 25,500 miles is 85% of 30,000 (threshold for transmission and coolant)
      const result = getRecommendations(75500, [visit(50000, 'oil-synthetic')]);
      expect(ids(result)).toEqual(['fluid-transmission', 'fluid-coolant', 'addon-cabin', 'addon-air']);
    });

    it('30,000 mile services do not trigger below 25,500 miles', () => {
      const result = getRecommendations(75499, [visit(50000)]);
      expect(ids(result)).toEqual(['addon-cabin', 'addon-air']);
    });
  });

  describe('Measures from the last time each service was done', () => {
    it('flags a frequent visitor whose transmission flush is overdue', () => {
      // Oil changes every 5,000 mi; the flush was 30,000 mi ago. Counting from
      // the last visit (5,000 mi) would never catch this.
      const history = [
        visit(50000, 'oil-synthetic', 'fluid-transmission', 'fluid-coolant', 'addon-air', 'addon-cabin'),
        visit(55000, 'oil-synthetic'),
        visit(60000, 'oil-synthetic'),
        visit(65000, 'oil-synthetic'),
        visit(70000, 'oil-synthetic'),
        visit(75000, 'oil-synthetic', 'addon-air', 'addon-cabin'),
      ];
      const result = getRecommendations(80000, history);
      expect(ids(result)).toEqual(['fluid-transmission', 'fluid-coolant']);
      expect(result[0].reason).toBe(
        '30,000 miles since the last Transmission Flush (at 50,000 mi) — recommended every 30,000 mi'
      );
    });

    it('does not recommend something done recently, even if the first visit was long ago', () => {
      const history = [visit(20000, 'oil-synthetic'), visit(70000, 'oil-synthetic', 'addon-air')];
      const result = getRecommendations(75000, history);
      expect(ids(result)).not.toContain('addon-air');
      expect(ids(result)).toContain('addon-cabin'); // never done here, 55,000 mi of visits
    });

    it('explains when a service has never been done here', () => {
      const result = getRecommendations(75500, [visit(50000)]);
      expect(result.find((r) => r.serviceId === 'fluid-coolant')?.reason).toBe(
        'No Coolant Flush on record here in 25,500 miles of visits — recommended every 30,000 mi'
      );
    });

    it('matches imported history by service name when there is no service id', () => {
      const imported: VisitRecord = {
        mileage: 70000,
        lines: [{ id: '', name: 'Air Filter', price: 0, category: 'addon' }],
      };
      const result = getRecommendations(80000, [visit(40000), imported]);
      expect(ids(result)).not.toContain('addon-air');
    });

    it('uses the most recent time a service was done when it appears more than once', () => {
      const history = [visit(10000, 'addon-cabin'), visit(30000, 'addon-cabin')];
      const result = getRecommendations(40000, history);
      expect(ids(result)).not.toContain('addon-cabin'); // 10,000 since the last one
    });
  });

  describe('Real-world scenario', () => {
    it('high-mileage Civic: triggers all 4 recommendations', () => {
      // Flushes at 83,400, cabin filter at 98,700, never an air filter; now at 124,200.
      const history = [
        visit(83400, 'oil-highmileage', 'fluid-transmission', 'fluid-coolant'),
        visit(98700, 'oil-highmileage', 'addon-cabin'),
      ];
      const result = getRecommendations(124200, history);
      expect(ids(result)).toEqual(['fluid-transmission', 'fluid-coolant', 'addon-cabin', 'addon-air']);
    });
  });

  describe('Edge cases', () => {
    it('recommends nothing with no history to go on', () => {
      expect(getRecommendations(150000, [])).toEqual([]);
    });

    it('returns empty array when current mileage equals the only visit', () => {
      expect(getRecommendations(50000, [visit(50000)])).toEqual([]);
    });

    it('returns empty array when mileage is below the last visit (typo)', () => {
      expect(getRecommendations(5000, [visit(50000)])).toEqual([]);
    });
  });

  describe('Return value shape', () => {
    it('returns objects with correct structure and types', () => {
      const result = getRecommendations(75500, [visit(50000)]);
      const firstRec: Recommendation = result[0];

      expect(firstRec.id).toMatch(/^rec-/);
      expect(typeof firstRec.service).toBe('string');
      expect(typeof firstRec.serviceId).toBe('string');
      expect(firstRec.reason).toContain('recommended every');
      expect([15000, 30000]).toContain(firstRec.interval);
    });

    it('each recommendation has a unique id', () => {
      const result = getRecommendations(75500, [visit(50000)]);
      expect(new Set(result.map((r) => r.id)).size).toBe(result.length);
    });
  });
});
