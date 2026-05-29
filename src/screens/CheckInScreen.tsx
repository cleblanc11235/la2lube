import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getRecommendations } from '../data/recommendations';
import { mockCustomers } from '../data/mockData';
import type { Customer, Vehicle } from '../types';
import type { Recommendation } from '../data/recommendations';

type ViewMode = 'search' | 'customer' | 'vehicle' | 'newcustomer';

interface TempCustomer {
  name: string;
  phone: string;
  year: string;
  make: string;
  model: string;
}

export default function CheckInScreen() {
  const { setScreen, setTicket, services, addTempCustomer } = useApp();

  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [currentMileage, setCurrentMileage] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [dismissedRecs, setDismissedRecs] = useState<Set<string>>(new Set());

  // New customer form state
  const [newCustomerForm, setNewCustomerForm] = useState<TempCustomer>({
    name: '',
    phone: '',
    year: '',
    make: '',
    model: '',
  });

  // Search filtering
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return mockCustomers;

    const query = searchQuery.toLowerCase();
    return mockCustomers.filter((customer) => {
      // Match on name
      if (customer.name.toLowerCase().includes(query)) return true;
      // Match on phone
      if (customer.phone.toLowerCase().includes(query)) return true;
      // Match on any vehicle plate
      return customer.vehicles.some((v) => v.plate.toLowerCase().includes(query));
    });
  }, [searchQuery]);

  // Handle customer selection
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewMode('customer');
  };

  // Handle vehicle selection
  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setViewMode('vehicle');
    setCurrentMileage('');
    setRecommendations([]);
    setDismissedRecs(new Set());
  };

  // Handle mileage change
  const handleMileageChange = (value: string) => {
    setCurrentMileage(value);

    if (value.length >= 4 && selectedVehicle) {
      const mileage = parseInt(value, 10);
      if (!isNaN(mileage) && selectedVehicle.serviceHistory.length > 0) {
        const lastService = [...selectedVehicle.serviceHistory].sort((a, b) => b.mileage - a.mileage)[0];
        const recs = getRecommendations(mileage, lastService.mileage);
        setRecommendations(recs);
      }
    }
  };

  // Dismiss recommendation
  const handleDismissRec = (recId: string) => {
    setDismissedRecs((prev) => new Set(prev).add(recId));
  };

  // Add recommendation service to ticket
  const handleAddRecToTicket = (rec: Recommendation) => {
    const service = services.find((s) => s.id === rec.serviceId);
    if (service && selectedCustomer && selectedVehicle) {
      // Navigate to services screen with this service pre-selected
      setTicket({
        customerId: selectedCustomer.id,
        vehicleId: selectedVehicle.id,
        currentMileage: parseInt(currentMileage, 10),
        selectedServices: [service],
        recommendations: recommendations,
      });
      setScreen('services');
    }
  };

  // Proceed to services
  const handleProceedToServices = () => {
    if (selectedCustomer && selectedVehicle && currentMileage) {
      setTicket({
        customerId: selectedCustomer.id,
        vehicleId: selectedVehicle.id,
        currentMileage: parseInt(currentMileage, 10),
        selectedServices: [],
        recommendations: recommendations,
      });
      setScreen('services');
    }
  };

  // Back to search
  const handleBackToSearch = () => {
    setViewMode('search');
    setSearchQuery('');
    setSelectedCustomer(null);
    setSelectedVehicle(null);
    setCurrentMileage('');
    setRecommendations([]);
    setDismissedRecs(new Set());
  };

  // Back to customer
  const handleBackToCustomer = () => {
    setViewMode('customer');
    setSelectedVehicle(null);
    setCurrentMileage('');
    setRecommendations([]);
    setDismissedRecs(new Set());
  };

  // New customer flow
  const handleShowNewCustomerForm = () => {
    setViewMode('newcustomer');
    setNewCustomerForm({ name: '', phone: '', year: '', make: '', model: '' });
  };

  const handleCancelNewCustomer = () => {
    setViewMode('search');
    setNewCustomerForm({ name: '', phone: '', year: '', make: '', model: '' });
  };

  const handleAddNewCustomer = () => {
    // Create a temporary customer object for demo purposes
    const tempCustomer: Customer = {
      id: `temp-${Date.now()}`,
      name: newCustomerForm.name,
      phone: newCustomerForm.phone,
      vehicles: [
        {
          id: `temp-veh-${Date.now()}`,
          year: parseInt(newCustomerForm.year, 10),
          make: newCustomerForm.make,
          model: newCustomerForm.model,
          engine: 'N/A',
          plate: 'NEW',
          serviceHistory: [],
        },
      ],
    };

    addTempCustomer(tempCustomer);
    setSelectedCustomer(tempCustomer);
    setSelectedVehicle(tempCustomer.vehicles[0]);
    setViewMode('vehicle');
    setNewCustomerForm({ name: '', phone: '', year: '', make: '', model: '' });
  };

  const isNewCustomerFormValid =
    newCustomerForm.name.trim() &&
    newCustomerForm.phone.trim() &&
    newCustomerForm.year.trim() &&
    newCustomerForm.make.trim() &&
    newCustomerForm.model.trim();

  // Render search view
  if (viewMode === 'search') {
    return (
      <div style={styles.container}>
        <div style={styles.searchHeader}>
          <input
            type="text"
            placeholder="Search by name, phone, or plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
            autoFocus
          />
          <button
            style={styles.newCustomerButton}
            onClick={handleShowNewCustomerForm}
          >
            New Customer
          </button>
        </div>

        <div style={styles.resultsContainer}>
          {filteredCustomers.length === 0 ? (
            <div style={styles.noResults}>
              <p style={styles.noResultsText}>No customers found</p>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                style={styles.customerCard}
                onClick={() => handleSelectCustomer(customer)}
              >
                <div style={styles.customerName}>{customer.name}</div>
                <div style={styles.customerPhone}>{customer.phone}</div>
                <div style={styles.vehicleChips}>
                  {customer.vehicles.map((vehicle) => (
                    <div key={vehicle.id} style={styles.vehicleChip}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Render new customer form
  if (viewMode === 'newcustomer') {
    return (
      <div style={styles.container}>
        <div style={styles.backBar}>
          <button style={styles.backButton} onClick={handleCancelNewCustomer}>
            ← Back to Search
          </button>
        </div>

        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>New Customer</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Customer Name</label>
            <input
              type="text"
              value={newCustomerForm.name}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
              style={styles.input}
              placeholder="Enter full name"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Phone Number</label>
            <input
              type="tel"
              value={newCustomerForm.phone}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
              style={styles.input}
              placeholder="(318) 555-1234"
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Year</label>
              <input
                type="text"
                value={newCustomerForm.year}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, year: e.target.value })}
                style={styles.input}
                placeholder="2020"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Make</label>
              <input
                type="text"
                value={newCustomerForm.make}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, make: e.target.value })}
                style={styles.input}
                placeholder="Toyota"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Model</label>
              <input
                type="text"
                value={newCustomerForm.model}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, model: e.target.value })}
                style={styles.input}
                placeholder="Camry"
              />
            </div>
          </div>

          <div style={styles.formActions}>
            <button style={styles.cancelButton} onClick={handleCancelNewCustomer}>
              Cancel
            </button>
            <button
              style={{
                ...styles.submitButton,
                ...(isNewCustomerFormValid ? {} : styles.submitButtonDisabled),
              }}
              onClick={handleAddNewCustomer}
              disabled={!isNewCustomerFormValid}
            >
              Add Customer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render customer detail view
  if (viewMode === 'customer' && selectedCustomer) {
    return (
      <div style={styles.container}>
        <div style={styles.backBar}>
          <button style={styles.backButton} onClick={handleBackToSearch}>
            ← Back to Search
          </button>
        </div>

        <div style={styles.customerDetail}>
          <h2 style={styles.customerDetailName}>{selectedCustomer.name}</h2>
          <p style={styles.customerDetailPhone}>{selectedCustomer.phone}</p>
        </div>

        <h3 style={styles.sectionTitle}>Select Vehicle</h3>
        <div style={styles.vehicleList}>
          {selectedCustomer.vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              style={styles.vehicleCard}
              onClick={() => handleSelectVehicle(vehicle)}
            >
              <div style={styles.vehicleCardMain}>
                <span style={styles.vehicleCardTitle}>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </span>
                <span style={styles.vehicleCardEngine}>{vehicle.engine}</span>
              </div>
              <div style={styles.vehicleCardPlate}>{vehicle.plate}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render vehicle + service history view
  if (viewMode === 'vehicle' && selectedCustomer && selectedVehicle) {
    const hasHistory = selectedVehicle.serviceHistory.length > 0;
    const sortedHistory = [...selectedVehicle.serviceHistory].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const canProceed = currentMileage.trim() !== '' && !isNaN(parseInt(currentMileage, 10));

    return (
      <div style={styles.container}>
        <div style={styles.backBar}>
          <button style={styles.backButton} onClick={handleBackToCustomer}>
            ← Back to Customer
          </button>
        </div>

        <div style={styles.vehicleHeader}>
          <h2 style={styles.vehicleHeaderTitle}>
            {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
          </h2>
          <div style={styles.vehicleHeaderMeta}>
            <span style={styles.vehicleHeaderEngine}>{selectedVehicle.engine}</span>
            <span style={styles.vehicleHeaderPlate}>{selectedVehicle.plate}</span>
          </div>
        </div>

        {hasHistory && (
          <>
            <h3 style={styles.sectionTitle}>Service History</h3>
            <div style={styles.historyTimeline}>
              {sortedHistory.map((record, index) => (
                <div key={index} style={styles.timelineEntry}>
                  <div style={styles.timelineRail}>
                    <div style={styles.timelineDot}></div>
                    {index < sortedHistory.length - 1 && (
                      <div style={styles.timelineLine}></div>
                    )}
                  </div>
                  <div style={styles.timelineCard}>
                    <div style={styles.timelineCardHeader}>
                      <span style={styles.timelineCardDate}>
                        {new Date(record.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <div style={styles.timelineCardMileageRow}>
                        <span style={styles.timelineCardMileage}>
                          {record.mileage.toLocaleString()} mi
                        </span>
                        {record.mileage >= 80000 && (
                          <span style={styles.highMiBadge}>HIGH MI</span>
                        )}
                      </div>
                    </div>
                    <div style={styles.timelineCardServices}>
                      {record.services.map((service, idx) => (
                        <div key={idx} style={styles.servicePill}>
                          {service}
                        </div>
                      ))}
                    </div>
                    <div style={styles.timelineCardTotal}>
                      Total: ${record.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <h3 style={styles.sectionTitle}>Current Mileage</h3>
        <input
          type="number"
          placeholder="Enter current mileage"
          value={currentMileage}
          onChange={(e) => handleMileageChange(e.target.value)}
          style={styles.mileageInput}
        />

        {recommendations.length > 0 && (
          <div style={styles.recommendationsContainer}>
            <h3 style={styles.sectionTitle}>Recommended Services</h3>
            {recommendations
              .filter((rec) => !dismissedRecs.has(rec.id))
              .map((rec) => (
                <div key={rec.id} style={styles.recBanner}>
                  <div style={styles.recContent}>
                    <div style={styles.recTitle}>{rec.service}</div>
                    <div style={styles.recReason}>{rec.reason}</div>
                  </div>
                  <div style={styles.recActions}>
                    <button
                      style={styles.recAddButton}
                      onClick={() => handleAddRecToTicket(rec)}
                    >
                      Add to Ticket
                    </button>
                    <button
                      style={styles.recDismissButton}
                      onClick={() => handleDismissRec(rec.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        <button
          style={{
            ...styles.proceedButton,
            ...(canProceed ? {} : styles.proceedButtonDisabled),
          }}
          onClick={handleProceedToServices}
          disabled={!canProceed}
        >
          Proceed to Services →
        </button>
      </div>
    );
  }

  return null;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  searchHeader: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
  },
  searchInput: {
    flex: 1,
    height: '60px',
    padding: '0 20px',
    fontSize: '18px',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  newCustomerButton: {
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
    whiteSpace: 'nowrap',
  },
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  noResults: {
    textAlign: 'center',
    padding: '48px',
  },
  noResultsText: {
    fontSize: '18px',
    color: 'var(--muted)',
  },
  customerCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  customerName: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '8px',
  },
  customerPhone: {
    fontSize: '16px',
    color: 'var(--muted)',
    marginBottom: '16px',
  },
  vehicleChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  vehicleChip: {
    padding: '6px 12px',
    fontSize: '14px',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
  },
  backBar: {
    marginBottom: '24px',
  },
  backButton: {
    minHeight: '48px',
    padding: '0 20px',
    fontSize: '16px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: 'var(--amber)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  customerDetail: {
    marginBottom: '32px',
  },
  customerDetailName: {
    fontSize: '32px',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '8px',
  },
  customerDetailPhone: {
    fontSize: '18px',
    color: 'var(--muted)',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--mauve)',
    marginTop: '32px',
    marginBottom: '16px',
  },
  vehicleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  vehicleCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleCardMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  vehicleCardTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text)',
  },
  vehicleCardEngine: {
    fontSize: '14px',
    color: 'var(--muted)',
  },
  vehicleCardPlate: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--amber)',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
  },
  vehicleHeader: {
    marginBottom: '24px',
  },
  vehicleHeaderTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '8px',
  },
  vehicleHeaderMeta: {
    display: 'flex',
    gap: '16px',
  },
  vehicleHeaderEngine: {
    fontSize: '16px',
    color: 'var(--muted)',
  },
  vehicleHeaderPlate: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--amber)',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
  },
  historyTimeline: {
    display: 'flex',
    flexDirection: 'column',
  },
  timelineEntry: {
    display: 'flex',
    gap: '20px',
  },
  timelineRail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: 'var(--amber)',
    flexShrink: 0,
    marginTop: '6px',
  },
  timelineLine: {
    width: '2px',
    flexGrow: 1,
    backgroundColor: 'var(--border)',
    minHeight: '40px',
  },
  timelineCard: {
    flex: 1,
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
  },
  timelineCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  timelineCardDate: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  timelineCardMileageRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  timelineCardMileage: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--amber)',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
  },
  highMiBadge: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--amber)',
    backgroundColor: 'var(--accent-bg-soft)',
    border: '1px solid var(--amber)',
    borderRadius: '4px',
    padding: '2px 6px',
    letterSpacing: '0.5px',
  },
  timelineCardServices: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
  },
  servicePill: {
    fontSize: '12px',
    color: 'var(--text)',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '4px 10px',
  },
  timelineCardTotal: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--muted)',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    textAlign: 'right',
  },
  mileageInput: {
    width: '100%',
    minHeight: '60px',
    padding: '0 20px',
    fontSize: '20px',
    backgroundColor: 'var(--surface)',
    border: '2px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    outline: 'none',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    transition: 'border-color 0.2s',
  },
  recommendationsContainer: {
    marginTop: '16px',
  },
  recBanner: {
    backgroundColor: 'var(--accent-bg-soft)',
    border: '1px solid var(--amber)',
    borderLeft: '4px solid var(--amber)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  recContent: {
    flex: 1,
  },
  recTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '4px',
  },
  recReason: {
    fontSize: '14px',
    color: 'var(--muted)',
  },
  recActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  recAddButton: {
    minHeight: '48px',
    padding: '0 20px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: 'var(--amber)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    whiteSpace: 'nowrap',
  },
  recDismissButton: {
    width: '32px',
    height: '32px',
    fontSize: '24px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: 'var(--muted)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proceedButton: {
    width: '100%',
    minHeight: '60px',
    marginTop: '32px',
    fontSize: '18px',
    fontWeight: 600,
    backgroundColor: 'var(--amber)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  proceedButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  formCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  formTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '24px',
  },
  formGroup: {
    marginBottom: '20px',
    flex: 1,
  },
  formRow: {
    display: 'flex',
    gap: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    minHeight: '48px',
    padding: '0 16px',
    fontSize: '16px',
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '32px',
  },
  cancelButton: {
    flex: 1,
    minHeight: '60px',
    fontSize: '16px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  submitButton: {
    flex: 1,
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
  submitButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
