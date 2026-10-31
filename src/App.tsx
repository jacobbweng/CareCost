import { useEffect, useRef } from 'react';
import { AppLayout, NAV } from './components/Layout';
import { Splash } from './components/Motion';
import { AccessMap } from './pages/AccessMap';
import { Compare } from './pages/Compare';
import { CostCalculator } from './pages/CostCalculator';
import { Dashboard } from './pages/Dashboard';
import { FindCare } from './pages/FindCare';
import { Home } from './pages/Home';
import { InsuranceNavigator } from './pages/InsuranceNavigator';
import { Onboarding } from './pages/Onboarding';
import { Plan } from './pages/Plan';
import { ProfilePage } from './pages/ProfilePage';
import { ProviderDetail } from './pages/ProviderDetail';
import { href, useRoute } from './state/router';
import { StoreProvider, useStore } from './state/store';

function Routes() {
  const route = useRoute();
  const { path, parts, query } = route;
  const { summary } = useStore();
  const announce = useRef<HTMLParagraphElement>(null);
  const first = useRef(true);

  // Move focus to the page heading and announce navigation (WCAG 2.4.3)
  useEffect(() => {
    const t = setTimeout(() => {
      const h = document.getElementById('page-title');
      const label = h?.textContent ?? 'CareCost';
      document.title = path === '/' ? 'CareCost — Find care that works for you' : `${label} · CareCost`;
      if (first.current) {
        first.current = false;
        return;
      }
      window.scrollTo({ top: 0 });
      h?.focus({ preventScroll: true });
      if (announce.current) announce.current.textContent = `${label} page`;
    }, 30);
    return () => clearTimeout(t);
  }, [path, parts.join('/')]); // eslint-disable-line react-hooks/exhaustive-deps

  const live = <p ref={announce} className="sr-only" aria-live="polite" aria-atomic="true" />;

  if (path === '/') return <>{live}<Home /></>;
  if (path === '/start') return <>{live}<Onboarding /></>;

  let page;
  switch (parts[0]) {
    case 'dashboard': page = <Dashboard />; break;
    case 'find': page = <FindCare />; break;
    case 'provider': page = <ProviderDetail key={parts[1]} id={parts[1] ?? ''} />; break;
    case 'compare': page = <Compare />; break;
    case 'cost': page = <CostCalculator key={`${query.get('provider')}-${summary.results.length}`} initialProvider={query.get('provider')} />; break;
    case 'insurance': page = <InsuranceNavigator />; break;
    case 'map': page = <AccessMap />; break;
    case 'plan': page = <Plan />; break;
    case 'profile': page = <ProfilePage />; break;
    default:
      page = (
        <div>
          <h1 id="page-title" tabIndex={-1} className="text-3xl font-bold">Page not found</h1>
          <p className="mt-3">Try one of these:</p>
          <ul className="mt-2 list-disc pl-6">{NAV.map((n) => <li key={n.to}><a className="text-pine-800 underline" href={href(n.to)}>{n.label}</a></li>)}</ul>
        </div>
      );
  }
  return <>{live}<AppLayout current={path}>{page}</AppLayout></>;
}

export default function App() {
  return (
    <StoreProvider>
      <Splash />
      <Routes />
    </StoreProvider>
  );
}
