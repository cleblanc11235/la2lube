import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

type PaymentMethod = 'cash' | 'card';

export default function PaymentScreen() {
  const { ticket, setScreen, addTransaction, getCustomerById, getVehicleById } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [tenderedAmount, setTenderedAmount] = useState<string>('');

  // Get customer and vehicle info
  const customer = ticket.customerId ? getCustomerById(ticket.customerId) : null;
  const vehicle =
    ticket.customerId && ticket.vehicleId
      ? getVehicleById(ticket.customerId, ticket.vehicleId)
      : null;

  // Calculate totals
  const subtotal = ticket.selectedServices.reduce((sum, s) => sum + s.price, 0);
  const taxRate = 0.085;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Calculate change
  const tendered = parseFloat(tenderedAmount) || 0;
  const change = tendered - total;
  const canProceedCash = tendered >= total;

  const handleConfirmPayment = () => {
    if (!customer || !vehicle) return;

    if (paymentMethod === 'cash' && !canProceedCash) {
      return;
    }

    // Create transaction
    const transaction = {
      id: crypto.randomUUID(),
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      customerName: customer.name,
      vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      services: ticket.selectedServices.map((s) => s.name),
      paymentMethod,
      total,
    };

    addTransaction(transaction);
    setScreen('done');
  };

  const handleBackToServices = () => {
    setScreen('services');
  };

  if (!customer || !vehicle) {
    return (
      <div style={styles.container}>
        <div style={styles.errorMessage}>No ticket information available</div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div style={styles.container}>
      <div style={styles.layout}>
        {/* Left Column: Invoice */}
        <div style={styles.leftColumn}>
          <div style={styles.invoice}>
            {/* Header */}
            <div style={styles.invoiceHeader}>
              <div style={styles.shopName}>LA 2 Oil &amp; Lube</div>
              <div style={styles.shopInfo}>(318) 608-5331 | 1040 Sterlington Hwy, Farmerville, LA</div>
            </div>

            <div style={styles.divider} />

            {/* Customer & Vehicle Info */}
            <div style={styles.invoiceSection}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Customer:</span>
                <span style={styles.infoValue}>{customer.name}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Vehicle:</span>
                <span style={styles.infoValue}>
                  {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.engine}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Plate:</span>
                <span style={styles.infoValue}>{vehicle.plate}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Mileage:</span>
                <span style={styles.infoValue}>
                  {ticket.currentMileage?.toLocaleString()} mi
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Date:</span>
                <span style={styles.infoValue}>{today}</span>
              </div>
            </div>

            <div style={styles.divider} />

            {/* Line Items */}
            <div style={styles.lineItems}>
              {ticket.selectedServices.map((service) => (
                <div key={service.id} style={styles.lineItem}>
                  <span style={styles.lineItemName}>{service.name}</span>
                  <span style={styles.lineItemPrice}>${service.price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={styles.divider} />

            {/* Totals */}
            <div style={styles.totalsSection}>
              <div style={styles.totalRow}>
                <span>Subtotal:</span>
                <span style={styles.totalAmount}>${subtotal.toFixed(2)}</span>
              </div>
              <div style={styles.totalRow}>
                <span>Tax (8.5%):</span>
                <span style={styles.totalAmount}>${tax.toFixed(2)}</span>
              </div>
              <div style={styles.divider} />
              <div style={styles.grandTotalRow}>
                <span>TOTAL:</span>
                <span style={styles.grandTotalAmount}>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payment */}
        <div style={styles.rightColumn}>
          <div style={styles.paymentCard}>
            {/* Back button */}
            <button style={styles.backButton} onClick={handleBackToServices}>
              ← Back to Services
            </button>

            {/* Payment method selector */}
            <div style={styles.paymentMethodSelector}>
              <button
                style={{
                  ...styles.methodTab,
                  ...(paymentMethod === 'cash' ? styles.methodTabActive : {}),
                }}
                onClick={() => setPaymentMethod('cash')}
              >
                Cash
              </button>
              <button
                style={{
                  ...styles.methodTab,
                  ...(paymentMethod === 'card' ? styles.methodTabActive : {}),
                }}
                onClick={() => setPaymentMethod('card')}
              >
                Card
              </button>
            </div>

            {/* Payment method content */}
            <div style={styles.paymentContent}>
              {paymentMethod === 'cash' ? (
                <>
                  <label style={styles.inputLabel}>Amount Tendered</label>
                  <input
                    type="number"
                    style={styles.tenderedInput}
                    value={tenderedAmount}
                    onChange={(e) => setTenderedAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />

                  <div style={styles.changeSection}>
                    <span style={styles.changeLabel}>Change Due:</span>
                    <span
                      style={{
                        ...styles.changeAmount,
                        color: change >= 0 ? 'var(--green)' : 'var(--orange)',
                      }}
                    >
                      ${change >= 0 ? change.toFixed(2) : '0.00'}
                    </span>
                  </div>

                  <button
                    style={{
                      ...styles.confirmButton,
                      ...(canProceedCash ? {} : styles.confirmButtonDisabled),
                    }}
                    onClick={handleConfirmPayment}
                    disabled={!canProceedCash}
                  >
                    Confirm Payment
                  </button>
                </>
              ) : (
                <>
                  <button style={styles.chargeButton} onClick={handleConfirmPayment}>
                    Charge ${total.toFixed(2)}
                  </button>
                  <div style={styles.cardSubtitle}>Tap to process card payment</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  errorMessage: {
    textAlign: 'center',
    color: 'var(--muted)',
    fontSize: '16px',
    padding: '48px',
  },
  layout: {
    display: 'flex',
    gap: '32px',
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: '1 1 55%',
    minWidth: 0,
  },
  rightColumn: {
    flex: '0 0 45%',
    minWidth: 0,
  },
  invoice: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  invoiceHeader: {
    marginBottom: '20px',
  },
  shopName: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '8px',
  },
  shopInfo: {
    fontSize: '14px',
    color: 'var(--muted)',
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border)',
    margin: '20px 0',
  },
  invoiceSection: {
    marginBottom: '8px',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'baseline',
    marginBottom: '8px',
    fontSize: '15px',
  },
  infoLabel: {
    minWidth: '100px',
    fontWeight: 600,
    color: 'var(--muted)',
  },
  infoValue: {
    color: 'var(--text)',
  },
  lineItems: {
    marginBottom: '8px',
  },
  lineItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '10px',
    fontSize: '15px',
  },
  lineItemName: {
    color: 'var(--text)',
  },
  lineItemPrice: {
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    color: 'var(--text)',
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: '8px',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '15px',
    color: 'var(--muted)',
  },
  totalAmount: {
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    textAlign: 'right',
  },
  grandTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text)',
    marginTop: '8px',
  },
  grandTotalAmount: {
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    color: 'var(--amber)',
    fontSize: '24px',
  },
  paymentCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '24px',
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--muted)',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '8px 0',
    marginBottom: '24px',
    transition: 'color 0.2s',
  },
  paymentMethodSelector: {
    display: 'flex',
    gap: '12px',
    marginBottom: '32px',
  },
  methodTab: {
    flex: 1,
    minHeight: '60px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: 600,
    backgroundColor: 'var(--surface)',
    color: 'var(--muted)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  methodTabActive: {
    backgroundColor: 'var(--accent-bg-medium)',
    borderColor: 'var(--amber)',
    color: 'var(--amber)',
  },
  paymentContent: {
    minHeight: '300px',
  },
  inputLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '12px',
  },
  tenderedInput: {
    width: '100%',
    height: '64px',
    fontSize: '32px',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    textAlign: 'center',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '0 16px',
    marginBottom: '24px',
  },
  changeSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    padding: '16px',
    backgroundColor: 'var(--surface)',
    borderRadius: '8px',
  },
  changeLabel: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text)',
  },
  changeAmount: {
    fontSize: '24px',
    fontWeight: 700,
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
  },
  confirmButton: {
    width: '100%',
    minHeight: '60px',
    fontSize: '16px',
    fontWeight: 600,
    backgroundColor: 'var(--amber)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    backgroundColor: 'var(--muted)',
  },
  chargeButton: {
    width: '100%',
    minHeight: '80px',
    fontSize: '24px',
    fontWeight: 700,
    backgroundColor: 'var(--amber)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    marginBottom: '16px',
  },
  cardSubtitle: {
    textAlign: 'center',
    fontSize: '14px',
    color: 'var(--muted)',
  },
};
