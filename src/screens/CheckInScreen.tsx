import React, { useState, useMemo, useRef, useEffect } from 'react';
import { customerLabel, useApp, vehicleLabel } from '../context/AppContext';
import { getRecommendations } from '../data/recommendations';
import {
  extractPlateCandidates,
  findPlateMatches,
  matchScannedText,
  normalizePlate,
} from '../data/plates';
import { scanPlatePhoto, warmUpPlateScanner } from '../data/plateScanner';
import type { Customer, Ticket, Vehicle } from '../types';
import type { Recommendation } from '../data/recommendations';

type ViewMode = 'search' | 'customer' | 'vehicle' | 'newcustomer' | 'newvehicle';

// With an empty search box, show only the most recently added customers
// rather than everyone on file.
const RECENT_LIMIT = 20;

// "(318) 555-1234", "318-555-1234" and "3185551234" are the same phone number.
const digitsOnly = (text: string) => text.replace(/\D/g, '');
const looksLikePhone = (text: string) => /^[\d\s()+.-]+$/.test(text) && digitsOnly(text).length >= 3;

interface TempCustomer {
  name: string;
  phone: string;
  plate: string;
  year: string;
  make: string;
  model: string;
}

const EMPTY_NEW_CUSTOMER: TempCustomer = { name: '', phone: '', plate: '', year: '', make: '', model: '' };

// "LSU4477" and "LSU 4477" are the same plate; typed or scanned input often
// has no space, so compare with spaces and dashes removed.
const looksLikePlate = (text: string) => {
  const plate = normalizePlate(text);
  return plate.length >= 2 && plate.length <= 8 && !looksLikePhone(text);
};

type ScanState =
  | { status: 'idle' }
  | { status: 'scanning' }
  | { status: 'error'; message: string };

