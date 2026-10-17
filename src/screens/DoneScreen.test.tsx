import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useApp } from '../context/AppContext';
import DoneScreen from './DoneScreen';
import { testCustomers, createTestStore } from '../test/fixtures';
import { renderWithApp } from '../test/renderWithApp';
import { oilChangeLines, oilTypes } from '../config/serviceMenu';
import { ReactNode, useEffect, useRef } from 'react';

const mike = testCustomers[0];

// Takes the first ready ticket through payment (card), like the counter does.
function PayFirstReadyTicket({ children }: { children: ReactNode }) {
  const { openTickets, openForPayment, ticket, completePayment } = useApp();
  const paying = useRef(false);

  useEffect(() => {
    const ready = openTickets.find((t) => t.status === 'ready');
    if (ready && !ticket.ticketId) openForPayment(ready);
  }, [openTickets, ticket.ticketId, openForPayment]);

  useEffect(() => {
    if (ticket.ticketId && !paying.current) {
      paying.current = true;
      completePayment('card');
    }
  }, [ticket.ticketId, completePayment]);

  return <>{children}</>;
}

/** Pay for one oil change at 50,000 mi and show the Done screen. */
async function renderDone(oilServiceId: string, weight?: string, quarts = 5) {
  const oil = oilTypes.find((t) => t.id === oilServiceId)!;
  const store = createTestStore();
  const created = await store.createTicket({
    customerId: mike.id,
    vehicleId: mike.vehicles[0].id,
    customerName: mike.name,
    vehicleLabel: '2021 Ford F-150',
    mileage: 50000,
    lines: oilChangeLines(oil, weight, quarts),
    bay: 1,
  });
  await store.updateTicket(created.id, { status: 'ready' });

  renderWithApp(
    <PayFirstReadyTicket>
      <DoneScreen />
    </PayFirstReadyTicket>,
    store
  );
  await screen.findByText('Payment Confirmed');
}

describe('DoneScreen', () => {
  test('shows "Payment Confirmed" heading', async () => {
    await renderDone('oil-synthetic');
    expect(screen.getByText('Payment Confirmed')).toBeInTheDocument();
  });

  test.each([
    ['oil-blend', '55,000 mi'], // +5,000
    ['oil-synthetic', '55,000 mi'], // +5,000
    ['oil-mobil1', '55,000 mi'], // +5,000
  ])('sticker shows next-service mileage for %s', async (oilServiceId, nextService) => {
    await renderDone(oilServiceId);
    expect(screen.getByText('NEXT SERVICE AT:').nextSibling).toHaveTextContent(nextService);
  });

  test('sticker displays current mileage', async () => {
    await renderDone('oil-synthetic');
    expect(screen.getByText('50,000 mi')).toBeInTheDocument();
  });

  test('sticker displays oil type and weight', async () => {
    await renderDone('oil-mobil1', '0W-20', 7);
    expect(screen.getByText('Mobil 1 0W-20')).toBeInTheDocument();
  });

  test('"Next Customer" button is available', async () => {
    await renderDone('oil-synthetic');
    expect(screen.getByText(/next customer/i)).toBeEnabled();
  });

  test('print button prints the sticker', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await renderDone('oil-synthetic');

    await user.click(screen.getByText('Print Sticker'));

    expect(print).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.print-sticker')).toHaveTextContent('NEXT SERVICE AT:');
    print.mockRestore();
  });

  test('displays payment method and total from the paid ticket', async () => {
    await renderDone('oil-synthetic');

    // Full Synthetic is $95.99, with 12% tax = $107.51
    expect(screen.getByText(/card — \$107\.51/i)).toBeInTheDocument();
  });

  test('falls back to Check-In when no sale has been made yet', () => {
    renderWithApp(<DoneScreen />);

    expect(screen.getByText('No transaction found')).toBeInTheDocument();
    expect(screen.queryByText('Payment Confirmed')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to check-in/i })).toBeInTheDocument();
  });
});
