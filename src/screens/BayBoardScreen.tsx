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
    <>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
      <div className="card" style={{ ...styles.bayCard, ...statusConfig.borderStyle, background: statusConfig.background }}>
        <div style={styles.bayHeader}>
          <span style={styles.bayNumber} className="mono">BAY {bay.id}</span>
          <span style={{ ...styles.statusBadge, ...statusConfig.badgeStyle }}>
            {statusConfig.label}
          </span>
        </div>

        {bay.status === 'empty' ? (
          <div style={styles.emptyContent}>
            <div style={{ fontSize: '2rem', opacity: 0.2, marginBottom: '8px' }}>◻</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.875rem', letterSpacing: '0.05em' }}>AVAILABLE</div>
          </div>
        ) : (
          <div style={styles.bayContent}>
            <div style={styles.customerName}>{bay.customerName}</div>
            <div style={styles.vehicle}>{bay.vehicle}</div>
            <div style={styles.service}>{bay.service}</div>

            {bay.status === 'inprogress' && elapsedTime && (
              <div style={styles.timerContainer}>
                <div style={styles.timerRow}>
                  <span style={styles.pulseDot} />
                  <span style={styles.timer} className="mono">{elapsedTime}</span>
                </div>
                <div style={styles.timerLabel}>elapsed</div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

const getStatusConfig = (status: BayStatus) => {
  switch (status) {
    case 'inprogress':
      return {
        label: 'IN PROGRESS',
        borderStyle: { borderLeft: '4px solid var(--blue)' },
        badgeStyle: {
          background: 'rgba(137, 180, 250, 0.15)',
          color: 'var(--blue)',
          borderRadius: '20px',
          padding: '3px 10px',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
        },
        background: 'rgba(137, 180, 250, 0.06)',
      };
    case 'complete':
      return {
        label: 'COMPLETE',
        borderStyle: { borderLeft: '4px solid var(--green)' },
        badgeStyle: {
          background: 'rgba(166, 227, 161, 0.15)',
          color: 'var(--green)',
          borderRadius: '20px',
          padding: '3px 10px',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
        },
        background: 'rgba(166, 227, 161, 0.06)',
      };
    case 'waiting':
      return {
        label: 'WAITING',
        borderStyle: { borderLeft: '4px solid var(--orange)' },
        badgeStyle: {
          background: 'rgba(250, 179, 135, 0.15)',
          color: 'var(--orange)',
          borderRadius: '20px',
          padding: '3px 10px',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
        },
        background: 'rgba(250, 179, 135, 0.06)',
      };
    case 'empty':
      return {
        label: 'AVAILABLE',
        borderStyle: { borderLeft: '4px solid var(--muted)' },
        badgeStyle: {
          background: 'rgba(148, 163, 184, 0.15)',
          color: 'var(--muted)',
          borderRadius: '20px',
          padding: '3px 10px',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
        },
        background: 'var(--surface)',
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
    // Styles are now in getStatusConfig for better control per status
  },
  emptyContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
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
  timerContainer: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  timerRow: {
    display: 'flex',
    alignItems: 'center',
  },
  pulseDot: {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'var(--blue)',
    animation: 'pulse-dot 1.2s ease-in-out infinite',
    marginRight: 8,
    verticalAlign: 'middle',
  },
  timer: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: 'var(--blue)',
    letterSpacing: '-0.02em',
  },
  timerLabel: {
    fontSize: '0.7rem',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
};

export default BayBoardScreen;