export default function CheckInScreen() {
  const { setScreen, setTicket, services, customers, customersLoaded, addCustomer, addVehicle, getVehicleHistory } =
    useApp();

  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  // Paid visits for the selected vehicle; null while loading.
  const [history, setHistory] = useState<Ticket[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const historyRequestRef = useRef(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [currentMileage, setCurrentMileage] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [dismissedRecs, setDismissedRecs] = useState<Set<string>>(new Set());

  // Plate scanning (phone camera -> OCR -> search box)
  const [scan, setScan] = useState<ScanState>({ status: 'idle' });
  const [plateFromScan, setPlateFromScan] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  // Bumped on every scan and on cancel, so a result that arrives late is dropped.
  const scanRunRef = useRef(0);

  // Hover states for cards
  const [hoveredCustomerId, setHoveredCustomerId] = useState<string | null>(null);
  const [hoveredVehicleId, setHoveredVehicleId] = useState<string | null>(null);

  // New customer form state
  const [newCustomerForm, setNewCustomerForm] = useState<TempCustomer>(EMPTY_NEW_CUSTOMER);

  // Search filtering
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers.slice(0, RECENT_LIMIT);

    const query = searchQuery.toLowerCase();
    const plateQuery = normalizePlate(searchQuery);
    const phoneQuery = looksLikePhone(searchQuery) ? digitsOnly(searchQuery) : '';
    return customers.filter((customer) => {
      // Match on name
      if (customer.name.toLowerCase().includes(query)) return true;
      // Match on phone, however it was typed
      if (customer.phone.toLowerCase().includes(query)) return true;
      if (phoneQuery && digitsOnly(customer.phone).includes(phoneQuery)) return true;
      // Match on any vehicle plate, ignoring spaces and dashes
      return customer.vehicles.some(
        (v) =>
          v.plate.toLowerCase().includes(query) ||
          (plateQuery !== '' && normalizePlate(v.plate).includes(plateQuery))
      );
    });
  }, [searchQuery, customers]);

  // The plate typed matches a vehicle on file: offer to open it straight away.
  const exactPlateMatch = useMemo(() => {
    const plate = normalizePlate(searchQuery);
    if (plate.length < 2) return null;
    for (const customer of customers) {
      const vehicle = customer.vehicles.find((v) => normalizePlate(v.plate) === plate);
      if (vehicle) return { customer, vehicle };
    }
    return null;
  }, [searchQuery, customers]);

  // "Did you mean?" — plates that are one character off what was typed or
  // scanned. Only offered when nothing matched outright.
  const nearPlateMatches = useMemo(() => {
    if (filteredCustomers.length > 0) return [];
    return findPlateMatches(searchQuery, customers).near;
  }, [searchQuery, filteredCustomers, customers]);

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
    setHistory(null);
    setHistoryError(false);
    const request = ++historyRequestRef.current;
    getVehicleHistory(vehicle.id)
      .then((visits) => {
        // Ignore if they've already moved on to another vehicle.
        if (request === historyRequestRef.current) setHistory(visits);
      })
      .catch(() => {
        if (request !== historyRequestRef.current) return;
        setHistory([]);
        setHistoryError(true);
      });
  };

  const updateRecommendations = (mileageText: string, visits: Ticket[] | null) => {
    const mileage = parseInt(mileageText, 10);
    if (mileageText.length >= 4 && !isNaN(mileage) && visits) {
      setRecommendations(getRecommendations(mileage, visits));
    } else {
      setRecommendations([]);
    }
  };

  // Mileage may be typed before the history finishes loading.
  useEffect(() => {
    updateRecommendations(currentMileage, history);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  // Handle mileage change
  const handleMileageChange = (value: string) => {
    setCurrentMileage(value);
    updateRecommendations(value, history);
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

  // --- Plate scanning -------------------------------------------------------

  const openVehicle = (customer: Customer, vehicle: Vehicle) => {
    setSelectedCustomer(customer);
    handleSelectVehicle(vehicle);
  };

  const handleScanClick = () => {
    // Begin fetching the OCR engine now; the camera takes a few seconds anyway.
    warmUpPlateScanner();
    photoInputRef.current?.click();
  };

  const handlePhotoChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so taking a second photo of the same plate still fires onChange.
    e.target.value = '';
    if (!file) return;

    const run = ++scanRunRef.current;
    setScan({ status: 'scanning' });

    try {
      const text = await scanPlatePhoto(file, (t) => {
        const hit = matchScannedText(t, customers);
        return !!hit && hit.matches.exact.length > 0;
      });
      if (run !== scanRunRef.current) return; // cancelled

      const hit = matchScannedText(text, customers);

      // One clear match: go straight to that vehicle.
      if (hit && hit.matches.exact.length === 1) {
        const { customer, vehicle } = hit.matches.exact[0];
        setScan({ status: 'idle' });
        setPlateFromScan(false);
        openVehicle(customer, vehicle);
        return;
      }

      // Otherwise put the best reading in the search box. It can be corrected
      // by hand, and the normal results list (plus near matches) does the rest.
      const plate = hit?.plate ?? extractPlateCandidates(text)[0];
      if (!plate) {
        setScan({
          status: 'error',
          message: "Couldn't find a plate in that photo. Get closer, keep the plate level, and avoid glare.",
        });
        return;
      }
      setSearchQuery(plate);
      setPlateFromScan(true);
      setScan({ status: 'idle' });
    } catch {
      if (run !== scanRunRef.current) return;
      setScan({
        status: 'error',
        message: "Couldn't read the photo. Check the phone has internet the first time you scan, or type the plate in.",
      });
    }
  };

  const handleCancelScan = () => {
    scanRunRef.current++;
    setScan({ status: 'idle' });
  };

  // Back to search
  const handleBackToSearch = () => {
    setViewMode('search');
    setSearchQuery('');
    setPlateFromScan(false);
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
  const handleShowNewCustomerForm = (plate: string = '') => {
    setViewMode('newcustomer');
    setNewCustomerForm({ ...EMPTY_NEW_CUSTOMER, plate });
  };

  const handleCancelNewCustomer = () => {
    setViewMode('search');
    setNewCustomerForm(EMPTY_NEW_CUSTOMER);
    setFormError(null);
  };

  const vehicleFromForm = () => ({
    year: parseInt(newCustomerForm.year, 10) || 0,
    make: newCustomerForm.make.trim(),
    model: newCustomerForm.model.trim(),
    engine: '',
    plate: newCustomerForm.plate.trim().toUpperCase(),
  });

  const handleAddNewCustomer = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const customer = await addCustomer({
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim(),
        vehicle: vehicleFromForm(),
      });
      setNewCustomerForm(EMPTY_NEW_CUSTOMER);
      openVehicle(customer, customer.vehicles[0]);
    } catch {
      setFormError("Couldn't save the customer. Check the internet connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  // Returning customer, different vehicle
  const handleShowNewVehicleForm = () => {
    setViewMode('newvehicle');
    setNewCustomerForm(EMPTY_NEW_CUSTOMER);
    setFormError(null);
  };

  const handleCancelNewVehicle = () => {
    setViewMode('customer');
    setNewCustomerForm(EMPTY_NEW_CUSTOMER);
    setFormError(null);
  };

  const handleAddNewVehicle = async () => {
    if (!selectedCustomer) return;
    setSaving(true);
    setFormError(null);
    try {
      const vehicle = await addVehicle(selectedCustomer.id, vehicleFromForm());
      setSelectedCustomer({ ...selectedCustomer, vehicles: [...selectedCustomer.vehicles, vehicle] });
      setNewCustomerForm(EMPTY_NEW_CUSTOMER);
      handleSelectVehicle(vehicle);
    } catch {
      setFormError("Couldn't save the vehicle. Check the internet connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  // Only the plate is required; the rest can be filled in when there's time.
  const isVehicleFormValid =
    normalizePlate(newCustomerForm.plate) !== '' || (newCustomerForm.make.trim() && newCustomerForm.model.trim());

  const isNewCustomerFormValid = isVehicleFormValid;

  // Render search view
  if (viewMode === 'search') {
    return (
      <div style={styles.container}>
        <div style={styles.searchHeader}>
          <input
            type="text"
            placeholder="Type the plate (or a name or phone)..."
            aria-label="Search by plate, name, or phone"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPlateFromScan(false);
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || !searchQuery.trim()) return;
              if (exactPlateMatch) openVehicle(exactPlateMatch.customer, exactPlateMatch.vehicle);
              else if (filteredCustomers.length === 0 && looksLikePlate(searchQuery))
                handleShowNewCustomerForm(searchQuery.trim().toUpperCase());
            }}
            style={styles.searchInput}
            autoFocus
          />
          <button style={styles.scanButton} onClick={handleScanClick}>
            <span aria-hidden="true">📷</span> Scan Plate
          </button>
          <button
            style={styles.newCustomerButton}
            onClick={() => handleShowNewCustomerForm()}
          >
            + New Car
          </button>
          {/* Opens the phone's own camera; works over plain http, no permission prompt. */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChosen}
            style={{ display: 'none' }}
            aria-label="Take a photo of the license plate"
            data-testid="plate-photo-input"
          />
        </div>

        {scan.status === 'error' && (
          <div style={styles.scanError} role="alert">
            {scan.message}
          </div>
        )}

        {plateFromScan && scan.status === 'idle' && searchQuery && (
          <div style={styles.scanNote}>
            Read plate as <strong className="mono">{searchQuery}</strong>. Fix it in the box above if a
            letter is wrong.
          </div>
        )}

        {scan.status === 'scanning' && (
          <div style={styles.scanOverlay} role="status">
            <div style={styles.scanPanel}>
              <div className="scan-spinner" aria-hidden="true" />
              <div style={styles.scanPanelTitle}>Reading plate…</div>
              <div style={styles.scanPanelHint}>The first scan takes a little longer.</div>
              <button style={styles.scanCancelButton} onClick={handleCancelScan}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {!searchQuery.trim() && customers.length > RECENT_LIMIT && (
          <p style={styles.scanNote}>
            Showing the {RECENT_LIMIT} newest customers. Search to find anyone else.
          </p>
        )}

        {exactPlateMatch && (
          <button
            style={styles.plateMatchButton}
            onClick={() => openVehicle(exactPlateMatch.customer, exactPlateMatch.vehicle)}
          >
            <span style={styles.vehicleCardPlate}>{exactPlateMatch.vehicle.plate}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              {vehicleLabel(exactPlateMatch.vehicle)} · {customerLabel(exactPlateMatch.customer)}
            </span>
            <span>Open →</span>
          </button>
        )}

        <div style={styles.resultsContainer}>
          {!customersLoaded ? (
            <div style={styles.noResults}>
              <p style={styles.noResultsText}>Loading customers…</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div style={styles.noResults}>
              <p style={styles.noResultsText}>
                {customers.length === 0 && !searchQuery.trim()
                  ? 'No cars on file yet. Type a plate to check in the first one.'
                  : looksLikePlate(searchQuery)
                    ? `Plate ${searchQuery.trim().toUpperCase()} isn't on file yet.`
                    : 'No customers found'}
              </p>
              {nearPlateMatches.length > 0 && (
                <div style={styles.nearSection}>
                  <p style={styles.nearTitle}>Close plate matches — is it one of these?</p>
                  {nearPlateMatches.map(({ customer, vehicle }) => (
                    <div
                      key={vehicle.id}
                      style={styles.nearCard}
                      role="button"
                      tabIndex={0}
                      onClick={() => openVehicle(customer, vehicle)}
                      onKeyDown={(e) => e.key === 'Enter' && openVehicle(customer, vehicle)}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={styles.nearName}>{customerLabel(customer)}</div>
                        <div style={styles.nearVehicle}>
                          {vehicleLabel(vehicle)}
                        </div>
                      </div>
                      <div style={{ ...styles.vehicleCardPlate, whiteSpace: 'nowrap' }}>{vehicle.plate}</div>
                    </div>
                  ))}
                </div>
              )}
              {(plateFromScan || looksLikePlate(searchQuery)) && searchQuery.trim() && (
                <button
                  style={styles.newWithPlateButton}
                  onClick={() => handleShowNewCustomerForm(searchQuery.trim().toUpperCase())}
                >
                  New car — plate {searchQuery.trim().toUpperCase()} →
                </button>
              )}
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                style={{
                  ...styles.customerCard,
                  ...(hoveredCustomerId === customer.id ? styles.customerCardHover : {}),
                }}
                onClick={() => handleSelectCustomer(customer)}
                onMouseEnter={() => setHoveredCustomerId(customer.id)}
                onMouseLeave={() => setHoveredCustomerId(null)}
              >
                <div style={styles.customerName}>{customerLabel(customer)}</div>
                <div style={styles.customerPhone}>{customer.phone}</div>
                <div style={styles.vehicleChips}>
                  {customer.vehicles.map((vehicle) => (
                    <div key={vehicle.id} style={styles.vehicleChip}>
                      {vehicleLabel(vehicle)}
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

  // Plate / year / make / model — shared by the new-customer and add-vehicle forms
  const vehicleFields = (
    <>
      <div style={styles.formGroup}>
        <label style={styles.label}>License Plate</label>
        <input
          type="text"
          value={newCustomerForm.plate}
          onChange={(e) => setNewCustomerForm({ ...newCustomerForm, plate: e.target.value })}
          style={{ ...styles.input, ...styles.plateInput }}
          placeholder="ABC 1234"
          autoFocus
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Year (optional)</label>
          <input
            type="text"
            inputMode="numeric"
            value={newCustomerForm.year}
            onChange={(e) => setNewCustomerForm({ ...newCustomerForm, year: e.target.value })}
            style={styles.input}
            placeholder="2020"
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Make (optional)</label>
          <input
            type="text"
            value={newCustomerForm.make}
            onChange={(e) => setNewCustomerForm({ ...newCustomerForm, make: e.target.value })}
            style={styles.input}
            placeholder="Toyota"
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Model (optional)</label>
          <input
            type="text"
            value={newCustomerForm.model}
            onChange={(e) => setNewCustomerForm({ ...newCustomerForm, model: e.target.value })}
            style={styles.input}
            placeholder="Camry"
          />
        </div>
      </div>

      {formError && (
        <div style={styles.scanError} role="alert">
          {formError}
        </div>
      )}
    </>
  );

  // Render add-vehicle form (returning customer, different vehicle)
  if (viewMode === 'newvehicle' && selectedCustomer) {
    const canSave = isVehicleFormValid && !saving;
    return (
      <div style={styles.container}>
        <div style={styles.backBar}>
          <button style={styles.backButton} onClick={handleCancelNewVehicle}>
            ← Back to Customer
          </button>
        </div>

        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>Add Vehicle for {customerLabel(selectedCustomer)}</h2>
          {vehicleFields}
          <div style={styles.formActions}>
            <button style={styles.cancelButton} onClick={handleCancelNewVehicle}>
              Cancel
            </button>
            <button
              style={{ ...styles.submitButton, ...(canSave ? {} : styles.submitButtonDisabled) }}
              onClick={handleAddNewVehicle}
              disabled={!canSave}
            >
              {saving ? 'Saving…' : 'Add Vehicle'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render new customer form
  if (viewMode === 'newcustomer') {
    const canSave = isNewCustomerFormValid && !saving;
    return (
      <div style={styles.container}>
        <div style={styles.backBar}>
          <button style={styles.backButton} onClick={handleCancelNewCustomer}>
            ← Back to Search
          </button>
        </div>

        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>New Car</h2>
          <p style={styles.formHint}>Only the plate is needed. Fill in the rest now or skip it.</p>

          {vehicleFields}

          <div style={styles.formGroup}>
            <label style={styles.label}>Customer Name (optional)</label>
            <input
              type="text"
              value={newCustomerForm.name}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
              style={styles.input}
              placeholder="Enter full name"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Phone Number (optional)</label>
            <input
              type="tel"
              value={newCustomerForm.phone}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
              style={styles.input}
              placeholder="(318) 555-1234"
            />
          </div>

          <div style={styles.formActions}>
            <button style={styles.cancelButton} onClick={handleCancelNewCustomer}>
              Cancel
            </button>
            <button
              style={{
                ...styles.submitButton,
                ...(canSave ? {} : styles.submitButtonDisabled),
              }}
              onClick={handleAddNewCustomer}
              disabled={!canSave}
            >
              {saving ? 'Saving…' : 'Continue →'}
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
          <h2 style={styles.customerDetailName}>{customerLabel(selectedCustomer)}</h2>
          <p style={styles.customerDetailPhone}>{selectedCustomer.phone}</p>
        </div>

        <h3 style={styles.sectionTitle}>Select Vehicle</h3>
        <div style={styles.vehicleList}>
          {selectedCustomer.vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              style={{
                ...styles.vehicleCard,
                ...(hoveredVehicleId === vehicle.id ? styles.vehicleCardHover : {}),
              }}
              onClick={() => handleSelectVehicle(vehicle)}
              onMouseEnter={() => setHoveredVehicleId(vehicle.id)}
              onMouseLeave={() => setHoveredVehicleId(null)}
            >
              <div style={styles.vehicleCardMain}>
                <span style={styles.vehicleCardTitle}>
                  {vehicleLabel(vehicle)}
                </span>
                {vehicle.engine && <span style={styles.vehicleCardEngine}>{vehicle.engine}</span>}
              </div>
              <div style={styles.vehicleCardPlate}>{vehicle.plate}</div>
            </div>
          ))}
          <button style={styles.addVehicleButton} onClick={handleShowNewVehicleForm}>
            + Add Another Vehicle
          </button>
        </div>
      </div>
    );
  }

  // Render vehicle + service history view
  if (viewMode === 'vehicle' && selectedCustomer && selectedVehicle) {
    const sortedHistory = [...(history ?? [])].sort(
      (a, b) => new Date(b.paidAt ?? 0).getTime() - new Date(a.paidAt ?? 0).getTime()
    );
    const hasHistory = sortedHistory.length > 0;

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
            {vehicleLabel(selectedVehicle)}
          </h2>
          <div style={styles.vehicleHeaderMeta}>
            {selectedVehicle.engine && <span style={styles.vehicleHeaderEngine}>{selectedVehicle.engine}</span>}
            {vehicleLabel(selectedVehicle) !== selectedVehicle.plate && (
              <span style={styles.vehicleHeaderPlate}>{selectedVehicle.plate}</span>
            )}
          </div>
        </div>

        {history === null && <p style={styles.scanNote}>Loading service history…</p>}
        {historyError && (
          <div style={styles.scanError} role="alert">
            Couldn't load this vehicle's service history. Recommendations are unavailable.
          </div>
        )}

        {hasHistory && (
          <>
            <h3 style={styles.sectionTitle}>Service History</h3>
            <div style={styles.historyTimeline}>
              {sortedHistory.map((record, index) => (
                <div key={record.id} style={styles.timelineEntry}>
                  <div style={styles.timelineRail}>
                    <div style={styles.timelineDot}></div>
                    {index < sortedHistory.length - 1 && (
                      <div style={styles.timelineLine}></div>
                    )}
                  </div>
                  <div style={styles.timelineCard}>
                    <div style={styles.timelineCardHeader}>
                      <span style={styles.timelineCardDate}>
                        {new Date(record.paidAt ?? record.createdAt).toLocaleDateString('en-US', {
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
                      {record.lines.map((service, idx) => (
                        <div key={idx} style={styles.servicePill}>
                          {service.name}
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
        {hasHistory && currentMileage.length >= 4 && parseInt(currentMileage, 10) < sortedHistory[0].mileage && (
          <p style={styles.mileageWarning}>
            That's lower than the last visit ({sortedHistory[0].mileage.toLocaleString()} mi). Double-check the
            odometer.
          </p>
        )}

        {recommendations.length > 0 && (
          <div style={styles.recommendationsContainer}>
            <h3 style={styles.sectionTitle}>Recommended Services</h3>
            {recommendations
              .filter((rec) => !dismissedRecs.has(rec.id))
              .map((rec) => (
                <div key={rec.id} style={styles.recBanner}>
                  <div style={styles.recContent}>
                    <div style={styles.recTitle}>⚡ {rec.service}</div>
                    <div style={styles.recReason}>{rec.reason}</div>
                  </div>
                  <div style={styles.recActions}>
                    {services.some((s) => s.id === rec.serviceId) && (
                      <button
                        style={styles.recAddButton}
                        onClick={() => handleAddRecToTicket(rec)}
                      >
                        Add to Ticket
                      </button>
                    )}
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
  plateMatchButton: {
    width: '100%',
    minHeight: '64px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 20px',
    marginBottom: '16px',
    fontSize: '17px',
    fontWeight: 600,
    textAlign: 'left',
    color: 'var(--text)',
    backgroundColor: 'var(--accent-bg-strong)',
    border: '1px solid var(--amber)',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  formHint: {
    fontSize: '14px',
    color: 'var(--muted)',
    marginTop: '-8px',
    marginBottom: '20px',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  searchHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '24px',
  },
  searchInput: {
    flex: '1 1 240px',
    minWidth: 0,
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
  scanButton: {
    minHeight: '60px',
    padding: '0 18px',
    fontSize: '16px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: 'var(--amber)',
    border: '2px solid var(--amber)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    whiteSpace: 'nowrap',
  },
  scanError: {
    marginBottom: '16px',
    padding: '14px 16px',
    fontSize: '15px',
    color: 'var(--text)',
    backgroundColor: 'var(--accent-bg-soft)',
    border: '1px solid var(--amber)',
    borderLeft: '4px solid var(--amber)',
    borderRadius: '8px',
  },
  scanNote: {
    marginBottom: '16px',
    fontSize: '14px',
    color: 'var(--muted)',
  },
  scanOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 90,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backgroundColor: 'rgba(17, 17, 27, 0.8)',
  },
  scanPanel: {
    width: '100%',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '32px 24px',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-card)',
  },
  scanPanelTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  scanCancelButton: {
    width: '100%',
    minHeight: '60px',
    fontSize: '16px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  scanPanelHint: {
    fontSize: '14px',
    color: 'var(--muted)',
    marginBottom: '8px',
  },
  nearSection: {
    marginTop: '24px',
    textAlign: 'left',
  },
  nearTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--muted)',
    marginBottom: '12px',
  },
  nearCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    minHeight: '60px',
    padding: '16px 20px',
    marginBottom: '12px',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--amber)',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  nearName: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  nearVehicle: {
    fontSize: '14px',
    color: 'var(--muted)',
  },
  newWithPlateButton: {
    minHeight: '60px',
    marginTop: '24px',
    padding: '0 28px',
    fontSize: '16px',
    fontWeight: 600,
    backgroundColor: 'var(--amber)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  plateInput: {
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    textTransform: 'uppercase',
  },
  addVehicleButton: {
    minHeight: '60px',
    fontSize: '16px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: 'var(--amber)',
    border: '1px dashed var(--border)',
    borderRadius: '12px',
    cursor: 'pointer',
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
    transition: 'transform 0.18s, box-shadow 0.18s',
  },
  customerCardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 28px rgba(17, 17, 27, 0.65)',
    borderColor: '#585b70',
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
    transition: 'transform 0.18s, box-shadow 0.18s',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleCardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 28px rgba(17, 17, 27, 0.65)',
    borderColor: '#585b70',
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
  mileageWarning: {
    marginTop: '8px',
    fontSize: '14px',
    color: 'var(--orange)',
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
