export const usd = (n: number, digits = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(n) ? n : 0);

export const usd2 = (n: number) => usd(n, 2);

export const fmtDate = (iso?: string) => {
  if (!iso) return 'No date on file';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const daysSince = (iso: string, now = new Date()) =>
  Math.floor((now.getTime() - new Date(iso + 'T12:00:00').getTime()) / 86_400_000);

export const STALE_DAYS = 365;

export const isStale = (iso?: string, now = new Date()) => (iso ? daysSince(iso, now) > STALE_DAYS : false);

export const miles = (n: number) => `${n.toFixed(1)} mi`;

export const listJoin = (items: string[]) => {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
};
