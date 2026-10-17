import React from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AppProvider, useApp } from './context/AppContext';
import type { ShopStore } from './data/store';
import CheckInScreen from './screens/CheckInScreen';
import ServicesScreen from './screens/ServicesScreen';
import PaymentScreen from './screens/PaymentScreen';
import DoneScreen from './screens/DoneScreen';
import BayBoardScreen from './screens/BayBoardScreen';
import ReportsScreen from './screens/ReportsScreen';
import StaffPlaybookScreen from './screens/StaffPlaybookScreen';

function ShopAppContent({ onSignOut }: { onSignOut?: () => void }) {
  const { activeScreen, setScreen, totalRevenue, carCount, persistent, syncError } = useApp();

  return (
    <div style={styles.app}>
      <Header revenue={totalRevenue} carCount={carCount} onSignOut={onSignOut} />

      <main style={styles.main}>
        <div style={styles.content}>
          {!persistent && (
            <div style={styles.banner} role="status">
              Practice mode: not connected to the database. Nothing entered here is saved.
            </div>
          )}
          {syncError && (
            <div style={{ ...styles.banner, ...styles.bannerWarning }} role="alert">
              {syncError}. Retrying automatically.
            </div>
          )}

          {activeScreen === 'checkin' && <CheckInScreen />}
          {activeScreen === 'services' && <ServicesScreen />}
          {activeScreen === 'payment' && <PaymentScreen />}
          {activeScreen === 'done' && <DoneScreen />}
          {activeScreen === 'bayboard' && <BayBoardScreen />}
          {activeScreen === 'reports' && <ReportsScreen />}
          {activeScreen === 'guide' && <StaffPlaybookScreen />}
        </div>
      </main>

      <BottomNav activeScreen={activeScreen} onNavigate={setScreen} />
    </div>
  );
}

interface ShopAppProps {
  /** Defaults to Supabase when configured; tests pass a memory store. */
  store?: ShopStore;
  onSignOut?: () => void;
}

export default function ShopApp({ store, onSignOut }: ShopAppProps) {
  return (
    <AppProvider store={store}>
      <ShopAppContent onSignOut={onSignOut} />
    </AppProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    flex: 1,
    marginBottom: '60px',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  content: {
    minHeight: '100%',
    padding: '24px',
  },
  banner: {
    maxWidth: '1000px',
    margin: '0 auto 20px',
    padding: '12px 16px',
    fontSize: '15px',
    color: 'var(--text)',
    border: '1px solid var(--amber)',
    borderLeft: '4px solid var(--amber)',
    borderRadius: '8px',
  },
  bannerWarning: {
    border: '1px solid var(--orange)',
    borderLeft: '4px solid var(--orange)',
  },
};
