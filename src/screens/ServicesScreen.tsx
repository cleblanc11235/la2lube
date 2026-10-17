import React, { useState } from 'react';
import { customerLabel, useApp, vehicleLabel } from '../context/AppContext';
import type { Service } from '../types';
import { BAY_COUNT, TAX_LABEL, TAX_RATE } from '../config/shopSettings';
import { ticketTotals } from '../data/money';
import { INCLUDED_QUARTS, oilChangeLines, oilTypes, type OilType } from '../config/serviceMenu';

const MAX_QUARTS = 20;

const ALL_BAYS = Array.from({ length: BAY_COUNT }, (_, i) => i + 1);

export default function ServicesScreen() {
  const {
    ticket,
    setTicket,
    setScreen,
    services,
    openTickets,
    sendTicketToBay,
    saveTicketLines,
    getCustomerById,
    getVehicleById,
  } = useApp();

  // Hover state for service buttons
  const [hoveredServiceId, setHoveredServiceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Editing a ticket that's already saved (reached from Payment to add something
  // found during the job), rather than building a new one at check-in.
  const editingSavedTicket = ticket.ticketId !== null;

  // Get customer and vehicle info
  const customer = ticket.customerId ? getCustomerById(ticket.customerId) : null;
  const vehicle =
    ticket.customerId && ticket.vehicleId
      ? getVehicleById(ticket.customerId, ticket.vehicleId)
      : null;

  const [otherName, setOtherName] = useState('');
  const [otherPrice, setOtherPrice] = useState('');

  // The oil change is the 'oilchange' line that isn't the extra-quarts line.
  const oilLine = ticket.selectedServices.find((s) => s.category === 'oilchange' && !s.id.endsWith('-extra'));
  const selectedOil = oilLine ? oilTypes.find((t) => t.id === oilLine.id) : undefined;
  const selectedWeight = oilLine?.oilWeight;
  const quarts = oilLine?.quarts ?? INCLUDED_QUARTS;

  /** Replace the oil change lines, keeping everything else on the ticket. */
  const setOil = (oil: OilType | undefined, weight?: string, qts = INCLUDED_QUARTS) => {
    const others = ticket.selectedServices.filter((s) => s.category !== 'oilchange');
    setTicket({ selectedServices: oil ? [...oilChangeLines(oil, weight, qts), ...others] : others });
  };

  const pickOil = (oil: OilType) => {
    if (selectedOil?.id === oil.id) {
      setOil(undefined);
      return;
    }
    // Switching oil keeps the weight if the new oil comes in it, and the quart count.
    const weight = oil.grades.some((g) => g.weight === selectedWeight) ? selectedWeight : undefined;
    setOil(oil, weight, quarts);
  };

  const otherPriceValue = Number(otherPrice);
  const canAddOther = otherName.trim() !== '' && otherPrice.trim() !== '' && otherPriceValue >= 0;

  const addOther = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddOther) return;
    const item: Service = {
      id: `custom-${Date.now()}`,
      name: otherName.trim(),
      price: Math.round(otherPriceValue * 100) / 100,
      category: 'addon',
    };
    setTicket({ selectedServices: [...ticket.selectedServices, item] });
    setOtherName('');
    setOtherPrice('');
  };

  // Group services by category
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
      updatedServices = [...ticket.selectedServices, service];
    }

    setTicket({ selectedServices: updatedServices });
  };

  // Remove service from order summary
  const removeService = (serviceId: string) => {
    if (selectedOil && serviceId === selectedOil.id) {
      setOil(undefined);
      return;
    }
    if (selectedOil && serviceId === `${selectedOil.id}-extra`) {
      setOil(selectedOil, selectedWeight, INCLUDED_QUARTS);
      return;
    }
    const updatedServices = ticket.selectedServices.filter((s) => s.id !== serviceId);
    setTicket({ selectedServices: updatedServices });
  };

  // Calculate totals
  const { subtotal, tax, total } = ticketTotals(ticket.selectedServices, TAX_RATE);

  const takenBays = new Set(
    openTickets.filter((t) => t.status === 'waiting' || t.status === 'in_progress').map((t) => t.bay)
  );
  const emptyBays = ALL_BAYS.filter((bay) => !takenBays.has(bay));
  const canSendToBay = ticket.selectedServices.length > 0 && !saving;

  const run = async (action: () => Promise<void>, failMessage: string) => {
    setSaving(true);
    setSaveError(null);
    try {
      await action();
    } catch (e) {
      setSaveError(e instanceof Error && e.name === 'BayTakenError' ? e.message : failMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSendToBay = (bay: number) =>
    run(() => sendTicketToBay(bay), "Couldn't save the ticket. Check the internet connection and try again.");

  const handleSaveChanges = () =>
    run(saveTicketLines, "Couldn't save the changes. Check the internet connection and try again.");

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
              {oilTypes.map((oil) => {
                const isSelected = selectedOil?.id === oil.id;
                return (
                  <button
                    key={oil.id}
                    style={{ ...styles.serviceButton, ...(isSelected ? styles.serviceButtonSelected : {}) }}
                    onClick={() => pickOil(oil)}
                    aria-pressed={isSelected}
                  >
                    <div style={isSelected ? styles.serviceNameSelected : styles.serviceName}>{oil.name}</div>
                    <div style={styles.servicePrice}>
                      {INCLUDED_QUARTS} qt ${oil.basePrice.toFixed(2)} · +${oil.extraQuartPrice.toFixed(2)}/qt
                    </div>
                    <div style={styles.codeTag}>DataLube {oil.code}</div>
                  </button>
                );
              })}
            </div>

            {selectedOil && (
              <>
                <h3 style={styles.subHeader}>WEIGHT</h3>
                <div style={styles.gradeGrid}>
                  {selectedOil.grades.map((g) => {
                    const isSelected = selectedWeight === g.weight;
                    return (
                      <button
                        key={g.weight}
                        style={{ ...styles.gradeButton, ...(isSelected ? styles.serviceButtonSelected : {}) }}
                        onClick={() => setOil(selectedOil, isSelected ? undefined : g.weight, quarts)}
                        aria-pressed={isSelected}
                      >
                        <div style={isSelected ? styles.serviceNameSelected : styles.serviceName}>{g.weight}</div>
                        <div style={styles.codeTag}>{g.code}</div>
                      </button>
                    );
                  })}
                </div>

                <h3 style={styles.subHeader}>QUARTS</h3>
                <div style={styles.quartRow}>
                  <button
                    style={styles.stepButton}
                    onClick={() => setOil(selectedOil, selectedWeight, quarts - 1)}
                    disabled={quarts <= INCLUDED_QUARTS}
                    aria-label="One less quart"
                  >
                    −
                  </button>
                  <div style={styles.quartCount} aria-label="Quarts">
                    {quarts} qt
                  </div>
                  <button
                    style={styles.stepButton}
                    onClick={() => setOil(selectedOil, selectedWeight, quarts + 1)}
                    disabled={quarts >= MAX_QUARTS}
                    aria-label="One more quart"
                  >
                    +
                  </button>
                  <div style={styles.quartNote}>
                    {quarts > INCLUDED_QUARTS
                      ? `${quarts - INCLUDED_QUARTS} extra × $${selectedOil.extraQuartPrice.toFixed(2)} (${selectedOil.extraQuartCode})`
                      : `${INCLUDED_QUARTS} qt included`}
                  </div>
                </div>
              </>
            )}
          </div>

          {fluidServices.length > 0 && (
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
          )}

          {addonServices.length > 0 && (
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
          )}

          {/* Anything not on the menu */}
          <div style={styles.section}>
            <h2 style={styles.sectionHeader}>OTHER ITEM</h2>
            <form style={styles.otherForm} onSubmit={addOther}>
              <input
                style={{ ...styles.otherInput, flex: 2 }}
                placeholder="What is it? (e.g. Wiper blades)"
                aria-label="Other item description"
                value={otherName}
                onChange={(e) => setOtherName(e.target.value)}
              />
              <input
                style={{ ...styles.otherInput, flex: 1, fontFamily: styles.servicePrice.fontFamily, textAlign: 'right' }}
                placeholder="$0.00"
                aria-label="Other item price"
                inputMode="decimal"
                value={otherPrice}
                onChange={(e) => setOtherPrice(e.target.value.replace(/[^0-9.]/g, ''))}
              />
              <button
                type="submit"
                style={{ ...styles.addOtherButton, ...(canAddOther ? {} : styles.proceedButtonDisabled) }}
                disabled={!canAddOther}
              >
                Add
              </button>
            </form>
          </div>
        </div>

        {/* Right column: Order sidebar */}
        <div style={styles.rightColumn}>
          <div style={styles.sidebar}>
            <h2 style={styles.sidebarHeader}>Order Summary</h2>

            {/* Customer and vehicle info */}
            {customer && vehicle && (
              <div style={styles.customerInfo}>
                <div style={styles.customerName}>{customerLabel(customer)}</div>
                <div style={styles.vehicleInfo}>
                  {vehicleLabel(vehicle)}
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
                    <span>Tax ({TAX_LABEL}):</span>
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

            {saveError && (
              <div style={styles.noBaysMessage} role="alert">
                {saveError}
              </div>
            )}

            {editingSavedTicket ? (
              <button
                style={{
                  ...styles.proceedButton,
                  ...(canSendToBay ? {} : styles.proceedButtonDisabled),
                }}
                onClick={handleSaveChanges}
                disabled={!canSendToBay}
              >
                {saving ? 'Saving…' : 'Save Changes → Payment'}
              </button>
            ) : emptyBays.length === 0 ? (
              <div style={styles.noBaysMessage}>All bays are full — wait for one to open up.</div>
            ) : (
              emptyBays.map((bay) => (
                <button
                  key={bay}
                  style={{
                    ...styles.proceedButton,
                    ...(canSendToBay ? {} : styles.proceedButtonDisabled),
                  }}
                  onClick={() => handleSendToBay(bay)}
                  disabled={!canSendToBay}
                >
                  Send to Bay {bay} →
                </button>
              ))
            )}
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
  codeTag: {
    fontSize: '12px',
    color: 'var(--muted)',
    letterSpacing: '0.04em',
  },
  subHeader: {
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: 'var(--muted)',
    margin: '24px 0 12px',
  },
  gradeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
    gap: '10px',
  },
  gradeButton: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '10px',
    minHeight: '64px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
  quartRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  stepButton: {
    width: '64px',
    height: '64px',
    fontSize: '28px',
    fontWeight: 600,
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  quartCount: {
    minWidth: '80px',
    textAlign: 'center',
    fontSize: '24px',
    fontWeight: 700,
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    color: 'var(--text)',
  },
  quartNote: {
    fontSize: '14px',
    color: 'var(--muted)',
  },
  otherForm: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  otherInput: {
    minWidth: '120px',
    minHeight: '60px',
    padding: '0 14px',
    fontSize: '16px',
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
  },
  addOtherButton: {
    minHeight: '60px',
    padding: '0 28px',
    fontSize: '16px',
    fontWeight: 600,
    backgroundColor: 'var(--amber)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
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
  noBaysMessage: {
    textAlign: 'center',
    fontSize: '14px',
    color: 'var(--orange)',
    padding: '16px',
    marginTop: 'auto',
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
