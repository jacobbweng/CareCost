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
  const timeout = new AbortController();
  const onAbort = () => timeout.abort();
  signal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => timeout.abort(), 8000);
  try {
    const res = await fetch(`${OSRM}/table/v1/driving/${coords}?sources=0&annotations=distance,duration`, { signal: timeout.signal });
    if (!res.ok) return places.map(() => null);
    const d = (await res.json()) as { code?: string; distances?: (number | null)[][]; durations?: (number | null)[][] };
    if (d.code !== 'Ok') return places.map(() => null);
    return places.map((_, i) => {
      const m = d.distances?.[0]?.[i + 1];
      const s = d.durations?.[0]?.[i + 1];
      return m == null || s == null ? null : { miles: Math.round((m / 1609.34) * 10) / 10, minutes: Math.max(1, Math.round(s / 60)) };
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    return places.map(() => null); // OSRM slow or down → fall back to straight-line distance
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
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
  /** false while a wider search is still running in the background */
  complete: boolean;
  fetchedAt: number;
}

// ── Clinic cache ─────────────────────────────────────────
// The raw OpenStreetMap list doesn't depend on the specialty, so one fetch serves every
// specialty, and a cached wide search also serves any smaller distance.
const PLACES_KEY = 'carecost.places.v1';
const PLACES_MS = 6 * 60 * 60 * 1000;
const FAST_MILES = 5;
const MAX_PLACES = 40;

interface PlaceCache {
  key: string;
  radius: number;
  at: number;
  places: NearbyPlace[];
}
let memCache: PlaceCache | null = null;
const locKey = (l: { lat: number; lng: number }) => `${l.lat.toFixed(4)},${l.lng.toFixed(4)}`;
const fresh = (c: PlaceCache | null): c is PlaceCache => !!c && Date.now() - c.at < PLACES_MS;

function readPlaces(loc: { lat: number; lng: number }, radius: number): NearbyPlace[] | null {
  if (!memCache) {
    try {
      memCache = JSON.parse(localStorage.getItem(PLACES_KEY) ?? 'null') as PlaceCache | null;
    } catch {
      memCache = null;
    }
  }
  return fresh(memCache) && memCache.key === locKey(loc) && memCache.radius >= radius ? memCache.places : null;
}

function writePlaces(loc: { lat: number; lng: number }, radius: number, places: NearbyPlace[]) {
  const key = locKey(loc);
  if (fresh(memCache) && memCache.key === key && memCache.radius > radius) return; // keep the bigger search
  memCache = { key, radius, at: Date.now(), places };
  try {
    localStorage.setItem(PLACES_KEY, JSON.stringify(memCache));
  } catch {
    /* storage full or blocked — in-memory copy still works */
  }
}

export function clearPlaceCache() {
  memCache = null;
  try {
    localStorage.removeItem(PLACES_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Real clinics near the user for one specialty, nearest first.
 *  1. Repeat searches (any specialty, same or smaller distance) come straight from the cache.
 *  2. Big radii first run a quick 5-mile search so results show right away; the full radius
 *     keeps loading in the background and arrives through `onUpdate`.
 *  3. Road distances from OSRM are slowest, so they arrive last through `onUpdate`.
 * Until road distances arrive, distances use the straight-line estimate.
 */
export async function loadRealProviders(
  loc: { lat: number; lng: number },
  specialty: SpecialtyId,
  radiusMiles: number,
  signal?: AbortSignal,
  onUpdate?: (providers: Provider[], complete: boolean) => void,
  force = false,
): Promise<RealSearch> {
  const radius = Math.min(Math.max(radiusMiles, 2), 25);
  let version = 0;

  const select = (all: NearbyPlace[]) => all.filter((p) => p.specialtyMatch !== false && p.miles <= radius + 0.3).slice(0, MAX_PLACES);

  // Returns providers with estimated distances now; upgrades them with road distances later.
  const publish = (all: NearbyPlace[], complete: boolean): Provider[] => {
    const mine = ++version;
    const chosen = select(all);
    if (onUpdate && chosen.length) {
      void roadDistances(loc, chosen, signal)
        .then((roads) => {
          if (signal?.aborted || mine !== version || !roads.some(Boolean)) return;
          onUpdate(chosen.map((p, i) => placeToProvider(p, specialty, roads[i])), complete);
        })
        .catch(() => {
          /* aborted or failed — straight-line estimates stay */
        });
    }
    return chosen.map((p) => placeToProvider(p, specialty, null));
  };

  if (!force) {
    const hit = readPlaces(loc, radius);
    if (hit) return { providers: publish(hit, true), complete: true, fetchedAt: Date.now() };
  }

  if (radius > FAST_MILES * 1.6) {
    const near = await fetchNearbyCare(loc, FAST_MILES, specialty, signal);
    if (select(near).length >= 6) {
      writePlaces(loc, FAST_MILES, near);
      void fetchNearbyCare(loc, radius, specialty, signal)
        .then((wide) => {
          if (signal?.aborted) return;
          writePlaces(loc, radius, wide);
          const providers = publish(wide, true);
          onUpdate?.(providers, true);
        })
        .catch(() => {
          /* the 5-mile results stay on screen */
        });
      return { providers: publish(near, false), complete: false, fetchedAt: Date.now() };
    }
  }

  const all = await fetchNearbyCare(loc, radius, specialty, signal);
  writePlaces(loc, radius, all);
  return { providers: publish(all, true), complete: true, fetchedAt: Date.now() };
}
