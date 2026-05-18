import React from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AppProvider, useApp } from './context/AppContext';
import CheckInScreen from './screens/CheckInScreen';
import ServicesScreen from './screens/ServicesScreen';
import PaymentScreen from './screens/PaymentScreen';
import DoneScreen from './screens/DoneScreen';
import BayBoardScreen from './screens/BayBoardScreen';
import ReportsScreen from './screens/ReportsScreen';
import StaffPlaybookScreen from './screens/StaffPlaybookScreen';

function ShopAppContent() {
  const { activeScreen, setScreen, totalRevenue, carCount } = useApp();

  return (
    <div style={styles.app}>
      <Header revenue={totalRevenue} carCount={carCount} />

      <main style={styles.main}>
        <div style={styles.content}>
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

export default function ShopApp() {
  return (
    <AppProvider>
      <ShopAppContent />
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
    marginTop: '64px',
    marginBottom: '60px',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  content: {
    minHeight: '100%',
    padding: '24px',
  },
};
