import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BAY_COUNT } from '../config/shopSettings';
import type { Ticket } from '../types';

type BayStatus = 'empty' | 'waiting' | 'inprogress';

const ADVANCE_LABEL: Record<BayStatus, string | null> = {
  empty: null,
  waiting: 'Start Job →',
  inprogress: 'Job Done ✓',
};

const BayBoardScreen: React.FC = () => {
  const { openTickets, openForPayment } = useApp();

  const bays = Array.from({ length: BAY_COUNT }, (_, i) => {
    const id = i + 1;
    const ticket = openTickets.find(
      (t) => t.bay === id && (t.status === 'waiting' || t.status === 'in_progress')
    );
    return { id, ticket };
  });
  const readyToPay = openTickets.filter((t) => t.status === 'ready');

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Bay Board</h1>

      <div style={styles.grid}>
        {bays.map((bay) => (
          <BayCard key={bay.id} bayId={bay.id} ticket={bay.ticket} />
        ))}
      </div>

      <h2 style={styles.sectionTitle}>Ready to Pay</h2>
      {readyToPay.length === 0 ? (
        <p style={styles.emptyNote}>Cars show up here when the job is done.</p>
      ) : (
        <div style={styles.readyList}>
          {readyToPay.map((t) => (
            <div key={t.id} className="card" style={styles.readyCard}>
              <div style={{ minWidth: 0 }}>
                <div style={styles.readyName}>{t.customerName}</div>
                <div style={styles.vehicle}>{t.vehicleLabel}</div>
                <div style={styles.service}>{t.lines.map((s) => s.name).join(', ')}</div>
              </div>
              <div style={styles.readyActions}>
                <button style={styles.payButton} onClick={() => openForPayment(t)}>
                  Take Payment →
                </button>
                <CancelTicketButton ticket={t} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Customer left, or the ticket was entered by mistake. */
const CancelTicketButton: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
  const { voidTicket } = useApp();
  const [busy, setBusy] = useState(false);

  const handleCancel = async () => {
    if (!window.confirm(`Cancel the ticket for ${ticket.customerName}? It won't count in reports.`)) return;
    setBusy(true);
    try {
      await voidTicket(ticket.id);
    } catch {
      window.alert("Couldn't cancel the ticket. Check the internet connection and try again.");
      setBusy(false);
    }
  };

  return (
    <button style={styles.cancelButton} onClick={handleCancel} disabled={busy}>
      Cancel ticket
    </button>
  );
};

interface BayCardProps {
  bayId: number;
  ticket?: Ticket;
}

const BayCard: React.FC<BayCardProps> = ({ bayId, ticket }) => {
  const { startJob, finishJob } = useApp();
  const status: BayStatus = !ticket ? 'empty' : ticket.status === 'in_progress' ? 'inprogress' : 'waiting';
  const statusConfig = getStatusConfig(status);
  const [elapsedTime, setElapsedTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTime = ticket?.startedAt ? new Date(ticket.startedAt).getTime() : null;
  const serviceNames = ticket?.lines.map((s) => s.name).join(', ');

  useEffect(() => {
    if (status === 'inprogress' && startTime) {
      const updateTimer = () => {
        const elapsed = Math.max(0, Date.now() - startTime);
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        setElapsedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      };

      updateTimer(); // Initial call
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [status, startTime]);

  const handleAdvance = async () => {
    if (!ticket) return;
    setBusy(true);
    setError(null);
    try {
      await (status === 'waiting' ? startJob(ticket.id) : finishJob(ticket.id));
    } catch {
      setError("Couldn't save. Check the internet connection and try again.");
    } finally {
      setBusy(false);
    }
  };

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
          <span style={styles.bayNumber} className="mono">BAY {bayId}</span>
          <span style={{ ...styles.statusBadge, ...statusConfig.badgeStyle }}>
            {statusConfig.label}
          </span>
        </div>

        {!ticket ? (
          <div style={styles.emptyContent}>
            <div style={{ fontSize: '2rem', opacity: 0.2, marginBottom: '8px' }}>◻</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.875rem', letterSpacing: '0.05em' }}>AVAILABLE</div>
          </div>
        ) : (
          <div style={styles.bayContent}>
            <div style={styles.customerName}>{ticket.customerName}</div>
            <div style={styles.vehicle}>{ticket.vehicleLabel}</div>
            <div style={styles.service}>{serviceNames}</div>

            {status === 'inprogress' && elapsedTime && (
              <div style={styles.timerContainer}>
                <div style={styles.timerRow}>
                  <span style={styles.pulseDot} />
                  <span style={styles.timer} className="mono">{elapsedTime}</span>
                </div>
                <div style={styles.timerLabel}>elapsed</div>
              </div>
            )}

            {error && (
              <div style={styles.errorText} role="alert">
                {error}
              </div>
            )}

            <button style={styles.advanceButton} onClick={handleAdvance} disabled={busy}>
              {busy ? 'Saving…' : ADVANCE_LABEL[status]}
            </button>
            <CancelTicketButton ticket={ticket} />
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
  advanceButton: {
    marginTop: '16px',
    height: '52px',
    borderRadius: 'var(--radius-input, 8px)',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text)',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
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
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text)',
    marginTop: '40px',
    marginBottom: '16px',
  },
  emptyNote: {
    color: 'var(--muted)',
    fontSize: '0.95rem',
  },
  readyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  readyCard: {
    padding: '20px 24px',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    borderLeft: '4px solid var(--green)',
  },
  readyName: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  readyActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '4px',
  },
  payButton: {
    minHeight: '60px',
    padding: '0 28px',
    fontSize: '1rem',
    fontWeight: 700,
    backgroundColor: 'var(--amber)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: 'var(--radius-input, 8px)',
    cursor: 'pointer',
  },
  cancelButton: {
    minHeight: '40px',
    background: 'transparent',
    border: 'none',
    color: 'var(--muted)',
    fontSize: '0.85rem',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  errorText: {
    marginTop: '8px',
    fontSize: '0.875rem',
    color: 'var(--orange)',
  },
  timerLabel: {
    fontSize: '0.7rem',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
};

export default BayBoardScreen;
