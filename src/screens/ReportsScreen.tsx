import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Ticket } from '../types';

// <input type="date"> works in local "YYYY-MM-DD" strings.
const toInputDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromInputDate = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

function downloadCsv(day: string, tickets: Ticket[]) {
  const quote = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ['Invoice', 'Time', 'Customer', 'Vehicle', 'Mileage', 'Services', 'Method', 'Subtotal', 'Tax', 'Total'];
  const rows = tickets.map((t) => [
    t.invoiceNumber ?? '',
    formatTime(t.paidAt),
    t.customerName,
    t.vehicleLabel,
    t.mileage,
    t.lines.map((l) => l.name).join('; '),
    t.paymentMethod ?? '',
    t.subtotal.toFixed(2),
    t.tax.toFixed(2),
    t.total.toFixed(2),
  ]);
  const csv = [header, ...rows].map((r) => r.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `la2lube-sales-${day}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsScreen() {
  const { todaysPaidTickets, loadPaidTickets } = useApp();
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const todayValue = toInputDate(new Date());
  const [dayValue, setDayValue] = useState(todayValue);
  const isToday = dayValue === todayValue;
  // Today's tickets stay live from context; other days are fetched on demand.
  const [pastTickets, setPastTickets] = useState<Ticket[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (isToday) return;
    let cancelled = false;
    setPastTickets(null);
    setLoadError(false);
    loadPaidTickets(fromInputDate(dayValue))
      .then((list) => !cancelled && setPastTickets(list))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [dayValue, isToday, loadPaidTickets]);

  const transactions = isToday ? todaysPaidTickets : pastTickets ?? [];
  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  const carCount = transactions.length;

  const heading = fromInputDate(dayValue).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate average ticket
  const avgTicket = carCount > 0 ? totalRevenue / carCount : 0;

  // Calculate cash/card split
  const cashCount = transactions.filter((t) => t.paymentMethod === 'cash').length;
  const cardCount = transactions.filter((t) => t.paymentMethod === 'card').length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{isToday ? 'Daily Report' : 'Report'}</h1>
          <p style={styles.date}>{heading}</p>
        </div>
        <div style={styles.controls}>
          <input
            type="date"
            aria-label="Report date"
            value={dayValue}
            max={todayValue}
            onChange={(e) => e.target.value && setDayValue(e.target.value)}
            style={styles.dateInput}
          />
          {!isToday && (
            <button style={styles.controlButton} onClick={() => setDayValue(todayValue)}>
              Today
            </button>
          )}
          <button
            style={styles.controlButton}
            onClick={() => downloadCsv(dayValue, transactions)}
            disabled={transactions.length === 0}
          >
            Download CSV
          </button>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div style={styles.statsRow}>
        {/* Revenue Card */}
        <div className="card" style={styles.statCard}>
          <div style={styles.statLabel}>Revenue</div>
          <div className="mono" style={styles.statValueAmber}>
            ${totalRevenue.toFixed(2)}
          </div>
        </div>

        {/* Cars Served Card */}
        <div className="card" style={styles.statCard}>
          <div style={styles.statLabel}>Cars Served</div>
          <div style={styles.statValue}>{carCount}</div>
        </div>

        {/* Avg Ticket Card */}
        <div className="card" style={styles.statCard}>
          <div style={styles.statLabel}>Avg Ticket</div>
          <div className="mono" style={styles.statValueAmber}>
            ${avgTicket.toFixed(2)}
          </div>
        </div>

        {/* Cash/Card Split Card */}
        <div className="card" style={styles.statCard}>
          <div style={styles.statLabel}>Payment Split</div>
          <div style={styles.statValue}>
            {cashCount} Cash / {cardCount} Card
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="card" style={styles.tableCard}>
        {loadError ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>Couldn't load that day. Check the internet connection.</p>
          </div>
        ) : !isToday && pastTickets === null ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>Loading…</p>
          </div>
        ) : transactions.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>{isToday ? 'No transactions yet today' : 'No transactions that day'}</p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.headerRow}>
                  <th style={styles.th}>Invoice</th>
                  <th style={styles.th}>Time</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Vehicle</th>
                  <th style={styles.thServices}>Services</th>
                  <th style={styles.th}>Method</th>
                  <th style={styles.thTotal}>Total</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    style={{
                      ...styles.row,
                      ...(hoveredRowId === transaction.id ? styles.rowHover : {}),
                    }}
                    onMouseEnter={() => setHoveredRowId(transaction.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <td style={styles.td} className="mono">
                      {transaction.invoiceNumber ?? ''}
                    </td>
                    <td style={styles.td}>{formatTime(transaction.paidAt)}</td>
                    <td style={styles.td}>{transaction.customerName}</td>
                    <td style={styles.td}>{transaction.vehicleLabel}</td>
                    <td style={styles.tdServices}>{transaction.lines.map((l) => l.name).join(', ')}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.methodBadge,
                          ...(transaction.paymentMethod === 'cash'
                            ? styles.methodCash
                            : styles.methodCard),
                        }}
                      >
                        {transaction.paymentMethod === 'cash' ? 'Cash' : 'Card'}
                      </span>
                    </td>
                    <td style={styles.tdTotal}>
                      <span className="mono" style={styles.totalAmount}>
                        ${transaction.total.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '16px',
  },
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
  },
  dateInput: {
    minHeight: '48px',
    padding: '0 12px',
    fontSize: '16px',
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    colorScheme: 'dark',
  },
  controlButton: {
    minHeight: '48px',
    padding: '0 20px',
    fontSize: '15px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: 'var(--amber)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '4px',
  },
  date: {
    fontSize: '1rem',
    color: 'var(--muted)',
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  statCard: {
    flex: '1 1 180px',
    padding: '20px',
    textAlign: 'center',
    minWidth: '180px',
    boxShadow: 'var(--shadow-card)',
  },
  statLabel: {
    fontSize: '0.875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--mauve)',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  statValueAmber: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--amber)',
  },
  tableCard: {
    padding: 0,
    overflow: 'hidden',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  headerRow: {
    backgroundColor: 'var(--border)',
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--muted)',
    whiteSpace: 'nowrap',
  },
  thServices: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--muted)',
    minWidth: '200px',
  },
  thTotal: {
    padding: '16px',
    textAlign: 'right',
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--muted)',
    whiteSpace: 'nowrap',
  },
  row: {
    borderBottom: '1px solid var(--border)',
    transition: 'background-color 0.15s',
  },
  rowHover: {
    background: 'rgba(205, 214, 244, 0.04)',
  },
  td: {
    padding: '16px',
    fontSize: '0.9375rem',
    color: 'var(--text)',
    whiteSpace: 'nowrap',
  },
  tdServices: {
    padding: '16px',
    fontSize: '0.9375rem',
    color: 'var(--text)',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tdTotal: {
    padding: '16px',
    textAlign: 'right',
  },
  totalAmount: {
    color: 'var(--amber)',
    fontSize: '0.9375rem',
    fontWeight: 600,
  },
  methodBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  methodCash: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: 'var(--green)',
  },
  methodCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: 'var(--blue)',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '1rem',
    color: 'var(--muted)',
  },
};
