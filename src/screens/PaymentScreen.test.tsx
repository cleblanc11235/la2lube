import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useApp } from '../context/AppContext';
import PaymentScreen from './PaymentScreen';
import { testCustomers, testServices, createTestStore } from '../test/fixtures';
import { renderWithApp } from '../test/renderWithApp';
import { ReactNode, useEffect } from 'react';

const mike = testCustomers[0];

// Opens the first ready-to-pay ticket, as tapping "Take Payment" on the Bay Board does.
function OpenFirstReadyTicket({ children }: { children: ReactNode }) {
  const { openTickets, openForPayment, ticket } = useApp();

  useEffect(() => {
    const ready = openTickets.find((t) => t.status === 'ready');
    if (ready && !ticket.ticketId) openForPayment(ready);
  }, [openTickets, ticket.ticketId, openForPayment]);

  return <>{children}</>;
}

/** Mike's F-150 at 55,000 mi, Full Synthetic + Air Filter, job done and waiting to pay. */
async function renderPayment() {
  const store = createTestStore();
  const created = await store.createTicket({
    customerId: mike.id,
    vehicleId: mike.vehicles[0].id,
    customerName: mike.name,
    vehicleLabel: '2021 Ford F-150',
    mileage: 55000,
    lines: testServices.filter((s) => s.id === 'oil-synthetic' || s.id === 'addon-air'),
    bay: 1,
  });
  await store.updateTicket(created.id, { status: 'ready' });

  const result = renderWithApp(
    <OpenFirstReadyTicket>
      <PaymentScreen />
    </OpenFirstReadyTicket>,
    store
  );
  await screen.findByText('Mike Johnson');
  return { ...result, ticketId: created.id };
}

const paidToday = async (store: Awaited<ReturnType<typeof renderPayment>>['store']) => {
  const now = new Date();
  return store.listPaidTickets(
    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  );
};

describe('PaymentScreen', () => {
  test('invoice renders correct line items and totals', async () => {
    await renderPayment();

    expect(screen.getByText('Full Synthetic Oil Change')).toBeInTheDocument();
    expect(screen.getByText('Air Filter')).toBeInTheDocument();

    // Subtotal: 74.99 + 24.99 = 99.98
    expect(screen.getByText('$99.98')).toBeInTheDocument();
    // Tax: 99.98 * 0.12 = 11.9976 → rounds to 12.00
    expect(screen.getByText('$12.00')).toBeInTheDocument();
    // Total: 99.98 + 12.00 = 111.98
    expect(within(screen.getByText('TOTAL:').parentElement!).getByText('$111.98')).toBeInTheDocument();
  });

  test('cash mode - change calculates correctly', async () => {
    const user = userEvent.setup();
    await renderPayment();

    await user.click(screen.getByText('Cash'));
    await user.type(screen.getByPlaceholderText('0.00'), '120');

    // Change should be $120 - $111.98 = $8.02
    const changeAmount = screen.getByText('$8.02');
    expect(changeAmount).toHaveStyle({ color: 'var(--green)' });
  });

  test('cash mode - confirm button disabled when tendered < total', async () => {
    const user = userEvent.setup();
    await renderPayment();

    await user.click(screen.getByText('Cash'));
    await user.type(screen.getByPlaceholderText('0.00'), '50');

    expect(screen.getByText('Confirm Payment')).toBeDisabled();
  });

  test('cash mode - confirm button enabled when tendered >= total', async () => {
    const user = userEvent.setup();
    await renderPayment();

    await user.click(screen.getByText('Cash'));
    await user.type(screen.getByPlaceholderText('0.00'), '120');

    expect(screen.getByText('Confirm Payment')).not.toBeDisabled();
  });

  test('card mode - tells staff to run the card on Square first', async () => {
    await renderPayment();

    expect(screen.getByText(/on the square reader first/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paid on Square — $111.98' })).toBeInTheDocument();
  });

  test('recording a card payment closes out the ticket', async () => {
    const user = userEvent.setup();
    const { store, ticketId } = await renderPayment();

    await user.click(screen.getByRole('button', { name: 'Paid on Square — $111.98' }));

    await waitFor(async () => expect(await paidToday(store)).toHaveLength(1));
    const [paid] = await paidToday(store);
    expect(paid).toMatchObject({
      id: ticketId,
      status: 'paid',
      paymentMethod: 'card',
      subtotal: 99.98,
      tax: 12,
      taxRate: 0.12,
      total: 111.98,
    });
    expect(await store.listOpenTickets()).toEqual([]);
  });

  test('recording a cash payment saves it as cash', async () => {
    const user = userEvent.setup();
    const { store } = await renderPayment();

    await user.click(screen.getByText('Cash'));
    await user.type(screen.getByPlaceholderText('0.00'), '120');
    await user.click(screen.getByText('Confirm Payment'));

    await waitFor(async () => expect((await paidToday(store))[0]?.paymentMethod).toBe('cash'));
  });

  test('customer, vehicle and invoice number displayed on invoice', async () => {
    await renderPayment();

    expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
    expect(screen.getByText(/2021 Ford F-150 5\.0L/i)).toBeInTheDocument();
    expect(screen.getByText('LSU 4477')).toBeInTheDocument();
    expect(screen.getByText('55,000 mi')).toBeInTheDocument();
    expect(screen.getByText(/^#\d+$/)).toBeInTheDocument();
  });

  test('without a saved ticket there is nothing to pay', () => {
    renderWithApp(<PaymentScreen />);
    expect(screen.getByText(/no ticket information available/i)).toBeInTheDocument();
  });
});
