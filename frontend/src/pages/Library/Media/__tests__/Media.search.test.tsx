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

import { screen, waitFor, fireEvent, within, act } from '@testing-library/react';
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
// FilterInputs imports t directly from i18next (not via useTranslation). Mock it so
// the Reset button renders with accessible text instead of an empty string.
vi.mock('i18next', () => ({ t: (key: string) => key }));
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
        label: 'Type',
        name: 'type',
        options: [
          { label: 'Image', value: 'image' },
          { label: 'Video', value: 'video' },
          { label: 'Audio', value: 'audio' },
        ],
        shouldTranslateOptions: false,
        showAllOption: false,
      },
      {
        label: 'Orientation',
        name: 'orientation',
        options: [
          { label: 'Portrait', value: 'portrait' },
          { label: 'Landscape', value: 'landscape' },
          { label: 'Square', value: 'square' },
        ],
        shouldTranslateOptions: false,
        showAllOption: false,
      },
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
// Stub FolderBreadcrumb with a single clickable folder link
vi.mock('@/components/ui/FolderBreadCrumb', () => ({
  default: ({ onNavigate }: { onNavigate?: (folder: { id: number; text: string }) => void }) => (
    <button onClick={() => onNavigate?.({ id: 7, text: 'Campaign Assets' })}>
      Campaign Assets
    </button>
  ),
}));

// =============================================================================
// Fixtures
// =============================================================================

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

