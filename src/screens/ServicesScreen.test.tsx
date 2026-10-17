import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useApp } from '../context/AppContext';
import ServicesScreen from './ServicesScreen';
import { testCustomers, createTestStore } from '../test/fixtures';
import { renderWithApp } from '../test/renderWithApp';
import { ReactNode, useEffect } from 'react';
import type { ShopStore } from '../data/store';

const mike = testCustomers[0];

// Wrapper to pre-populate ticket state
function ServicesScreenWrapper({ children, ticketId = null }: { children: ReactNode; ticketId?: string | null }) {
  const { setTicket } = useApp();

  useEffect(() => {
    // Pre-populate with Mike Johnson and his vehicle
    setTicket({
      ticketId,
      customerId: mike.id,
      vehicleId: mike.vehicles[0].id,
      currentMileage: 55000,
      selectedServices: [],
      recommendations: [],
    });
  }, [setTicket, ticketId]);

  return <>{children}</>;
}

/** Render and wait for customers to load (the screen needs them to show the ticket). */
async function renderServices(store?: ShopStore, ticketId?: string | null) {
  const result = renderWithApp(
    <ServicesScreenWrapper ticketId={ticketId}>
      <ServicesScreen />
    </ServicesScreenWrapper>,
    store
  );
  await screen.findByText(/order summary/i);
  return result;
}

