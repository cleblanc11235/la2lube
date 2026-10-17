import '@testing-library/jest-dom'
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheckInScreen from './CheckInScreen';
import { renderWithApp } from '../test/renderWithApp';
import { scanPlatePhoto } from '../data/plateScanner';

// jsdom has no camera, canvas or WebAssembly worker, so stand in for the OCR
// step and feed the screen the raw text Tesseract would have produced.
vi.mock('../data/plateScanner', () => ({
  scanPlatePhoto: vi.fn(),
  warmUpPlateScanner: vi.fn(),
}));

const mockedScan = vi.mocked(scanPlatePhoto);

/** Render and wait for the customer list, so scans have plates to match against. */
async function renderCheckIn() {
  renderWithApp(<CheckInScreen />);
  await screen.findByText('Mike Johnson');
}

async function takePhoto(user: ReturnType<typeof userEvent.setup>) {
  const input = screen.getByTestId('plate-photo-input');
  await user.upload(input, new File(['jpeg-bytes'], 'plate.jpg', { type: 'image/jpeg' }));
}

describe('CheckInScreen plate scanning', () => {
  beforeEach(() => {
    mockedScan.mockReset();
  });

  test('has a Scan Plate button that opens the camera input', async () => {
    await renderCheckIn();
    expect(screen.getByRole('button', { name: /scan plate/i })).toBeInTheDocument();

    const input = screen.getByTestId('plate-photo-input');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'image/*');
    expect(input).toHaveAttribute('capture', 'environment');
  });

  test('a plate on file goes straight to that vehicle', async () => {
    const user = userEvent.setup();
    mockedScan.mockResolvedValue('LOUISIANA\nLSU 4477\nSPORTSMANS PARADISE');
    await renderCheckIn();

    await takePhoto(user);

    expect(await screen.findByText('2021 Ford F-150')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter current mileage/i)).toBeInTheDocument();
    expect(screen.getByText('LSU 4477')).toBeInTheDocument();
  });

  test('tells the scanner when it can stop early', async () => {
    const user = userEvent.setup();
    mockedScan.mockResolvedValue('LSU 4477');
    await renderCheckIn();

    await takePhoto(user);
    await screen.findByText('2021 Ford F-150');

    const isGoodEnough = mockedScan.mock.calls[0][1]!;
    expect(isGoodEnough('RED 1122')).toBe(true);
    expect(isGoodEnough('NOTHING USEFUL')).toBe(false);
  });

  test('a misread by one character suggests the likely customer instead of guessing', async () => {
    const user = userEvent.setup();
    mockedScan.mockResolvedValue('LOUISIANA\nCAM 7899');
    await renderCheckIn();

    await takePhoto(user);

    expect(await screen.findByText(/close plate matches/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('CAM7899')).toBeInTheDocument();
    expect(screen.getByText('Robert Williams')).toBeInTheDocument();
    // Still on the search screen — nothing was opened automatically.
    expect(screen.queryByPlaceholderText(/enter current mileage/i)).not.toBeInTheDocument();

    await user.click(screen.getByText('Robert Williams'));
    expect(await screen.findByText('2020 Toyota Camry')).toBeInTheDocument();
  });

  test('an unknown plate can start a new customer with the plate filled in', async () => {
    const user = userEvent.setup();
    mockedScan.mockResolvedValue('XYZ 9981');
    await renderCheckIn();

    await takePhoto(user);

    const newWithPlate = await screen.findByRole('button', { name: /new car — plate XYZ9981/i });
    await user.click(newWithPlate);

    expect(screen.getByPlaceholderText('ABC 1234')).toHaveValue('XYZ9981');
  });

  test('the plate entered for a new customer is saved on their vehicle', async () => {
    const user = userEvent.setup();
    mockedScan.mockResolvedValue('XYZ 9981');
    await renderCheckIn();

    await takePhoto(user);
    await user.click(await screen.findByRole('button', { name: /new car — plate/i }));

    await user.type(screen.getByPlaceholderText(/enter full name/i), 'Pat Boudreaux');
    await user.type(screen.getByPlaceholderText(/\(318\) 555-1234/i), '(318) 555-0000');
    await user.type(screen.getByPlaceholderText('2020'), '2019');
    await user.type(screen.getByPlaceholderText(/toyota/i), 'Ram');
    await user.type(screen.getByPlaceholderText(/camry/i), '1500');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText('XYZ9981')).toBeInTheDocument();
  });

  test('a photo with no readable plate shows a helpful message', async () => {
    const user = userEvent.setup();
    mockedScan.mockResolvedValue('   \n');
    await renderCheckIn();

    await takePhoto(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't find a plate/i);
  });

  test('an OCR failure (e.g. no internet on first use) is reported, not swallowed', async () => {
    const user = userEvent.setup();
    mockedScan.mockRejectedValue(new Error('network'));
    await renderCheckIn();

    await takePhoto(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't read the photo/i);
  });

  test('cancel discards a scan that finishes afterwards', async () => {
    const user = userEvent.setup();
    let finish: (text: string) => void = () => {};
    mockedScan.mockImplementation(
      () => new Promise<string>((resolve) => (finish = resolve))
    );
    await renderCheckIn();

    await takePhoto(user);
    expect(await screen.findByText(/reading plate/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/reading plate/i)).not.toBeInTheDocument();

    finish('LSU 4477');
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/enter current mileage/i)).not.toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(/type the plate/i)).toBeInTheDocument();
  });

  test('typing a plate without the space still finds the customer', async () => {
    const user = userEvent.setup();
    await renderCheckIn();

    await user.type(screen.getByPlaceholderText(/type the plate/i), 'lsu4477');

    expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Sandra Lee')).not.toBeInTheDocument();
  });
});
