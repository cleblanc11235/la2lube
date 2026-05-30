import React from 'react';
import type { AppScreen } from '../types';

interface BottomNavProps {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

const navItems: Array<{ id: AppScreen; label: string }> = [
  { id: 'checkin', label: 'Check-In' },
  { id: 'bayboard', label: 'Bay Board' },
  { id: 'reports', label: 'Reports' },
  { id: 'guide', label: 'Guide' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, onNavigate }) => {
  const [hoveredTab, setHoveredTab] = React.useState<AppScreen | null>(null);

  return (
    <nav style={styles.nav}>
      {navItems.map((item) => {
        const isActive = activeScreen === item.id;
        const isHovered = hoveredTab === item.id;
        return (
          <button
            key={item.id}
            style={{
              ...styles.navButton,
              ...(isActive ? styles.navButtonActive : {}),
              ...(isHovered && !isActive ? styles.navButtonHover : {}),
            }}
            onClick={() => onNavigate(item.id)}
            onMouseEnter={() => setHoveredTab(item.id)}
            onMouseLeave={() => setHoveredTab(null)}
          >
            <span>{item.label}</span>
            {isActive && <div style={styles.activeIndicator} />}
          </button>
        );
      })}
    </nav>
  );
};

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60px',
    background: 'var(--surface)',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    zIndex: 100,
  },
  navButton: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--muted)',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'color 0.2s, background 0.2s',
    fontFamily: 'inherit',
  },
  navButtonActive: {
    color: 'var(--amber)',
  },
  navButtonHover: {
    background: 'rgba(205, 214, 244, 0.06)',
  },
  activeIndicator: {
    width: '24px',
    height: '3px',
    background: 'var(--amber)',
    borderRadius: '2px',
    margin: '2px auto 0',
  },
};
