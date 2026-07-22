import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLandingPage from './pages/PublicLandingPage';

// Internal-only routes (shop app, demo, MVP, owner playbook) never ship in a
// production build. `import.meta.env.PROD` is inlined to a literal at build
// time, so Rollup dead-code-eliminates this whole branch (and everything
// DevRoutes imports, transitively) out of the Netlify bundle entirely.
const DevRoutes = import.meta.env.PROD ? null : lazy(() => import('./DevRoutes'));

export default function App() {
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
