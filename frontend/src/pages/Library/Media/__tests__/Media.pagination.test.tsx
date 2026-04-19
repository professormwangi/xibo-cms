/*
 * Copyright (C) 2026 Xibo Signage Ltd
 *
 * Xibo - Digital Signage - https://xibosignage.com
 *
 * This file is part of Xibo.
 *
 * Xibo is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * Xibo is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Xibo.  If not, see <http://www.gnu.org/licenses/>.
 */

import { screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { vi, beforeEach, describe, test, expect } from 'vitest';

import { useMediaData } from '../hooks/useMediaData';

import { mockMediaData, renderMediaPage } from './mediaTestUtils';

import { testQueryClient } from '@/setupTests';

// =============================================================================
// Module mocks
// =============================================================================

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { changeLanguage: vi.fn() } }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/services/folderApi', () => ({
  fetchFolderById: vi.fn().mockResolvedValue({ id: 1, text: 'Root' }),
  fetchFolderTree: vi.fn().mockResolvedValue([]),
  searchFolders: vi.fn().mockResolvedValue([]),
  fetchContextButtons: vi.fn().mockResolvedValue({ create: true }),
  selectFolder: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('@/services/userApi', () => ({
  fetchUserPreference: vi.fn().mockResolvedValue(null),
  saveUserPreference: vi.fn().mockResolvedValue(undefined),
  fetchUsers: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/components/ui/modals/Modal');
vi.mock('@/hooks/useDebounce');
vi.mock('@/pages/Library/Media/hooks/useMediaFilterOptions', () => ({
  useMediaFilterOptions: vi.fn().mockReturnValue({
    filterOptions: [
      {
        label: 'Retired',
        name: 'retired',
        options: [
          { label: 'Any', value: null },
          { label: 'No', value: 0 },
          { label: 'Yes', value: 1 },
        ],
        shouldTranslateOptions: false,
        showAllOption: false,
      },
    ],
    isLoading: false,
  }),
}));
vi.mock('../hooks/useMediaData', () => ({
  useMediaData: vi.fn(),
}));
vi.mock('@/services/mediaApi', () => ({
  deleteMedia: vi.fn().mockResolvedValue(undefined),
  cloneMedia: vi.fn().mockResolvedValue(undefined),
  downloadMedia: vi.fn().mockResolvedValue(undefined),
  downloadMediaAsZip: vi.fn().mockResolvedValue(undefined),
  fetchMediaBlob: vi.fn().mockResolvedValue(new Blob()),
}));

// =============================================================================
// Fixtures
// =============================================================================

// 10 rows + totalCount 25 so pagination controls (Next / page buttons) render.
const PAGINATED_MEDIA = {
  data: {
    rows: Array.from({ length: 10 }).map((_, i) => ({
      mediaId: i + 1,
      name: `Media Item ${i + 1}`,
      mediaType: 'image',
      userPermissions: { view: 1, edit: 1, delete: 1 },
    })),
    totalCount: 25,
  },
  isFetching: false,
  isError: false,
  error: null,
};

// =============================================================================
// Tests
// =============================================================================

describe('Media page — pagination', () => {
  beforeEach(() => {
    testQueryClient.clear();
    vi.clearAllMocks();
    mockMediaData(PAGINATED_MEDIA);
  });

  // ---------------------------------------------------------------------------
  // FIXME:
  // Clicking Previous on page 2 does not navigate back to page 1.
  // ---------------------------------------------------------------------------
  test.skip('clicking Previous after Next decrements pageIndex back to 0', async () => {
    await act(async () => {
      renderMediaPage();
    });

    fireEvent.click(await screen.findByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(useMediaData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({ pageIndex: 1 }),
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /Previous/i }));

    await waitFor(() => {
      expect(useMediaData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({ pageIndex: 0 }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Typing a new search term while on page 2 jumps back to page 1.
  // ---------------------------------------------------------------------------
  test('typing in search while on page 2 resets pageIndex to 0', async () => {
    const user = userEvent.setup({ delay: null });
    await act(async () => {
      renderMediaPage();
    });

    fireEvent.click(await screen.findByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(useMediaData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({ pageIndex: 1 }),
        }),
      );
    });

    await user.type(screen.getByPlaceholderText('Search media...'), 'x');

    await waitFor(() => {
      expect(useMediaData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({ pageIndex: 0 }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // FIXME: Applying a filter while on page 2 jumps back to page 1.
  // ---------------------------------------------------------------------------
  test.skip('applying an advanced filter while on page 2 resets pageIndex to 0', async () => {
    await act(async () => {
      renderMediaPage();
    });

    fireEvent.click(await screen.findByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(useMediaData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({ pageIndex: 1 }),
        }),
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    });

    const retiredLabel = screen.getByText('Retired');
    const retiredContainer = retiredLabel.closest('div')!;
    await act(async () => {
      fireEvent.click(within(retiredContainer).getByRole('button'));
    });
    await act(async () => {
      fireEvent.click(within(retiredContainer).getByText('Yes'));
    });

    await waitFor(() => {
      expect(useMediaData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({ pageIndex: 0 }),
        }),
      );
    });
  });
});
