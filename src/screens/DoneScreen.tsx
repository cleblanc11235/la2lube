import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SHOP } from '../config/shopBrand';

const DoneScreen: React.FC = () => {
  const { ticket, transactions, resetTicket, setScreen } = useApp();
  const [showReprintFlash, setShowReprintFlash] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  // Trigger pulse animation on "Next Customer" button after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPulse(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Get the most recent transaction (the one we just completed)
  const lastTransaction = transactions[transactions.length - 1];

  if (!lastTransaction) {
    // Safety fallback - user navigated here without completing a transaction
    return (
      <div style={styles.container}>
        <div style={styles.noTransactionMessage}>
          <p style={styles.errorText}>No transaction found</p>
          <button style={styles.goBackButton} onClick={() => setScreen('checkin')}>
            Go to Check-In
          </button>
        </div>
      </div>
    );
  }

  // Calculate next service mileage based on oil change type
  const getNextServiceMileage = (): number => {
    const currentMileage = ticket.currentMileage || 0;

    // Find the oil change service in selected services
    const oilChange = ticket.selectedServices.find((s) => s.category === 'oilchange');

    if (!oilChange) {
      // Default to conventional interval if no oil change selected
      return currentMileage + 3000;
    }

    // Map service names to mileage intervals
    const name = oilChange.name.toLowerCase();
    if (name.includes('european')) return currentMileage + 10000;
    if (name.includes('full synthetic')) return currentMileage + 7500;
    if (name.includes('synthetic blend')) return currentMileage + 5000;
    if (name.includes('high-mileage')) return currentMileage + 5000;
    if (name.includes('diesel')) return currentMileage + 5000;
    if (name.includes('conventional')) return currentMileage + 3000;

    // Default
    return currentMileage + 3000;
  };

  // Get oil type for sticker
  const getOilType = (): string => {
    const oilChange = ticket.selectedServices.find((s) => s.category === 'oilchange');
    if (!oilChange) return 'Conventional';

    const name = oilChange.name;
    if (name.includes('European')) return 'European Spec';
    if (name.includes('Full Synthetic')) return 'Full Synthetic';
    if (name.includes('Synthetic Blend')) return 'Synthetic Blend';
    if (name.includes('High-Mileage')) return 'High-Mileage';
    if (name.includes('Diesel')) return 'Diesel';
    if (name.includes('Conventional')) return 'Conventional';

    return 'Conventional';
  };

  // Format current date as MM/DD/YYYY
  const formatDate = (): string => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Format mileage with comma separator
  const formatMileage = (mileage: number): string => {
    return mileage.toLocaleString('en-US');
  };

  const nextServiceMileage = getNextServiceMileage();
  const oilType = getOilType();
  const currentMileage = ticket.currentMileage || 0;

  const handleReprint = () => {
    setShowReprintFlash(true);
    setTimeout(() => setShowReprintFlash(false), 1500);
  };

  const handleNextCustomer = () => {
    resetTicket();
    setScreen('checkin');
  };

  return (
    <div style={styles.container}>
      {/* Inject CSS keyframes for animations */}
      <style>
        {`
          @keyframes checkmark-pop {
            0%   { opacity: 0; transform: scale(0.3); }
            60%  { opacity: 1; transform: scale(1.15); }
            80%  { transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes slide-up-fade {
            0%   { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes heading-fade {
            0%   { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes amber-pulse-btn {
            0%, 100% { box-shadow: 0 0 0 0 rgba(250, 179, 135, 0); }
            50%       { box-shadow: 0 0 0 8px rgba(250, 179, 135, 0.25); }
          }
        `}
      </style>
      <div style={styles.wrapper}>
        {/* Section 1: Confirmation */}
        <div style={styles.confirmationSection}>
          <div style={styles.checkmarkCircle}>
            <span style={styles.checkmark}>✓</span>
          </div>
          <h1 style={styles.confirmationTitle}>Payment Confirmed</h1>
          <p style={styles.paymentInfo}>
            {lastTransaction.paymentMethod === 'cash' ? 'Cash' : 'Card'} — $
            {lastTransaction.total.toFixed(2)}
          </p>
        </div>

        {/* Section 2: Windshield Sticker Preview */}
        <div style={styles.stickerSection}>
          <div style={styles.sticker}>
            <div style={styles.stickerHeader}>{SHOP.name}</div>
            <div style={styles.stickerAddress}>{SHOP.fullAddress}</div>

            <div style={styles.stickerDivider} />

            <div style={styles.stickerRow}>
              <span style={styles.stickerLabel}>DATE:</span>
              <span style={styles.stickerValue}>{formatDate()}</span>
            </div>
            <div style={styles.stickerRow}>
              <span style={styles.stickerLabel}>MILEAGE:</span>
              <span style={styles.stickerValue}>{formatMileage(currentMileage)} mi</span>
            </div>
            <div style={styles.stickerRow}>
              <span style={styles.stickerLabel}>OIL:</span>
              <span style={styles.stickerValue}>{oilType}</span>
            </div>

            <div style={styles.stickerDividerDashed} />

            <div style={styles.nextServiceSection}>
              <div style={styles.nextServiceLabel}>NEXT SERVICE AT:</div>
              <div style={styles.nextServiceMileage}>{formatMileage(nextServiceMileage)} mi</div>
            </div>

            <div style={styles.stickerDividerDashed} />

            <div style={styles.stickerFooter}>
              Thank you for your
              <br />
              business!
            </div>
          </div>
        </div>

        {/* Section 3: Action Buttons */}
        <div style={styles.actionsSection}>
          <button
            style={styles.reprintButton}
            onClick={handleReprint}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--surface)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            {showReprintFlash ? 'Printed!' : 'Reprint Sticker'}
          </button>
          <button
            style={{
              ...styles.nextButton,
              animation: showPulse ? 'amber-pulse-btn 1.2s ease-in-out infinite' : undefined,
            }}
            onClick={handleNextCustomer}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--amber-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--amber)';
            }}
          >
            Next Customer →
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    minHeight: 'calc(100vh - 64px - 60px - 48px)',
    paddingTop: '48px',
    paddingBottom: '48px',
  },
  wrapper: {
    maxWidth: '600px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '48px',
  },

  // Section 1: Confirmation
  confirmationSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  checkmarkCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'var(--green)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'checkmark-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
  } as React.CSSProperties,
  checkmark: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: 'var(--text-on-accent)',
  },
  confirmationTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
    opacity: 0,
    animation: 'heading-fade 0.4s ease-out 0.35s both forwards',
  } as React.CSSProperties,
  paymentInfo: {
    fontSize: '1.125rem',
    color: 'var(--muted)',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    margin: 0,
    opacity: 0,
    animation: 'slide-up-fade 0.4s ease-out 0.75s both forwards',
  } as React.CSSProperties,

  // Section 2: Sticker
  stickerSection: {
    display: 'flex',
    justifyContent: 'center',
    opacity: 0,
    animation: 'slide-up-fade 0.5s ease-out 0.55s both forwards',
  } as React.CSSProperties,
  sticker: {
    backgroundColor: '#ffffff',
    border: '2px solid #333333',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '380px',
    width: '100%',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    color: '#000000',
    fontSize: '0.9rem',
    lineHeight: 1.6,
  },
  stickerHeader: {
    textAlign: 'center',
    fontSize: '1.125rem',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  stickerAddress: {
    textAlign: 'center',
    fontSize: '0.85rem',
    marginBottom: '16px',
  },
  stickerDivider: {
    height: '1px',
    backgroundColor: '#333333',
    marginTop: '16px',
    marginBottom: '16px',
  },
  stickerDividerDashed: {
    borderTop: '1px dashed #666666',
    marginTop: '16px',
    marginBottom: '16px',
  },
  stickerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  stickerLabel: {
    fontWeight: 'bold',
  },
  stickerValue: {
    textAlign: 'right',
  },
  nextServiceSection: {
    textAlign: 'center',
  },
  nextServiceLabel: {
    fontSize: '0.95rem',
    fontWeight: 'bold',
    color: 'var(--amber)',
    marginBottom: '8px',
  },
  nextServiceMileage: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'var(--amber)',
  },
  stickerFooter: {
    textAlign: 'center',
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },

  // Section 3: Actions
  actionsSection: {
    display: 'flex',
    gap: '16px',
    width: '100%',
    opacity: 0,
    animation: 'slide-up-fade 0.4s ease-out 0.75s both forwards',
  } as React.CSSProperties,
  reprintButton: {
    flex: 1,
    minHeight: '60px',
    backgroundColor: 'transparent',
    border: '2px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  nextButton: {
    flex: 1,
    minHeight: '60px',
    backgroundColor: 'var(--amber)',
    border: 'none',
    borderRadius: '8px',
    color: 'var(--text-on-accent)',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },

  // Error fallback
  noTransactionMessage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '80px 24px',
    gap: '24px',
  },
  errorText: {
    color: 'var(--muted)',
    fontSize: '1rem',
  },
  goBackButton: {
    minHeight: '60px',
    padding: '0 32px',
    fontSize: '16px',
    fontWeight: 600,
    backgroundColor: 'var(--amber)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
};

export default DoneScreen;
