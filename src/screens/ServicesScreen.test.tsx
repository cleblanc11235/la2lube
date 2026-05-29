import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider, useApp } from '../context/AppContext';
import ServicesScreen from './ServicesScreen';
import { mockCustomers } from '../data/mockData';
import { ReactNode, useEffect } from 'react';

// Wrapper to pre-populate ticket state
function ServicesScreenWrapper({ children }: { children: ReactNode }) {
  const { setTicket } = useApp();

  useEffect(() => {
    // Pre-populate with Mike Johnson and his vehicle
    setTicket({
      customerId: mockCustomers[0].id,
      vehicleId: mockCustomers[0].vehicles[0].id,
      currentMileage: 55000,
      selectedServices: [],
      recommendations: [],
    });
  }, [setTicket]);

  return <>{children}</>;
}

function renderServices() {
  return render(
    <AppProvider>
      <ServicesScreenWrapper>
        <ServicesScreen />
      </ServicesScreenWrapper>
    </AppProvider>
  );
}

function renderServicesWithoutTicket() {
  return render(
    <AppProvider>
      <ServicesScreen />
    </AppProvider>
  );
}

describe('ServicesScreen', () => {
  test('service buttons render', () => {
    renderServices();

    // Check for oil change services
    expect(screen.getByText('Full Synthetic Oil Change')).toBeInTheDocument();
    expect(screen.getByText('Conventional Oil Change')).toBeInTheDocument();

    // Check for fluid services
    expect(screen.getByText('Transmission Flush')).toBeInTheDocument();

    // Check for add-ons
    expect(screen.getByText('Air Filter')).toBeInTheDocument();
    expect(screen.getByText('Cabin Air Filter')).toBeInTheDocument();
  });

  test('selecting a service adds it to the sidebar', async () => {
    const user = userEvent.setup();
    renderServices();

    // Initially, sidebar should show "No services selected"
    expect(screen.getByText(/no services selected/i)).toBeInTheDocument();

    // Click a service button
    const serviceButton = screen.getByText('Full Synthetic Oil Change');
    await user.click(serviceButton);

    // Should now appear in the sidebar (within the order summary)
    const sidebar = screen.getByText(/order summary/i).closest('div');
    if (sidebar) {
      expect(within(sidebar).getByText('Full Synthetic Oil Change')).toBeInTheDocument();
    }

    // "No services selected" should be gone
    expect(screen.queryByText(/no services selected/i)).not.toBeInTheDocument();
  });

  test('total updates when service selected', async () => {
    const user = userEvent.setup();
    renderServices();

    // Before selecting, no total should be visible (empty state)
    expect(screen.queryByText('$81.36')).not.toBeInTheDocument();

    // Click a service button
    const serviceButton = screen.getByText('Full Synthetic Oil Change');
    await user.click(serviceButton);

    // Total should now appear
    // Full Synthetic is $74.99, with 8.5% tax = $81.36
    expect(screen.getByText('$81.36')).toBeInTheDocument();
  });

  test('oil change single-select', async () => {
    const user = userEvent.setup();
    renderServices();

    // Click first oil change
    const conventionalButton = screen.getByText('Conventional Oil Change');
    await user.click(conventionalButton);

    // Should be in sidebar
    const sidebar = screen.getByText(/order summary/i).closest('div');
    if (sidebar) {
      expect(within(sidebar).getByText('Conventional Oil Change')).toBeInTheDocument();
    }

    // Click second oil change
    const syntheticButton = screen.getByText('Full Synthetic Oil Change');
    await user.click(syntheticButton);

    // Only Full Synthetic should be in sidebar now
    if (sidebar) {
      expect(within(sidebar).getByText('Full Synthetic Oil Change')).toBeInTheDocument();
      expect(within(sidebar).queryByText('Conventional Oil Change')).not.toBeInTheDocument();
    }
  });

  test('Proceed to Payment button - disabled when no services selected', () => {
    renderServices();

    const proceedButton = screen.getByText(/proceed to payment/i);
    expect(proceedButton).toBeDisabled();
  });

  test('Proceed to Payment button - enabled after selecting at least one service', async () => {
    const user = userEvent.setup();
    renderServices();

    const proceedButton = screen.getByText(/proceed to payment/i);
    expect(proceedButton).toBeDisabled();

    // Click a service
    const serviceButton = screen.getByText('Air Filter');
    await user.click(serviceButton);

    // Button should now be enabled
    expect(proceedButton).not.toBeDisabled();
  });

  test('shows no ticket message when ticket is not set', () => {
    renderServicesWithoutTicket();

    expect(screen.getByText(/no active ticket/i)).toBeInTheDocument();
    expect(screen.getByText(/please start by checking in a customer/i)).toBeInTheDocument();
  });
});
