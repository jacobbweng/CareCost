// Builds CareCost providers from real, public data:
//   • clinics + wheelchair tags  → OpenStreetMap (Overpass)
//   • road miles + drive time    → OSRM public routing service
//   • price estimate             → 2026 Medicare fee schedule (see data/benchmarks.ts)
//   • ZIP code → coordinates      → Zippopotam.us
// Nothing is invented. Where data doesn't exist (exam rooms, networks), it stays unknown.
import { MEDICARE_VISIT_SOURCE, PRIVATE_TO_MEDICARE, benchmarkVisit } from '../data/benchmarks';
import { LocationError, fetchNearbyCare, type NearbyPlace } from './location';
import type { AccId, AccRecord, Provider, SpecialtyId, UserLocation } from './types';

const OSRM = 'https://router.project-osrm.org';

/** ZIP code → coordinates and place name (US). */
export async function geocodeZip(zip: string, signal?: AbortSignal): Promise<UserLocation> {
  if (!/^\d{5}$/.test(zip)) throw new LocationError('Enter a 5-digit ZIP code.');
  let res: Response;
  try {
    res = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal });
  } catch {
    throw new LocationError('Couldn’t look up that ZIP code. Check your connection and try again.');
  }
  if (res.status === 404) throw new LocationError('We couldn’t find that ZIP code. Check the numbers and try again.');
  if (!res.ok) throw new LocationError('Couldn’t look up that ZIP code right now. Try again.');
  const d = (await res.json()) as { places?: { 'place name': string; 'state abbreviation': string; latitude: string; longitude: string }[] };
  const p = d.places?.[0];
  if (!p) throw new LocationError('We couldn’t find that ZIP code.');
  return { lat: Number(p.latitude), lng: Number(p.longitude), label: `${p['place name']}, ${p['state abbreviation']}`, zip };
}

/** Road distance (miles) and drive time (minutes) from the user to every place, in one request. */
export async function roadDistances(origin: { lat: number; lng: number }, places: { lat: number; lng: number }[], signal?: AbortSignal) {
  if (!places.length) return [];
  const coords = [origin, ...places].map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  try {
    const res = await fetch(`${OSRM}/table/v1/driving/${coords}?sources=0&annotations=distance,duration`, { signal });
    if (!res.ok) return places.map(() => null);
    const d = (await res.json()) as { code?: string; distances?: (number | null)[][]; durations?: (number | null)[][] };
    if (d.code !== 'Ok') return places.map(() => null);
    return places.map((_, i) => {
      const m = d.distances?.[0]?.[i + 1];
      const s = d.durations?.[0]?.[i + 1];
      return m == null || s == null ? null : { miles: Math.round((m / 1609.34) * 10) / 10, minutes: Math.max(1, Math.round(s / 60)) };
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return places.map(() => null);
  }
}

/** Driving route geometry for drawing on the map ([lat, lng] pairs). */
export async function drivingRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }, signal?: AbortSignal): Promise<[number, number][] | null> {
  try {
    const res = await fetch(`${OSRM}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`, { signal });
    if (!res.ok) return null;
    const d = (await res.json()) as { code?: string; routes?: { geometry: { coordinates: [number, number][] } }[] };
    const c = d.routes?.[0]?.geometry.coordinates;
    return d.code === 'Ok' && c ? c.map(([lng, lat]) => [lat, lng]) : null;
  } catch {
    return null;
  }
}

export function placeToProvider(place: NearbyPlace, specialty: SpecialtyId, road: { miles: number; minutes: number } | null): Provider {
  const access: Partial<Record<AccId, AccRecord>> = {};
  const community = (status: 'yes' | 'no'): AccRecord => ({ status, source: 'community' });
  if (place.wheelchair === 'yes') access.step_free_entrance = community('yes');
  if (place.wheelchair === 'no') access.step_free_entrance = community('no');
  if (place.wheelchairToilet === 'yes') access.accessible_restroom = community('yes');
  if (place.wheelchairToilet === 'no') access.accessible_restroom = community('no');
  const visit = benchmarkVisit(specialty);
  return {
    id: place.id.replace('/', '-'),
    name: place.name,
    specialty,
    address: place.address ?? '',
    lat: place.lat,
    lng: place.lng,
    roadMiles: road?.miles,
    driveMinutes: road?.minutes,
    kind: place.kind,
    website: place.website,
    hours: place.hours,
    phone: place.phone,
    osmUrl: place.osmUrl,
    specialtyListed: place.specialtyMatch,
    allowedAmount: visit.amount,
    selfPayPrice: Math.round(visit.amount * PRIVATE_TO_MEDICARE),
    priceSource: `CPT ${visit.code} · ${MEDICARE_VISIT_SOURCE}`,
    networks: {},
    access,
    parkingCost: 0,
  };
}

export interface RealSearch {
  providers: Provider[];
  roadDistances: boolean;
  fetchedAt: number;
}

/** Real clinics near the user for one specialty, nearest first. */
export async function loadRealProviders(loc: { lat: number; lng: number }, specialty: SpecialtyId, radiusMiles: number, signal?: AbortSignal): Promise<RealSearch> {
  const places: NearbyPlace[] = (await fetchNearbyCare(loc, Math.min(Math.max(radiusMiles, 2), 25), specialty, signal))
    .filter((p) => p.specialtyMatch !== false) // drop places tagged with a different specialty
    .slice(0, 40);
  const roads = await roadDistances(loc, places, signal);
  return {
    providers: places.map((p, i) => placeToProvider(p, specialty, roads[i])),
    roadDistances: roads.some(Boolean),
    fetchedAt: Date.now(),
  };
}
