import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../context/AppContext';
import CheckInScreen from './CheckInScreen';

function renderCheckIn() {
  return render(
    <AppProvider>
      <CheckInScreen />
    </AppProvider>
  );
}

describe('CheckInScreen', () => {
  test('renders search bar', () => {
    renderCheckIn();
    const searchInput = screen.getByPlaceholderText(/search by name, phone, or plate/i);
    expect(searchInput).toBeInTheDocument();
  });

  test('shows all 4 mock customers on empty search', () => {
    renderCheckIn();

    expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
    expect(screen.getByText('Sandra Lee')).toBeInTheDocument();
    expect(screen.getByText('Robert Williams')).toBeInTheDocument();
    expect(screen.getByText('Debra Fontenot')).toBeInTheDocument();
  });

  test('filters by name', async () => {
    const user = userEvent.setup();
    renderCheckIn();

    const searchInput = screen.getByPlaceholderText(/search by name, phone, or plate/i);
    await user.type(searchInput, 'Mike');

    expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Sandra Lee')).not.toBeInTheDocument();
    expect(screen.queryByText('Robert Williams')).not.toBeInTheDocument();
    expect(screen.queryByText('Debra Fontenot')).not.toBeInTheDocument();
  });

  test('filters by phone', async () => {
    const user = userEvent.setup();
    renderCheckIn();

    const searchInput = screen.getByPlaceholderText(/search by name, phone, or plate/i);
    await user.type(searchInput, '555-9876');

    expect(screen.getByText('Sandra Lee')).toBeInTheDocument();
    expect(screen.queryByText('Mike Johnson')).not.toBeInTheDocument();
    expect(screen.queryByText('Robert Williams')).not.toBeInTheDocument();
    expect(screen.queryByText('Debra Fontenot')).not.toBeInTheDocument();
  });

  test('filters by plate', async () => {
    const user = userEvent.setup();
    renderCheckIn();

    const searchInput = screen.getByPlaceholderText(/search by name, phone, or plate/i);
    await user.type(searchInput, 'CAM');

    expect(screen.getByText('Robert Williams')).toBeInTheDocument();
    expect(screen.queryByText('Mike Johnson')).not.toBeInTheDocument();
    expect(screen.queryByText('Sandra Lee')).not.toBeInTheDocument();
    expect(screen.queryByText('Debra Fontenot')).not.toBeInTheDocument();
  });

  test('selecting a vehicle shows mileage input', async () => {
    const user = userEvent.setup();
    renderCheckIn();

    // Click customer card
    const customerCard = screen.getByText('Mike Johnson').closest('div');
    if (customerCard) {
      await user.click(customerCard);
    }

    // Now we should be in customer view - click the vehicle
    const vehicleCard = screen.getByText('2021 Ford F-150');
    await user.click(vehicleCard);

    // Should show mileage input
    const mileageInput = screen.getByPlaceholderText(/enter current mileage/i);
    expect(mileageInput).toBeInTheDocument();
  });

  test('recommendations appear after mileage entry', async () => {
    const user = userEvent.setup();
    renderCheckIn();

    // Select Debra Fontenot (she has high mileage delta)
    const debraCard = screen.getByText('Debra Fontenot').closest('div');
    if (debraCard) {
      await user.click(debraCard);
    }

    // Select her vehicle
    const vehicleCard = screen.getByText('2015 Honda Civic');
    await user.click(vehicleCard);

    // Enter mileage that will trigger recommendations
    // Last service was at 98,700 mi, so 124,200 is 25,500 miles later
    const mileageInput = screen.getByPlaceholderText(/enter current mileage/i);
    await user.type(mileageInput, '124200');

    // At least one recommendation should appear
    // With 25,500 miles, all 4 recommendations should trigger (85% of 15k is 12,750, 85% of 30k is 25,500)
    expect(screen.getByText(/recommended services/i)).toBeInTheDocument();

    // Should see at least one "Add to Ticket" button
    const addButtons = screen.getAllByText(/add to ticket/i);
    expect(addButtons.length).toBeGreaterThan(0);
  });

  test('New Customer button opens the form', async () => {
    const user = userEvent.setup();
    renderCheckIn();

    const newCustomerButton = screen.getByText(/new customer/i);
    await user.click(newCustomerButton);

    // Form fields should appear - using placeholder text since labels aren't associated with inputs
    expect(screen.getByPlaceholderText(/enter full name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\(318\) 555-1234/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/2020/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/toyota/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/camry/i)).toBeInTheDocument();
  });
});
