// Real-world location features.
//
// - Device location comes from the browser's Geolocation API, only after the user
//   presses a button and the browser asks permission. It is kept on this device.
// - ZIP / city come from BigDataCloud's free client-side reverse-geocoding endpoint.
// - Nearby clinics come live from OpenStreetMap (Overpass API). OSM volunteers tag
//   wheelchair access as wheelchair=yes|limited|no; missing tags stay UNKNOWN.
// No API keys are needed. Nothing here is synthetic, so nothing is labeled as such —
// but community data is clearly marked as unverified.
import { milesBetween } from './geo';
import { checkRequirement, classify } from './matching';
import type { AccId, AccRecord, MatchStatus, NeedLevel, Profile, Provider, SpecialtyId, UserLocation } from './types';

export class LocationError extends Error {}

export function getDevicePosition(timeoutMs = 12000): Promise<{ lat: number; lng: number; accuracyM: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new LocationError('This browser can’t share your location. Enter a ZIP code instead.'));
      return;
    }
    if (!window.isSecureContext) {
      reject(new LocationError('Location only works on a secure page (https or localhost).'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: Math.round(p.coords.accuracy) }),
      (e) =>
        reject(
          new LocationError(
            e.code === e.PERMISSION_DENIED
              ? 'Location permission was declined. You can allow it in your browser’s site settings, or enter a ZIP code.'
              : e.code === e.TIMEOUT
                ? 'Finding your location took too long. Try again, or enter a ZIP code.'
                : 'Your location isn’t available right now. Enter a ZIP code instead.',
          ),
        ),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60_000 },
    );
  });
}

export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<Pick<UserLocation, 'label' | 'zip'>> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new LocationError('Couldn’t look up your area name.');
  const d = (await res.json()) as { city?: string; locality?: string; principalSubdivision?: string; postcode?: string };
  const place = d.city || d.locality || '';
  const label = [place, d.principalSubdivision].filter(Boolean).join(', ') || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  const zip = d.postcode && /^\d{5}/.test(d.postcode) ? d.postcode.slice(0, 5) : undefined;
  return { label, zip };
}

/** Full flow: device position → area name + ZIP. */
export async function locateUser(): Promise<UserLocation> {
  const pos = await getDevicePosition();
  let label = `${pos.lat.toFixed(3)}, ${pos.lng.toFixed(3)}`;
  let zip: string | undefined;
  try {
    const r = await reverseGeocode(pos.lat, pos.lng);
    label = r.label;
    zip = r.zip;
  } catch {
    /* name lookup is optional — coordinates still work */
  }
  return { lat: pos.lat, lng: pos.lng, accuracyM: pos.accuracyM, label, zip };
}

// ── Distance ──────────────────────────────────────────────

export { milesBetween } from './geo';

// ── Nearby clinics from OpenStreetMap ─────────────────────

export interface NearbyPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  miles: number;
  kind: string; // Hospital, Clinic, Doctor…
  address?: string;
  phone?: string;
  website?: string;
  hours?: string;
  specialties: string[];
  specialtyMatch: boolean | null; // null = not tagged
  wheelchair: 'yes' | 'limited' | 'no' | 'unknown';
  wheelchairToilet: 'yes' | 'no' | 'unknown';
  osmUrl: string;
}

const SPECIALTY_TAGS: Record<SpecialtyId, string[]> = {
  neurology: ['neurology', 'neurosurgery', 'neuro'],
  orthopedics: ['orthopaedics', 'orthopedics', 'orthopaedic', 'orthopedic', 'trauma'],
  pmr: ['physical_medicine_and_rehabilitation', 'rehabilitation', 'physiatry', 'physiotherapy'],
  primary_care: ['general', 'family_medicine', 'general_practice', 'internal', 'internal_medicine', 'primary_care'],
};

