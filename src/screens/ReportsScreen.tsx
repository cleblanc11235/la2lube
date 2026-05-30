import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function ReportsScreen() {
  const { transactions, totalRevenue, carCount } = useApp();
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Format today's date
  const today = new Date().toLocaleDateString('en-US', {
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
        <h1 style={styles.title}>Daily Report</h1>
        <p style={styles.date}>{today}</p>
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
        {transactions.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No transactions yet today</p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.headerRow}>
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
                    <td style={styles.td}>{transaction.time}</td>
                    <td style={styles.td}>{transaction.customerName}</td>
                    <td style={styles.td}>{transaction.vehicle}</td>
                    <td style={styles.tdServices}>{transaction.services.join(', ')}</td>
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
