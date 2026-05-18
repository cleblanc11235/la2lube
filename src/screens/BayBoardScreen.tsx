import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Bay, BayStatus } from '../types';

const BayBoardScreen: React.FC = () => {
  const { bays } = useApp();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Bay Board</h1>

      <div style={styles.grid}>
        {bays.map((bay) => (
          <BayCard key={bay.id} bay={bay} />
        ))}
      </div>
    </div>
  );
};

interface BayCardProps {
  bay: Bay;
}

const BayCard: React.FC<BayCardProps> = ({ bay }) => {
  const statusConfig = getStatusConfig(bay.status);
  const [elapsedTime, setElapsedTime] = useState('');

  useEffect(() => {
    if (bay.status === 'inprogress' && bay.startTime) {
      const updateTimer = () => {
        const elapsed = Date.now() - bay.startTime!;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        setElapsedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      };

      updateTimer(); // Initial call
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [bay.status, bay.startTime]);

  return (
    <div className="card" style={{ ...styles.bayCard, ...statusConfig.borderStyle }}>
      <div style={styles.bayHeader}>
        <span style={styles.bayNumber} className="mono">BAY {bay.id}</span>
        <span style={{ ...styles.statusBadge, ...statusConfig.badgeStyle }}>
          {statusConfig.label}
        </span>
      </div>

      {bay.status === 'empty' ? (
        <div style={styles.emptyContent}>
          <span style={styles.emptyText}>— Empty —</span>
        </div>
      ) : (
        <div style={styles.bayContent}>
          <div style={styles.customerName}>{bay.customerName}</div>
          <div style={styles.vehicle}>{bay.vehicle}</div>
          <div style={styles.service}>{bay.service}</div>

          {bay.status === 'inprogress' && elapsedTime && (
            <div style={styles.timer} className="mono">
              {elapsedTime}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const getStatusConfig = (status: BayStatus) => {
  switch (status) {
    case 'inprogress':
      return {
        label: 'IN PROGRESS',
        borderStyle: { borderTop: '4px solid var(--blue)' },
        badgeStyle: { background: 'var(--blue)', color: 'var(--text-on-accent)' },
      };
    case 'complete':
      return {
        label: 'COMPLETE',
        borderStyle: { borderTop: '4px solid var(--green)' },
        badgeStyle: { background: 'var(--green)', color: 'var(--text-on-accent)' },
      };
    case 'waiting':
      return {
        label: 'WAITING',
        borderStyle: { borderTop: '4px solid var(--orange)' },
        badgeStyle: { background: 'var(--orange)', color: '#fff' },
      };
    case 'empty':
      return {
        label: 'AVAILABLE',
        borderStyle: { borderTop: '4px solid var(--muted)' },
        badgeStyle: { background: 'var(--muted)', color: 'var(--text-on-accent)' },
      };
  }
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '32px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  bayCard: {
    padding: '24px',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
  },
  bayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  bayNumber: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  statusBadge: {
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '4px 12px',
    borderRadius: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  emptyContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: '1.25rem',
    color: 'var(--muted)',
    fontStyle: 'italic',
  },
  bayContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  customerName: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  vehicle: {
    fontSize: '1rem',
    color: 'var(--text)',
  },
  service: {
    fontSize: '0.875rem',
    color: 'var(--muted)',
  },
  timer: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--blue)',
    marginTop: '16px',
  },
};

export default BayBoardScreen;
