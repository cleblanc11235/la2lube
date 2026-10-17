import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import type { ShopStore } from '../data/store';
import { createTestStore } from './fixtures';

/** Render inside an AppProvider backed by a memory store (test customers by default). */
export function renderWithApp(ui: ReactNode, store: ShopStore = createTestStore()) {
  return { store, ...render(<AppProvider store={store}>{ui}</AppProvider>) };
}