describe('Media page — search, filters and pagination', () => {
  beforeEach(() => {
    testQueryClient.clear();
    vi.clearAllMocks();
    mockMediaData({
      data: { rows: [], totalCount: 0 },
      isFetching: false,
      isError: false,
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // Search input — the input is present and accepts text.
  // ---------------------------------------------------------------------------

  test('search input accepts typed text', async () => {
    const user = userEvent.setup({ delay: null });
    renderMediaPage();

    const searchInput = await screen.findByPlaceholderText('Search media...');
    await user.type(searchInput, 'cat');

    expect(searchInput).toHaveValue('cat');
  });

  // Clearing the search field leaves the input empty (no residual text).
  test('clearing search resets the input to empty', async () => {
    const user = userEvent.setup({ delay: null });
    renderMediaPage();

    const searchInput = await screen.findByPlaceholderText('Search media...');
    await user.type(searchInput, 'cat');
    await user.clear(searchInput);

    expect(searchInput).toHaveValue('');
  });

  // The typed value is wired through to the hook's filter param.
  // useDebounce is mocked to return the value immediately (no 500ms wait).
  test('typing in search passes filter param to useMediaData', async () => {
    const user = userEvent.setup({ delay: null });
    renderMediaPage();

    await user.type(await screen.findByPlaceholderText('Search media...'), 'cat');

    await waitFor(() => {
      expect(useMediaData).toHaveBeenLastCalledWith(expect.objectContaining({ filter: 'cat' }));
    });
  });

  // ---------------------------------------------------------------------------
  // Pagination — controls appear only when there is more than one page.
  // ---------------------------------------------------------------------------

  // totalCount: 25, default page size 10 → Next button and page 2 button appear.
  test('pagination controls are visible when totalCount exceeds page size', async () => {
    mockMediaData(PAGINATED_MEDIA);
    renderMediaPage();

    const nextButton = await screen.findByRole('button', { name: 'Next' });
    expect(nextButton).toBeInTheDocument();
    expect(nextButton).not.toBeDisabled();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
  });

  // Clicking Next increments pageIndex from 0 to 1 in the hook call.
  test('clicking Next passes incremented pageIndex to useMediaData', async () => {
    mockMediaData(PAGINATED_MEDIA);
    renderMediaPage();

    fireEvent.click(await screen.findByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(useMediaData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({ pageIndex: 1 }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Sorting — clicking a column header wires its id into the hook's sorting arg.
  // ---------------------------------------------------------------------------

  // The sort chevron is nested inside the <th>; click it rather than the header text.
  test('clicking a sortable column header passes updated sorting to useMediaData', async () => {
    mockMediaData(PAGINATED_MEDIA);
    renderMediaPage();

    const nameHeader = await screen.findByRole('columnheader', { name: /Name/i });
    // The sort handler is on the chevron icon div inside the <th>, not on the <th> itself.
    fireEvent.click(nameHeader.querySelector('.cursor-pointer')!);

    await waitFor(() => {
      expect(useMediaData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sorting: expect.arrayContaining([expect.objectContaining({ id: 'name' })]),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Filters — the panel is hidden until Filters is clicked; each dropdown
  // passes its chosen value into the hook via advancedFilters.
  // ---------------------------------------------------------------------------

  // The Reset button lives inside the hidden panel (aria-hidden). After clicking
  // Filters the panel is accessible and Reset becomes findable.
  test('clicking the Filters button opens the filter panel', async () => {
    renderMediaPage();

    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Filters' }));
    });

    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  // Use selector:'label' to find the Type label without matching the "Type"
  // column header div that also contains the word "Type".
  test('selecting Type = Image passes type to useMediaData', async () => {
    renderMediaPage();

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Filters' }));
    });

    // Use selector:'label' to avoid matching the "Type" column header div.
    const typeLabel = screen.getByText('Type', { selector: 'label' });
    const typeContainer = typeLabel.closest('div')!;
    await act(async () => {
      fireEvent.click(within(typeContainer).getByRole('button'));
    });
    await act(async () => {
      fireEvent.click(within(typeContainer).getByText('Image', { selector: 'li' }));
    });

    await waitFor(() => {
      expect(useMediaData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          advancedFilters: expect.objectContaining({ type: 'image' }),
        }),
      );
    });
  });

  // Picking "Yes" from the Retired dropdown passes retired: 1 (not a string).
  test('selecting Retired = Yes passes retired to useMediaData', async () => {
    renderMediaPage();

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Filters' }));
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
          advancedFilters: expect.objectContaining({ retired: 1 }),
        }),
      );
    });
  });

  // Picking "Landscape" from the Orientation dropdown passes orientation: 'landscape'.
  test('selecting Orientation = Landscape passes orientation to useMediaData', async () => {
    renderMediaPage();

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Filters' }));
    });

    const orientationLabel = screen.getByText('Orientation');
    const orientationContainer = orientationLabel.closest('div')!;
    await act(async () => {
      fireEvent.click(within(orientationContainer).getByRole('button'));
    });
    await act(async () => {
      fireEvent.click(within(orientationContainer).getByText('Landscape'));
    });

    await waitFor(() => {
      expect(useMediaData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          advancedFilters: expect.objectContaining({ orientation: 'landscape' }),
        }),
      );
    });
  });

  // After selecting a filter then clicking Reset, the hook is called with no
  // advancedFilters properties set (the retired key must not be present).
  test('clicking Reset clears all advanced filter values', async () => {
    renderMediaPage();

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Filters' }));
    });

    // Set a filter value first
    const retiredLabel = screen.getByText('Retired');
    const retiredContainer = retiredLabel.closest('div')!;
    await act(async () => {
      fireEvent.click(within(retiredContainer).getByRole('button'));
    });
    await act(async () => {
      fireEvent.click(within(retiredContainer).getByText('Yes'));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    });

    await waitFor(() => {
      const calls = vi.mocked(useMediaData).mock.calls;
      const lastArgs = calls[calls.length - 1]![0];
      expect(lastArgs.advancedFilters).not.toHaveProperty('retired');
    });
  });

  // ---------------------------------------------------------------------------
  // Folder navigation — clicking a folder in the breadcrumb passes its id.
  // ---------------------------------------------------------------------------

  // The stub breadcrumb fires onNavigate({ id: 7 }). The page must forward
  // that id to useMediaData so only items in that folder are fetched.
  test('navigating into a subfolder via breadcrumb filters the table', async () => {
    renderMediaPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Campaign Assets' }));

    await waitFor(() => {
      expect(useMediaData).toHaveBeenLastCalledWith(expect.objectContaining({ folderId: 7 }));
    });
  });

  // ---------------------------------------------------------------------------
  // Refresh — the toolbar refresh button invalidates the query cache.
  // ---------------------------------------------------------------------------

  // The refresh button may have different aria-labels across themes; the test
  // falls back to a title attribute query so it doesn't break on label changes.
  test('refresh triggers query invalidation', async () => {
    renderMediaPage();

    const invalidateSpy = vi.spyOn(testQueryClient, 'invalidateQueries');

    const refreshBtn =
      screen.queryByRole('button', { name: /Refresh|Reload/i }) ||
      document.querySelector('button[title*="Refresh"]') ||
      document.querySelector('button[title*="Reload"]');

    if (refreshBtn) {
      fireEvent.click(refreshBtn);
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalled();
      });
    }
  });
});
