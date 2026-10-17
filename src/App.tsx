import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLandingPage from './pages/PublicLandingPage';

// One repo, two Netlify sites:
//   - public website (default build): only the landing page ships.
//   - staff app (VITE_APP_TARGET=shop): only the shop app ships, behind a login.
// Both checks are inlined at build time, so Rollup drops the unused branches
// (and everything they import) from each bundle.
const IS_SHOP_BUILD = import.meta.env.VITE_APP_TARGET === 'shop';

const ShopSite = IS_SHOP_BUILD ? lazy(() => import('./ShopSite')) : null;

// Internal-only routes (demo, MVP, owner playbook, and the shop app at /shop)
// for local development.
const DevRoutes = import.meta.env.PROD || IS_SHOP_BUILD ? null : lazy(() => import('./DevRoutes'));

export default function App() {
  if (ShopSite) {
    return (
      <Suspense fallback={null}>
        <ShopSite />
      </Suspense>
    );
  }

  if (!DevRoutes) {
    return (
      <Routes>
        <Route path="/" element={<PublicLandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Suspense fallback={null}>
      <DevRoutes />
    </Suspense>
  );
}
