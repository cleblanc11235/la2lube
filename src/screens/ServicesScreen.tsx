import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Service } from '../types';

export default function ServicesScreen() {
  const { ticket, setTicket, setScreen, services, getCustomerById, getVehicleById } = useApp();

  // Hover state for service buttons
  const [hoveredServiceId, setHoveredServiceId] = useState<string | null>(null);

  // Get customer and vehicle info
  const customer = ticket.customerId ? getCustomerById(ticket.customerId) : null;
  const vehicle =
    ticket.customerId && ticket.vehicleId
      ? getVehicleById(ticket.customerId, ticket.vehicleId)
      : null;

  // Group services by category
  const oilChangeServices = services.filter((s) => s.category === 'oilchange');
  const fluidServices = services.filter((s) => s.category === 'fluid');
  const addonServices = services.filter((s) => s.category === 'addon');

  // Check if a service is selected
  const isServiceSelected = (serviceId: string): boolean => {
    return ticket.selectedServices.some((s) => s.id === serviceId);
  };

  // Toggle service selection
  const toggleService = (service: Service) => {
    const isSelected = isServiceSelected(service.id);
    let updatedServices: Service[];

    if (isSelected) {
      // Remove the service
      updatedServices = ticket.selectedServices.filter((s) => s.id !== service.id);
    } else {
      // For oil change category, only one can be selected at a time
      if (service.category === 'oilchange') {
        // Remove any existing oil change service
        const withoutOilChange = ticket.selectedServices.filter((s) => s.category !== 'oilchange');
        updatedServices = [...withoutOilChange, service];
      } else {
        // For other categories, just add it
        updatedServices = [...ticket.selectedServices, service];
      }
    }

    setTicket({ selectedServices: updatedServices });
  };

  // Remove service from order summary
  const removeService = (serviceId: string) => {
    const updatedServices = ticket.selectedServices.filter((s) => s.id !== serviceId);
    setTicket({ selectedServices: updatedServices });
  };

  // Calculate totals
  const subtotal = ticket.selectedServices.reduce((sum, s) => sum + s.price, 0);
  const taxRate = 0.085;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Proceed to payment
  const handleProceedToPayment = () => {
    if (ticket.selectedServices.length > 0) {
      setScreen('payment');
    }
  };

  const hasRecommendations = ticket.recommendations && ticket.recommendations.length > 0;

  // Handle case where user navigates here without an active ticket
  if (!customer || !vehicle) {
    return (
      <div style={styles.container}>
        <div style={styles.noTicketMessage}>
          <h2 style={styles.noTicketTitle}>No Active Ticket</h2>
          <p style={styles.noTicketText}>Please start by checking in a customer.</p>
          <button
            style={styles.goToCheckInButton}
            onClick={() => setScreen('checkin')}
          >
            Go to Check-In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Recommendation banner */}
      {hasRecommendations && (
        <div style={styles.recBanner}>
          {ticket.recommendations.length} recommendation{ticket.recommendations.length > 1 ? 's' : ''}{' '}
          available based on service history
        </div>
      )}

      <p style={styles.honestyNote}>
        Add only what the customer agreed to — explain anything you add before payment.
      </p>

      <div style={styles.layout} className="services-layout">
        {/* Left column: Service grid */}
        <div style={styles.leftColumn}>
          {/* Oil Change section */}
          <div style={styles.section}>
            <h2 style={styles.sectionHeader}>OIL CHANGE</h2>
            <div style={styles.serviceGrid}>
              {oilChangeServices.map((service) => (
                <ServiceButton
                  key={service.id}
                  service={service}
                  isSelected={isServiceSelected(service.id)}
                  isHovered={hoveredServiceId === service.id}
                  onClick={() => toggleService(service)}
                  onMouseEnter={() => setHoveredServiceId(service.id)}
                  onMouseLeave={() => setHoveredServiceId(null)}
                />
              ))}
            </div>
          </div>

          {/* Fluid Services section */}
          <div style={styles.section}>
            <h2 style={styles.sectionHeader}>FLUID SERVICES</h2>
            <div style={styles.serviceGrid}>
              {fluidServices.map((service) => (
                <ServiceButton
                  key={service.id}
                  service={service}
                  isSelected={isServiceSelected(service.id)}
                  isHovered={hoveredServiceId === service.id}
                  onClick={() => toggleService(service)}
                  onMouseEnter={() => setHoveredServiceId(service.id)}
                  onMouseLeave={() => setHoveredServiceId(null)}
                />
              ))}
            </div>
          </div>

          {/* Filters & Add-ons section */}
          <div style={styles.section}>
            <h2 style={styles.sectionHeader}>FILTERS & ADD-ONS</h2>
            <div style={styles.serviceGrid}>
              {addonServices.map((service) => (
                <ServiceButton
                  key={service.id}
                  service={service}
                  isSelected={isServiceSelected(service.id)}
                  isHovered={hoveredServiceId === service.id}
                  onClick={() => toggleService(service)}
                  onMouseEnter={() => setHoveredServiceId(service.id)}
                  onMouseLeave={() => setHoveredServiceId(null)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Order sidebar */}
        <div style={styles.rightColumn}>
          <div style={styles.sidebar}>
            <h2 style={styles.sidebarHeader}>Order Summary</h2>

            {/* Customer and vehicle info */}
            {customer && vehicle && (
              <div style={styles.customerInfo}>
                <div style={styles.customerName}>{customer.name}</div>
                <div style={styles.vehicleInfo}>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </div>
                {ticket.currentMileage && (
                  <div style={styles.mileageInfo}>
                    {ticket.currentMileage.toLocaleString()} mi
                  </div>
                )}
              </div>
            )}

            {/* Line items */}
            {ticket.selectedServices.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.4 }}>🔧</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No services selected</div>
              </div>
            ) : (
              <>
                <div style={styles.lineItems}>
                  {ticket.selectedServices.map((service) => (
                    <div key={service.id} style={styles.lineItem}>
                      <div style={styles.lineItemContent}>
                        <div style={styles.lineItemName}>{service.name}</div>
                        <div style={styles.lineItemPrice}>
                          ${service.price.toFixed(2)}
                        </div>
                      </div>
                      <button
                        style={styles.removeButton}
                        onClick={() => removeService(service.id)}
                        aria-label={`Remove ${service.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div style={styles.totals}>
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
                    <span>Total:</span>
                    <span style={styles.grandTotalAmount}>${total.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Proceed button */}
            <button
              style={{
                ...styles.proceedButton,
                ...(ticket.selectedServices.length === 0 ? styles.proceedButtonDisabled : {}),
              }}
              onClick={handleProceedToPayment}
              disabled={ticket.selectedServices.length === 0}
            >
              Proceed to Payment →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ServiceButtonProps {
  service: Service;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function ServiceButton({ service, isSelected, isHovered, onClick, onMouseEnter, onMouseLeave }: ServiceButtonProps) {
  const isFree = service.price === 0;

  return (
    <button
      style={{
        ...styles.serviceButton,
        ...(isSelected ? styles.serviceButtonSelected : {}),
        ...(isHovered && !isSelected ? styles.serviceButtonHover : {}),
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div style={isSelected ? styles.serviceNameSelected : styles.serviceName}>
        {service.name}
      </div>
      <div style={styles.servicePrice}>
        {isFree ? 'FREE' : `$${service.price.toFixed(2)}`}
      </div>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  recBanner: {
    backgroundColor: 'var(--accent-bg-soft)',
    border: '1px solid var(--amber)',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '12px',
    fontSize: '14px',
    color: 'var(--text)',
    textAlign: 'center',
  },
  honestyNote: {
    fontSize: '13px',
    color: 'var(--muted)',
    marginBottom: '20px',
    textAlign: 'center',
    lineHeight: 1.45,
  },
  layout: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 1,
    minWidth: 0,
  },
  rightColumn: {
    width: '360px',
    flexShrink: 0,
  },
  section: {
    marginBottom: '40px',
  },
  sectionHeader: {
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--mauve)',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '12px',
    marginBottom: '16px',
  },
  serviceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  serviceButton: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '16px',
    minHeight: '72px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '8px',
    textAlign: 'left',
  },
  serviceButtonHover: {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 16px rgba(17, 17, 27, 0.5)',
    borderColor: 'var(--ctp-overlay0)',
  },
  serviceButtonSelected: {
    backgroundColor: 'var(--accent-bg-strong)',
    borderColor: 'var(--amber)',
    boxShadow: '0 0 16px var(--accent-glow), 0 2px 8px rgba(17, 17, 27, 0.4)',
  },
  serviceName: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text)',
  },
  serviceNameSelected: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--amber)',
  },
  servicePrice: {
    fontSize: '14px',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    color: 'var(--muted)',
  },
  sidebar: {
    position: 'sticky',
    top: '80px',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '24px',
    maxHeight: 'calc(100vh - 160px)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  sidebarHeader: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '16px',
  },
  customerInfo: {
    paddingBottom: '16px',
    marginBottom: '16px',
    borderBottom: '1px solid var(--border)',
  },
  customerName: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '4px',
  },
  vehicleInfo: {
    fontSize: '14px',
    color: 'var(--muted)',
    marginBottom: '2px',
  },
  mileageInfo: {
    fontSize: '14px',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    color: 'var(--teal)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '32px 16px',
  },
  lineItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  lineItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  lineItemContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '8px',
  },
  lineItemName: {
    fontSize: '14px',
    color: 'var(--text)',
  },
  lineItemPrice: {
    fontSize: '14px',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    color: 'var(--text)',
    textAlign: 'right',
    flexShrink: 0,
  },
  removeButton: {
    width: '24px',
    height: '24px',
    fontSize: '20px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: 'var(--muted)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  totals: {
    borderTop: '1px solid var(--border)',
    paddingTop: '16px',
    marginBottom: '20px',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '14px',
    color: 'var(--muted)',
  },
  totalAmount: {
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    textAlign: 'right',
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border)',
    margin: '12px 0',
  },
  grandTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  grandTotalAmount: {
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    color: 'var(--amber)',
    fontSize: '20px',
  },
  proceedButton: {
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
    marginTop: 'auto',
  },
  proceedButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    backgroundColor: 'var(--muted)',
  },
  noTicketMessage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '80px 24px',
  },
  noTicketTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '12px',
  },
  noTicketText: {
    fontSize: '16px',
    color: 'var(--muted)',
    marginBottom: '24px',
  },
  goToCheckInButton: {
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
