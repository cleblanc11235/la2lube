import { Routes, Route } from 'react-router-dom';
import GbpPlaybookPage from './pages/GbpPlaybookPage';
import Phase5MvpPage from './pages/Phase5MvpPage';
import ShopApp from './ShopApp';
import PublicLandingPage from './pages/PublicLandingPage';
import DemoPage from './pages/DemoPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLandingPage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/owner/launch" element={<GbpPlaybookPage />} />
      <Route path="/mvp" element={<Phase5MvpPage />} />
      <Route path="/shop/*" element={<ShopApp />} />
    </Routes>
  );
}