export function overpassQuery(lat: number, lng: number, radiusM: number) {
  const around = `(around:${Math.round(radiusM)},${lat.toFixed(6)},${lng.toFixed(6)})`;
  return `[out:json][timeout:25];(nwr["amenity"~"^(doctors|clinic|hospital)$"]${around};nwr["healthcare"~"^(doctor|clinic|hospital|centre|rehabilitation)$"]${around};);out center tags 120;`;
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const KIND: Record<string, string> = { hospital: 'Hospital', clinic: 'Clinic', doctors: 'Doctor’s office', doctor: 'Doctor’s office', centre: 'Health centre', rehabilitation: 'Rehabilitation' };

export type OverpassJson = { elements?: OverpassElement[] };
export function parseOverpass(json: OverpassJson, origin: { lat: number; lng: number }, specialty: SpecialtyId): NearbyPlace[] {
  const seen = new Set<string>();
  const out: NearbyPlace[] = [];
  for (const el of json.elements ?? []) {
    const t = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat === undefined || lng === undefined || !t.name) continue;
    const key = `${t.name.toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const specialties = (t['healthcare:speciality'] ?? t['healthcare:specialty'] ?? '')
      .split(';')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const wanted = SPECIALTY_TAGS[specialty];
    const w = t.wheelchair;
    const wt = t['toilets:wheelchair'];
    const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
    out.push({
      id: `${el.type}/${el.id}`,
      name: t.name,
      lat,
      lng,
      miles: Math.round(milesBetween(origin, { lat, lng }) * 10) / 10,
      kind: KIND[t.amenity ?? ''] ?? KIND[t.healthcare ?? ''] ?? 'Healthcare',
      address: [street, t['addr:city']].filter(Boolean).join(', ') || undefined,
      phone: t.phone ?? t['contact:phone'],
      website: t.website ?? t['contact:website'],
      hours: t.opening_hours,
      specialties,
      specialtyMatch: specialties.length ? specialties.some((s) => wanted.some((x) => s.includes(x))) : null,
      wheelchair: w === 'yes' || w === 'designated' ? 'yes' : w === 'limited' ? 'limited' : w === 'no' ? 'no' : 'unknown',
      wheelchairToilet: wt === 'yes' ? 'yes' : wt === 'no' ? 'no' : 'unknown',
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    });
  }
  return out.sort((a, b) => a.miles - b.miles);
}

export async function fetchNearbyCare(loc: { lat: number; lng: number }, radiusMiles: number, specialty: SpecialtyId, signal?: AbortSignal): Promise<NearbyPlace[]> {
  const body = 'data=' + encodeURIComponent(overpassQuery(loc.lat, loc.lng, radiusMiles * 1609.34));
  const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  let lastErr: unknown;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: 'POST', body, signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseOverpass(await res.json(), loc, specialty);
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      lastErr = e;
    }
  }
  throw new LocationError(`Couldn’t reach OpenStreetMap right now (${(lastErr as Error)?.message ?? 'network error'}). Try again in a minute.`);
}

/**
 * Applies the same hard-constraint rules as the main matcher to a real place.
 * OSM can only speak to entrance access (wheelchair=*) and restrooms; everything
 * else is unknown, so most places correctly land in "Needs verification".
 */
export function assessPlace(place: NearbyPlace, profile: Pick<Profile, 'needs'>): { status: MatchStatus; known: AccId[]; missing: AccId[]; failed: AccId[] } {
  const access: Partial<Record<AccId, AccRecord>> = {};
  const rec = (status: 'yes' | 'no'): AccRecord => ({ status, source: 'community' });
  if (place.wheelchair === 'yes') access.step_free_entrance = rec('yes');
  if (place.wheelchair === 'no') access.step_free_entrance = rec('no');
  // "limited" is genuinely ambiguous → leave unknown so it needs verification
  if (place.wheelchairToilet === 'yes') access.accessible_restroom = rec('yes');
  if (place.wheelchairToilet === 'no') access.accessible_restroom = rec('no');

  const fake = { access } as Provider;
  const essentials = (Object.keys(profile.needs) as AccId[])
    .filter((k) => profile.needs[k] === ('essential' as NeedLevel))
    .map((id) => checkRequirement(fake, id, 'essential'));
  return {
    status: classify(essentials),
    known: essentials.filter((c) => c.status === 'yes').map((c) => c.id),
    missing: essentials.filter((c) => c.status === 'unknown').map((c) => c.id),
    failed: essentials.filter((c) => c.status === 'no').map((c) => c.id),
  };
}
