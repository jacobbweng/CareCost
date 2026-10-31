import { afterEach, describe, expect, it, vi } from 'vitest';
import { MEDICARE_PART_B_DEDUCTIBLE, MEDICARE_VISIT, PRIVATE_TO_MEDICARE } from '../data/benchmarks';
import { DEFAULT_ASSUMPTIONS, NEW_PROFILE, PLAN_BY_ID } from '../data/plans';
import { computeTrueCost } from './cost';
import { estimateMedical } from './insurance';
import type { NearbyPlace } from './location';
import { matchProviders } from './matching';
import { geocodeZip, placeToProvider, roadDistances } from './realProviders';
import type { Profile } from './types';

const place: NearbyPlace = {
  id: 'node/42',
  name: 'Real Clinic',
  lat: 33.96,
  lng: -83.99,
  miles: 1.2,
  kind: 'Clinic',
  specialties: [],
  specialtyMatch: null,
  wheelchair: 'yes',
  wheelchairToilet: 'unknown',
  osmUrl: 'https://www.openstreetmap.org/node/42',
  phone: '+1 770 555 0100',
};
const profile: Profile = { ...NEW_PROFILE, specialty: 'neurology', location: { lat: 33.9562, lng: -83.988, label: 'Lawrenceville, GA' } };

afterEach(() => vi.unstubAllGlobals());

describe('real clinics → providers', () => {
  it('uses the 2026 Medicare benchmark and URL-safe ids', () => {
    const p = placeToProvider(place, 'neurology', { miles: 2.4, minutes: 7 });
    expect(p.id).toBe('node-42');
    expect(p.allowedAmount).toBe(MEDICARE_VISIT.neurology.amount);
    expect(p.selfPayPrice).toBe(Math.round(MEDICARE_VISIT.neurology.amount * PRIVATE_TO_MEDICARE));
    expect(p.access.step_free_entrance).toEqual({ status: 'yes', source: 'community' });
    expect(p.access.accessible_exam_room).toBeUndefined(); // unknown stays unknown
  });
  it('prices by payer: Medicare deductible, private ×1.43', () => {
    const p = placeToProvider(place, 'neurology', null);
    const medicare = estimateMedical(p, { ...profile, planId: 'medicare', insurance: { method: 'deductible_coinsurance', copay: null, deductibleRemaining: MEDICARE_PART_B_DEDUCTIBLE, coinsurancePct: 20, oopRemaining: null } }, PLAN_BY_ID.medicare);
    expect(medicare.amount).toBe(177.36); // whole visit falls under the $283 deductible
    const met = estimateMedical(p, { ...profile, planId: 'medicare', insurance: { method: 'deductible_coinsurance', copay: null, deductibleRemaining: 0, coinsurancePct: 20, oopRemaining: null } }, PLAN_BY_ID.medicare);
    expect(met.amount).toBeCloseTo(35.47, 2); // 20% of 177.36
    const priv = estimateMedical(p, { ...profile, planId: 'private', insurance: { method: 'deductible_coinsurance', copay: null, deductibleRemaining: 0, coinsurancePct: 20, oopRemaining: null } }, PLAN_BY_ID.private);
    expect(priv.amount).toBeCloseTo(177.36 * 1.43 * 0.2, 1);
  });
  it('uses real road miles when available, otherwise straight-line × factor', () => {
    const withRoad = computeTrueCost(placeToProvider(place, 'neurology', { miles: 3.3, minutes: 9 }), { ...profile, transport: 'own_vehicle' }, PLAN_BY_ID['self-pay'], DEFAULT_ASSUMPTIONS);
    expect(withRoad.distanceMiles).toBe(3.3);
    expect(withRoad.transportation).toBeCloseTo(3.3 * 2 * DEFAULT_ASSUMPTIONS.vehiclePerMile, 2);
    const noRoad = computeTrueCost(placeToProvider(place, 'neurology', null), { ...profile, transport: 'own_vehicle' }, PLAN_BY_ID['self-pay'], DEFAULT_ASSUMPTIONS);
    expect(noRoad.distanceMiles).toBeGreaterThan(0);
  });
  it('matching treats community-mapped entrances as known and exam rooms as unknown', () => {
    const p = placeToProvider(place, 'neurology', { miles: 2, minutes: 5 });
    const s = matchProviders({ ...profile, needs: { step_free_entrance: 'essential' } }, [p], DEFAULT_ASSUMPTIONS);
    expect(s.meets).toHaveLength(1);
    expect(s.meets[0].cautions.some((c) => c.includes('OpenStreetMap'))).toBe(true);
    const s2 = matchProviders({ ...profile, needs: { step_free_entrance: 'essential', accessible_exam_room: 'essential' } }, [p], DEFAULT_ASSUMPTIONS);
    expect(s2.needsVerification).toHaveLength(1);
  });
});

describe('network helpers (mocked)', () => {
  it('looks up a ZIP code', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ places: [{ 'place name': 'Lawrenceville', 'state abbreviation': 'GA', latitude: '33.95', longitude: '-83.99' }] })));
    await expect(geocodeZip('30046')).resolves.toMatchObject({ label: 'Lawrenceville, GA', zip: '30046', lat: 33.95 });
  });
  it('rejects bad ZIPs with a plain message', async () => {
    await expect(geocodeZip('123')).rejects.toThrow('5-digit');
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 404 }));
    await expect(geocodeZip('00000')).rejects.toThrow('couldn’t find');
  });
  it('reads OSRM road distances and falls back to null on failure', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ code: 'Ok', distances: [[0, 3218.68, null]], durations: [[0, 420, null]] })));
    const r = await roadDistances({ lat: 0, lng: 0 }, [{ lat: 0, lng: 0.01 }, { lat: 0, lng: 0.02 }]);
    expect(r[0]).toEqual({ miles: 2, minutes: 7 });
    expect(r[1]).toBeNull();
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline');
    });
    expect(await roadDistances({ lat: 0, lng: 0 }, [{ lat: 0, lng: 0.01 }])).toEqual([null]);
  });
});
