import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import PublicLandingPage from './pages/PublicLandingPage';

const GbpPlaybookPage = lazy(() => import('./pages/GbpPlaybookPage'));
const Phase5MvpPage = lazy(() => import('./pages/Phase5MvpPage'));
const ShopSite = lazy(() => import('./ShopSite'));
const DemoPage = lazy(() => import('./pages/DemoPage'));

export default function DevRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<PublicLandingPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/owner/launch" element={<GbpPlaybookPage />} />
        <Route path="/mvp" element={<Phase5MvpPage />} />
        <Route path="/shop/*" element={<ShopSite />} />
      </Routes>
    </Suspense>
  );
}
