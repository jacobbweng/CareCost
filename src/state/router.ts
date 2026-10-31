import { useEffect, useState } from 'react';

// Tiny hash router — works from a single static file with no server config.
//
// URLs use plain `#name` fragments (letters, digits, hyphens) so they survive
// hosts that only pass simple fragments through:
//   /dashboard            ↔ #dashboard
//   /provider/<id>        ↔ #provider-<id>
//   /cost?provider=<id>   ↔ #cost-for-<id>
//   /                     ↔ #home (or empty)
// Legacy `#/path?query` links are still understood.

const SIMPLE = ['dashboard', 'find', 'map', 'compare', 'cost', 'insurance', 'plan', 'profile', 'start'];

export function toFragment(to: string): string {
  const [path, q = ''] = to.split('?');
  const parts = path.split('/').filter(Boolean);
  const query = new URLSearchParams(q);
  if (!parts.length) return 'home';
  if (parts[0] === 'provider' && parts[1]) return `provider-${parts[1]}`;
  if (parts[0] === 'cost' && query.get('provider')) return `cost-for-${query.get('provider')}`;
  return parts[0];
}

export function parseHash(hash = window.location.hash) {
  const raw = hash.replace(/^#/, '');
  let path = '/';
  let query = new URLSearchParams();
  if (raw.startsWith('/')) {
    const [p, q = ''] = raw.split('?');
    path = p || '/';
    query = new URLSearchParams(q);
  } else if (!raw || raw === 'home') {
    path = '/';
  } else if (raw.startsWith('provider-')) {
    path = `/provider/${raw.slice('provider-'.length)}`;
  } else if (raw.startsWith('cost-for-')) {
    path = '/cost';
    query = new URLSearchParams({ provider: raw.slice('cost-for-'.length) });
  } else if (SIMPLE.includes(raw)) {
    path = `/${raw}`;
  } else {
    path = `/${raw}`;
  }
  const parts = path.split('/').filter(Boolean);
  return { path: '/' + parts.join('/'), parts, query };
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseHash());
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(to: string) {
  const target = '#' + toFragment(to);
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
}

export const href = (to: string) => '#' + toFragment(to);
