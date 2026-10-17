import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShopApp from './ShopApp';
import { createTestStore } from './test/fixtures';

// End-to-end through the real app shell, backed by a memory store: the same
// flow the counter runs all day.

async function checkInMikeAndSendToBay(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByText('Mike Johnson'));
  await user.click(screen.getByText('2021 Ford F-150'));
  await screen.findByText('48,200 mi'); // history loaded
  await user.type(screen.getByPlaceholderText(/enter current mileage/i), '53000');
  await user.click(screen.getByText(/proceed to services/i));

  await user.click(screen.getByRole('button', { name: /^Full Synthetic/ }));
  await user.click(screen.getByText(/send to bay 1/i));
  await screen.findByRole('heading', { name: 'Bay Board' });
}

describe('shop flow', () => {
  test('check-in → bay → payment → sticker → next customer, and it all sticks', async () => {
    const user = userEvent.setup();
    const store = createTestStore();
    render(<ShopApp store={store} />);

    await checkInMikeAndSendToBay(user);

    // Bay Board: start the job, finish it, take payment
    await user.click(await screen.findByText('Start Job →'));
    await user.click(await screen.findByText('Job Done ✓'));
    await user.click(await screen.findByText('Take Payment →'));

    // Payment: Full Synthetic $95.99 + 12% = $107.51
    await user.click(await screen.findByRole('button', { name: 'Paid on Square — $107.51' }));

    // Done: sticker says next service at 53,000 + 5,000
    expect(await screen.findByText('Payment Confirmed')).toBeInTheDocument();
    expect(screen.getByText('NEXT SERVICE AT:').nextSibling).toHaveTextContent('58,000 mi');

    // Next customer resets to search; header totals updated
    await user.click(screen.getByText(/next customer/i));
    expect(screen.getByPlaceholderText(/type the plate/i)).toBeInTheDocument();
    const header = screen.getByRole('banner');
    expect(within(header).getByText('$107.51')).toBeInTheDocument();
    expect(within(header).getByText('1')).toBeInTheDocument();

    // Reports lists the sale
    await user.click(screen.getByRole('button', { name: 'Reports' }));
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Mike Johnson')).toBeInTheDocument();
    expect(within(table).getByText('Card')).toBeInTheDocument();

    // And the visit is now part of the truck's service history
    await user.click(screen.getByRole('button', { name: 'Check-In' }));
    await user.click(await screen.findByText('Mike Johnson'));
    await user.click(screen.getByText('2021 Ford F-150'));
    expect(await screen.findByText('53,000 mi')).toBeInTheDocument();
  });

  test('cancelling a ticket frees the bay and keeps it out of reports', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const store = createTestStore();
    render(<ShopApp store={store} />);

    await checkInMikeAndSendToBay(user);
    await user.click(screen.getByRole('button', { name: /cancel ticket/i }));

    expect(confirm).toHaveBeenCalled();
    expect(await screen.findAllByText('AVAILABLE', { selector: 'div' })).toHaveLength(2);
    expect(await store.listOpenTickets()).toEqual([]);
    expect(within(screen.getByRole('banner')).getByText('$0.00')).toBeInTheDocument();
    confirm.mockRestore();
  });

  test('a second device sees a car sent to a bay when its window regains focus', async () => {
    const user = userEvent.setup();
    const store = createTestStore();

    // The counter PC...
    render(<ShopApp store={store} />);
    // ...and the shop iPhone, already sitting on the Bay Board.
    const phone = render(<ShopApp store={store} />, { container: document.body.appendChild(document.createElement('div')) });
    await user.click(within(phone.container).getByRole('button', { name: 'Bay Board' }));
    expect(within(phone.container).getAllByText('AVAILABLE', { selector: 'div' })).toHaveLength(2);

    // Counter checks Mike in and sends him to Bay 1 (scope queries to the PC's tree).
    const pc = within(document.body.firstElementChild as HTMLElement);
    await user.click(await pc.findByText('Mike Johnson'));
    await user.click(pc.getByText('2021 Ford F-150'));
    await pc.findByText('48,200 mi');
    await user.type(pc.getByPlaceholderText(/enter current mileage/i), '53000');
    await user.click(pc.getByText(/proceed to services/i));
    await user.click(pc.getByRole('button', { name: /^Full Synthetic/ }));
    await user.click(pc.getByText(/send to bay 1/i));

    // Phone picks it up on focus (also every 15 s).
    await act(async () => {
      fireEvent.focus(window);
    });
    expect(await within(phone.container).findByText('Start Job →')).toBeInTheDocument();
    expect(within(phone.container).getByText('Mike Johnson')).toBeInTheDocument();
  });
});