describe('ServicesScreen', () => {
  const sidebar = () => screen.getByText(/order summary/i).closest('div')!;
  const oilButton = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });

  test('oil buttons show price and DataLube code', async () => {
    await renderServices();

    expect(oilButton('Synthetic Blend')).toHaveTextContent('5 qt $66.99 · +$9.89/qt');
    expect(oilButton('Full Synthetic')).toHaveTextContent('DataLube 3');
    expect(oilButton('Mobil 1')).toHaveTextContent('5 qt $88.38 · +$13.48/qt');
  });

  test('picking an oil adds it to the sidebar with tax', async () => {
    const user = userEvent.setup();
    await renderServices();

    expect(screen.getByText(/no services selected/i)).toBeInTheDocument();
    await user.click(oilButton('Full Synthetic'));

    expect(within(sidebar()).getByText('Full Synthetic')).toBeInTheDocument();
    // $95.99 + 12% tax = $107.51
    expect(screen.getByText('$107.51')).toBeInTheDocument();
  });

  test('weight goes on the line, and only that oil\'s weights are offered', async () => {
    const user = userEvent.setup();
    await renderServices();

    await user.click(oilButton('Synthetic Blend'));
    expect(screen.queryByRole('button', { name: /^0W-20/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^10W-30/ }));

    expect(within(sidebar()).getByText('Synthetic Blend 10W-30')).toBeInTheDocument();
  });

  test('quarts over 5 add an extra-oil line at that oil\'s price', async () => {
    const user = userEvent.setup();
    await renderServices();

    await user.click(oilButton('Mobil 1'));
    expect(screen.getByLabelText('One less quart')).toBeDisabled();
    await user.click(screen.getByLabelText('One more quart'));
    await user.click(screen.getByLabelText('One more quart'));

    expect(screen.getByLabelText('Quarts')).toHaveTextContent('7 qt');
    expect(within(sidebar()).getByText('Extra oil 2 qt × $13.48 (EO MOB)')).toBeInTheDocument();
    // $88.38 + $26.96 = $115.34, + 12% = $129.18
    expect(screen.getByText('$129.18')).toBeInTheDocument();

    // Removing the extra line goes back to 5 qt
    await user.click(screen.getByLabelText('Remove Extra oil 2 qt × $13.48 (EO MOB)'));
    expect(screen.getByLabelText('Quarts')).toHaveTextContent('5 qt');
  });

  test('switching oil keeps the weight and quarts when the new oil has that weight', async () => {
    const user = userEvent.setup();
    await renderServices();

    await user.click(oilButton('Full Synthetic'));
    await user.click(screen.getByRole('button', { name: /^0W-20/ }));
    await user.click(screen.getByLabelText('One more quart'));
    await user.click(oilButton('Mobil 1'));

    expect(within(sidebar()).getByText('Mobil 1 0W-20')).toBeInTheDocument();
    expect(within(sidebar()).getByText('Extra oil 1 qt × $13.48 (EO MOB)')).toBeInTheDocument();
    expect(within(sidebar()).queryByText(/Full Synthetic/)).not.toBeInTheDocument();
  });

  test('tapping the selected oil again removes it', async () => {
    const user = userEvent.setup();
    await renderServices();

    await user.click(oilButton('Full Synthetic'));
    await user.click(oilButton('Full Synthetic'));

    expect(screen.getByText(/no services selected/i)).toBeInTheDocument();
  });

  test('an other item can be added with any price', async () => {
    const user = userEvent.setup();
    await renderServices();

    await user.type(screen.getByLabelText('Other item description'), 'Wiper blades');
    await user.type(screen.getByLabelText('Other item price'), '24.99');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(within(sidebar()).getByText('Wiper blades')).toBeInTheDocument();
    expect(screen.getByLabelText('Other item description')).toHaveValue('');
  });

  test('Send to Bay buttons - one per open bay, disabled when no services selected', async () => {
    await renderServices();

    // Every bay starts the day empty
    expect(screen.getByText(/send to bay 1/i)).toBeDisabled();
    expect(screen.getByText(/send to bay 2/i)).toBeDisabled();
  });

  test('Send to Bay button - enabled after selecting at least one service', async () => {
    const user = userEvent.setup();
    await renderServices();

    const sendButton = screen.getByText(/send to bay 1/i);
    expect(sendButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /^Synthetic Blend/ }));

    expect(sendButton).not.toBeDisabled();
  });

  test('a bay with a car in it is not offered', async () => {
    const store = createTestStore();
    await store.createTicket({
      customerId: 'cust-2',
      vehicleId: 'veh-2',
      customerName: 'Sandra Lee',
      vehicleLabel: '2018 Chevy Silverado',
      mileage: 80000,
      lines: [],
      bay: 1,
    });
    await renderServices(store);

    expect(await screen.findByText(/send to bay 2/i)).toBeInTheDocument();
    expect(screen.queryByText(/send to bay 1/i)).not.toBeInTheDocument();
  });

  test('sending to a bay saves the ticket', async () => {
    const user = userEvent.setup();
    const { store } = await renderServices();

    await user.click(screen.getByRole('button', { name: /^Full Synthetic/ }));
    await user.click(screen.getByRole('button', { name: /^5W-30/ }));
    await user.click(screen.getByLabelText('One more quart'));
    await user.click(screen.getByText(/send to bay 2/i));

    const [saved] = await store.listOpenTickets();
    expect(saved).toMatchObject({ bay: 2, status: 'waiting', mileage: 55000, customerName: 'Mike Johnson' });
    expect(saved.lines.map((l) => [l.name, l.price])).toEqual([
      ['Full Synthetic 5W-30', 95.99],
      ['Extra oil 1 qt × $10.55 (EO SYN)', 10.55],
    ]);
    expect(saved.lines[0]).toMatchObject({ oilWeight: '5W-30', quarts: 6 });
  });

  test('editing a saved ticket offers Save Changes instead of bays', async () => {
    const store = createTestStore();
    const saved = await store.createTicket({
      customerId: mike.id,
      vehicleId: mike.vehicles[0].id,
      customerName: mike.name,
      vehicleLabel: '2021 Ford F-150',
      mileage: 55000,
      lines: [],
      bay: 1,
    });
    await renderServices(store, saved.id);

    expect(screen.getByText(/save changes/i)).toBeInTheDocument();
    expect(screen.queryByText(/send to bay/i)).not.toBeInTheDocument();
  });

  test('shows no ticket message when ticket is not set', () => {
    renderWithApp(<ServicesScreen />);

    expect(screen.getByText(/no active ticket/i)).toBeInTheDocument();
    expect(screen.getByText(/please start by checking in a customer/i)).toBeInTheDocument();
  });
});
