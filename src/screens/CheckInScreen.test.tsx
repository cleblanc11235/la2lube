import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheckInScreen from './CheckInScreen';
import { renderWithApp } from '../test/renderWithApp';
import { createMemoryStore } from '../data/store';

/** Render and wait for the customer list to load. */
async function renderCheckIn() {
  const result = renderWithApp(<CheckInScreen />);
  await screen.findByText('Mike Johnson');
  return result;
}

const searchBox = () => screen.getByPlaceholderText(/type the plate/i);

describe('CheckInScreen', () => {
  test('renders search bar', async () => {
    await renderCheckIn();
    expect(searchBox()).toBeInTheDocument();
  });

  test('starts with no customers and points to typing a plate', async () => {
    renderWithApp(<CheckInScreen />, createMemoryStore());

    expect(await screen.findByText(/no cars on file yet/i)).toBeInTheDocument();
    expect(screen.queryByText('Mike Johnson')).not.toBeInTheDocument();
  });

  test('shows a loading message until customers arrive', () => {
    renderWithApp(<CheckInScreen />);
    expect(screen.getByText(/loading customers/i)).toBeInTheDocument();
  });

  test('shows every customer on file on empty search', async () => {
    await renderCheckIn();

    expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
    expect(screen.getByText('Sandra Lee')).toBeInTheDocument();
    expect(screen.getByText('Robert Williams')).toBeInTheDocument();
    expect(screen.getByText('Debra Fontenot')).toBeInTheDocument();
  });

  test('filters by name', async () => {
    const user = userEvent.setup();
    await renderCheckIn();

    await user.type(searchBox(), 'Mike');

    expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Sandra Lee')).not.toBeInTheDocument();
    expect(screen.queryByText('Robert Williams')).not.toBeInTheDocument();
    expect(screen.queryByText('Debra Fontenot')).not.toBeInTheDocument();
  });

  test('filters by phone', async () => {
    const user = userEvent.setup();
    await renderCheckIn();

    await user.type(searchBox(), '555-9876');

    expect(screen.getByText('Sandra Lee')).toBeInTheDocument();
    expect(screen.queryByText('Mike Johnson')).not.toBeInTheDocument();
    expect(screen.queryByText('Robert Williams')).not.toBeInTheDocument();
    expect(screen.queryByText('Debra Fontenot')).not.toBeInTheDocument();
  });

  test('finds a phone number typed without formatting', async () => {
    const user = userEvent.setup();
    await renderCheckIn();

    await user.type(searchBox(), '3185559876');

    expect(screen.getByText('Sandra Lee')).toBeInTheDocument();
    expect(screen.queryByText('Mike Johnson')).not.toBeInTheDocument();
  });

  test('filters by plate', async () => {
    const user = userEvent.setup();
    await renderCheckIn();

    await user.type(searchBox(), 'CAM');

    expect(screen.getByText('Robert Williams')).toBeInTheDocument();
    expect(screen.queryByText('Mike Johnson')).not.toBeInTheDocument();
    expect(screen.queryByText('Sandra Lee')).not.toBeInTheDocument();
    expect(screen.queryByText('Debra Fontenot')).not.toBeInTheDocument();
  });

  test('selecting a vehicle shows mileage input and service history', async () => {
    const user = userEvent.setup();
    await renderCheckIn();

    await user.click(screen.getByText('Mike Johnson'));
    await user.click(screen.getByText('2021 Ford F-150'));

    expect(screen.getByPlaceholderText(/enter current mileage/i)).toBeInTheDocument();
    expect(await screen.findByText('48,200 mi')).toBeInTheDocument();
  });

  test('recommendations appear after mileage entry', async () => {
    const user = userEvent.setup();
    await renderCheckIn();

    await user.click(screen.getByText('Debra Fontenot'));
    await user.click(screen.getByText('2015 Honda Civic'));
    await screen.findByText('98,700 mi'); // history loaded

    // Flushes were at 83,400, cabin filter at 98,700, no air filter on record.
    await user.type(screen.getByPlaceholderText(/enter current mileage/i), '124200');

    expect(screen.getByText(/recommended services/i)).toBeInTheDocument();
    expect(screen.getAllByText(/⚡/)).toHaveLength(4);
    expect(screen.getByText(/40,800 miles since the last Transmission Flush/i)).toBeInTheDocument();
    // None of these are on the menu yet, so the banners are reminders only.
    expect(screen.queryByText(/add to ticket/i)).not.toBeInTheDocument();
  });

  test('warns when mileage is lower than the last visit', async () => {
    const user = userEvent.setup();
    await renderCheckIn();

    await user.click(screen.getByText('Mike Johnson'));
    await user.click(screen.getByText('2021 Ford F-150'));
    await screen.findByText('48,200 mi');

    await user.type(screen.getByPlaceholderText(/enter current mileage/i), '4820');

    expect(screen.getByText(/lower than the last visit/i)).toBeInTheDocument();
  });

  test('New Car button opens the form', async () => {
    const user = userEvent.setup();
    await renderCheckIn();

    await user.click(screen.getByText(/new car/i));

    // Form fields should appear - using placeholder text since labels aren't associated with inputs
    expect(screen.getByPlaceholderText(/enter full name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\(318\) 555-1234/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/2020/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/toyota/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/camry/i)).toBeInTheDocument();
  });

  test('a new customer is saved to the store', async () => {
    const user = userEvent.setup();
    const { store } = await renderCheckIn();

    await user.click(screen.getByText(/new car/i));
    await user.type(screen.getByPlaceholderText(/enter full name/i), 'Pat Boudreaux');
    await user.type(screen.getByPlaceholderText(/\(318\) 555-1234/i), '(318) 555-0000');
    await user.type(screen.getByPlaceholderText('2020'), '2019');
    await user.type(screen.getByPlaceholderText(/toyota/i), 'Ram');
    await user.type(screen.getByPlaceholderText(/camry/i), '1500');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText('2019 Ram 1500')).toBeInTheDocument();
    const saved = (await store.listCustomers()).find((c) => c.name === 'Pat Boudreaux');
    expect(saved?.vehicles[0]).toMatchObject({ year: 2019, make: 'Ram', model: '1500' });
  });

  test('typing a plate on file and pressing Enter opens that vehicle', async () => {
    const user = userEvent.setup();
    await renderCheckIn();

    await user.type(screen.getByPlaceholderText(/type the plate/i), 'lsu4477');
    expect(screen.getByRole('button', { name: /LSU 4477.*Mike Johnson.*Open/ })).toBeInTheDocument();
    await user.keyboard('{Enter}');

    expect(await screen.findByPlaceholderText(/enter current mileage/i)).toBeInTheDocument();
    expect(screen.getByText('2021 Ford F-150')).toBeInTheDocument();
  });

  test('a new plate can be checked in with nothing but the plate', async () => {
    const user = userEvent.setup();
    const { store } = await renderCheckIn();

    await user.type(screen.getByPlaceholderText(/type the plate/i), 'ABC 123{Enter}');
    expect(screen.getByPlaceholderText('ABC 1234')).toHaveValue('ABC 123');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Straight to mileage, labelled by the plate until there's more to go on
    expect(await screen.findByPlaceholderText(/enter current mileage/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ABC 123' })).toBeInTheDocument();
    const saved = (await store.listCustomers()).find((c) => c.vehicles[0]?.plate === 'ABC 123');
    expect(saved).toMatchObject({ name: '', phone: '' });
  });

  test('a returning customer can add another vehicle', async () => {
    const user = userEvent.setup();
    const { store } = await renderCheckIn();

    await user.click(screen.getByText('Sandra Lee'));
    await user.click(screen.getByRole('button', { name: /add another vehicle/i }));
    await user.type(screen.getByPlaceholderText('ABC 1234'), 'tah 5150');
    await user.type(screen.getByPlaceholderText('2020'), '2022');
    await user.type(screen.getByPlaceholderText(/toyota/i), 'Chevy');
    await user.type(screen.getByPlaceholderText(/camry/i), 'Tahoe');
    await user.click(screen.getByRole('button', { name: /add vehicle/i }));

    // Lands on the new vehicle, ready for mileage
    expect(await screen.findByText('2022 Chevy Tahoe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter current mileage/i)).toBeInTheDocument();

    const sandra = (await store.listCustomers()).find((c) => c.name === 'Sandra Lee')!;
    expect(sandra.vehicles.map((v) => v.plate)).toEqual(['RED 1122', 'TAH 5150']);
  });
});
