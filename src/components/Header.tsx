import React from 'react';
import { SHOP } from '../config/shopBrand';

interface HeaderProps {
  revenue: number;
  carCount: number;
}

export const Header: React.FC<HeaderProps> = ({ revenue, carCount }) => {
  const [hoveredChip, setHoveredChip] = React.useState<'revenue' | 'cars' | null>(null);

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <div style={styles.logo}>{SHOP.name}</div>
        <div style={styles.tagline}>{SHOP.city} · {SHOP.phoneDisplay}</div>
      </div>
      <div style={styles.stats}>
        <div
          style={{
            ...styles.statChip,
            ...(hoveredChip === 'revenue' ? styles.statChipHover : {}),
          }}
          onMouseEnter={() => setHoveredChip('revenue')}
          onMouseLeave={() => setHoveredChip(null)}
        >
          <span style={styles.statLabel}>Revenue:</span>
          <span style={styles.statValue} className="mono">
            ${revenue.toFixed(2)}
          </span>
        </div>
        <div
          style={{
            ...styles.statChip,
            ...(hoveredChip === 'cars' ? styles.statChipHover : {}),
          }}
          onMouseEnter={() => setHoveredChip('cars')}
          onMouseLeave={() => setHoveredChip(null)}
        >
          <span style={styles.statLabel}>Cars:</span>
          <span style={styles.statValue}>{carCount}</span>
        </div>
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    minHeight: '64px',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    boxShadow: '0 1px 0 var(--border), 0 4px 24px rgba(17,17,27,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    zIndex: 100,
    gap: '12px',
    flexWrap: 'wrap',
  },
  left: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  tagline: {
    fontSize: '0.75rem',
    color: 'var(--muted)',
  },
  logo: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--amber)',
  },
  stats: {
    display: 'flex',
    gap: '12px',
    flexShrink: 0,
  },
  statChip: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '8px 16px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    transition: 'border-color 0.2s, background 0.2s',
    cursor: 'default',
  },
  statChipHover: {
    borderColor: 'var(--amber)',
    background: 'var(--accent-bg-soft)',
  },
  statLabel: {
    color: 'var(--muted)',
    fontSize: '0.875rem',
  },
  statValue: {
    color: 'var(--text)',
    fontWeight: 600,
    fontSize: '0.875rem',
  },
};
