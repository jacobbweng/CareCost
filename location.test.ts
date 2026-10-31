import { describe, expect, it } from 'vitest';
import { parseAINeeds } from './ai';
import { assessPlace, milesBetween, overpassQuery, parseOverpass } from './location';

const origin = { lat: 33.9562, lng: -83.988 }; // Lawrenceville, GA (example coordinates)

const sample: Parameters<typeof parseOverpass>[0] = {
  elements: [
    { type: 'node', id: 1, lat: 33.96, lon: -83.99, tags: { amenity: 'clinic', name: 'Accessible Clinic', wheelchair: 'yes', 'toilets:wheelchair': 'yes', 'healthcare:speciality': 'neurology' } },
    { type: 'way', id: 2, center: { lat: 33.97, lon: -83.98 }, tags: { amenity: 'hospital', name: 'Stairs Hospital', wheelchair: 'no' } },
    { type: 'node', id: 3, lat: 33.95, lon: -83.97, tags: { healthcare: 'doctor', name: 'Unknown Doctor' } },
    { type: 'node', id: 4, lat: 33.95, lon: -83.97, tags: { amenity: 'doctors' } }, // no name → skipped
    { type: 'node', id: 5, lat: 33.96, lon: -83.99, tags: { amenity: 'clinic', name: 'Accessible Clinic', wheelchair: 'yes' } }, // duplicate
    { type: 'node', id: 6, lat: 33.955, lon: -83.985, tags: { amenity: 'doctors', name: 'Limited Access', wheelchair: 'limited' } },
  ],
};

describe('real location helpers', () => {
  it('computes distances in miles', () => {
    expect(milesBetween({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(69.1, 0);
  });
  it('builds an Overpass query around the user', () => {
    const q = overpassQuery(origin.lat, origin.lng, 8000);
    expect(q).toContain('around:8000,33.956200,-83.988000');
    expect(q).toContain('["amenity"="doctors"]["name"]');
    expect(q).toContain('["healthcare"="hospital"]');
  });
  it('parses OSM results, skips unnamed and duplicate places, sorts by distance', () => {
    const p = parseOverpass(sample, origin, 'neurology');
    expect(p.map((x) => x.name).sort()).toEqual(['Accessible Clinic', 'Limited Access', 'Stairs Hospital', 'Unknown Doctor']);
    expect(p.every((x, i) => i === 0 || p[i - 1].miles <= x.miles)).toBe(true);
    const clinic = p.find((x) => x.name === 'Accessible Clinic')!;
    expect(clinic.wheelchair).toBe('yes');
    expect(clinic.specialtyMatch).toBe(true);
    expect(p.find((x) => x.name === 'Stairs Hospital')!.kind).toBe('Hospital');
    expect(p.find((x) => x.name === 'Unknown Doctor')!.specialtyMatch).toBeNull();
  });
  it('applies the same hard constraints: unknown stays unknown, no means excluded', () => {
    const p = parseOverpass(sample, origin, 'neurology');
    const needs = { needs: { step_free_entrance: 'essential' as const } };
    const by = (n: string) => assessPlace(p.find((x) => x.name === n)!, needs).status;
    expect(by('Accessible Clinic')).toBe('meets');
    expect(by('Stairs Hospital')).toBe('does_not_meet');
    expect(by('Unknown Doctor')).toBe('needs_verification');
    expect(by('Limited Access')).toBe('needs_verification');
  });
  it('needs that OSM cannot describe are flagged for verification', () => {
    const p = parseOverpass(sample, origin, 'neurology');
    const a = assessPlace(p.find((x) => x.name === 'Accessible Clinic')!, { needs: { step_free_entrance: 'essential', accessible_exam_room: 'essential' } });
    expect(a.status).toBe('needs_verification');
    expect(a.missing).toEqual(['accessible_exam_room']);
  });
});

describe('AI suggestion parsing', () => {
  it('keeps only known accommodation ids and valid levels', () => {
    const out = parseAINeeds('Sure! {"needs":[{"id":"step_free_entrance","level":"essential","reason":"cannot do stairs"},{"id":"made_up","level":"essential"},{"id":"quiet_waiting","level":"whatever"}]}');
    expect(out).toEqual([
      { id: 'step_free_entrance', level: 'essential', reason: 'cannot do stairs' },
      { id: 'quiet_waiting', level: 'preferred', reason: '' },
    ]);
  });
  it('returns nothing for malformed output', () => {
    expect(parseAINeeds('not json')).toEqual([]);
  });
});
