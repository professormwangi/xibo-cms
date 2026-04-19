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
import type React from 'react';
import { vi, beforeEach, describe, test, expect } from 'vitest';

import { mockEditMedia, mockMediaData, renderMediaPage } from './mediaTestUtils';

import { deleteMedia } from '@/services/mediaApi';
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
vi.mock('@/pages/Library/Media/hooks/useMediaFilterOptions', () => ({
  useMediaFilterOptions: vi.fn().mockReturnValue({ filterOptions: [], isLoading: false }),
}));
vi.mock('../hooks/useMediaData');
vi.mock('@/services/mediaApi', () => ({
  uploadMedia: vi.fn(),
  uploadMediaFromUrl: vi.fn(),
  updateMedia: vi.fn(),
  uploadThumbnail: vi.fn(),
  deleteMedia: vi.fn(),
  cloneMedia: vi.fn(),
  downloadMedia: vi.fn().mockResolvedValue(undefined),
  downloadMediaAsZip: vi.fn().mockResolvedValue(undefined),
  fetchMediaBlob: vi.fn().mockResolvedValue(new Blob()),
}));

// Stub DataTableRowActions so all row actions are always visible in the DOM.
// floating-ui's useClick does not fire in JSDOM, so without this stub the
// dropdown never opens and the Delete action button is unreachable.
vi.mock('@/components/ui/table/DataTableRowActions', () => ({
  default: ({
    row,
    actions,
  }: {
    row: unknown;
    actions: Array<{ label?: string; onClick?: (r: unknown) => void; isSeparator?: boolean }>;
  }) => (
    <div>
      <button aria-label="More actions" />
      {actions
        .filter((a) => !a.isSeparator && a.label)
        .map((action, i) => (
          <button key={i} onClick={() => action.onClick?.(row)}>
            {action.label}
          </button>
        ))}
    </div>
  ),
}));

// =============================================================================
// Helpers
// =============================================================================

// Opens the delete confirmation modal via the row action "Delete" button.
const openRowDeleteModal = async () => {
  await screen.findByText(mockEditMedia.name);
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  return screen.findByRole('dialog');
};

// =============================================================================
// Tests
// =============================================================================

describe('Delete Media — row action modal', () => {
  beforeEach(() => {
    testQueryClient.clear();
    vi.clearAllMocks();
    vi.mocked(deleteMedia).mockResolvedValue(undefined);
    mockMediaData({
      data: { rows: [mockEditMedia], totalCount: 1 },
      isFetching: false,
      isError: false,
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // Clicking Delete in the row action dropdown opens the confirmation modal.
  // ---------------------------------------------------------------------------
  test('Delete row action opens the confirmation modal', async () => {
    await act(async () => {
      renderMediaPage();
    });

    const dialog = await openRowDeleteModal();

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Delete File?')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Clicking Cancel closes the modal without making any API call.
  // ---------------------------------------------------------------------------
  test('Cancel closes the modal without calling deleteMedia', async () => {
    await act(async () => {
      renderMediaPage();
    });

    await openRowDeleteModal();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(deleteMedia).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Clicking "Yes, Delete" calls deleteMedia with the correct media ID.
  // ---------------------------------------------------------------------------
  test('Yes, Delete calls deleteMedia with the correct mediaId', async () => {
    await act(async () => {
      renderMediaPage();
    });

    await openRowDeleteModal();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }));
    });

    await waitFor(() => {
      expect(deleteMedia).toHaveBeenCalledWith(
        mockEditMedia.mediaId,
        expect.objectContaining({ forceDelete: false, purge: false }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // A successful delete closes the modal.
  // ---------------------------------------------------------------------------
  test('successful delete closes the modal', async () => {
    await act(async () => {
      renderMediaPage();
    });

    await openRowDeleteModal();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }));
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // A failed delete keeps the modal open and shows the error message.
  // ---------------------------------------------------------------------------
  test('failed delete keeps the modal open and shows an error', async () => {
    vi.mocked(deleteMedia).mockRejectedValueOnce(new Error('Media is in use'));

    await act(async () => {
      renderMediaPage();
    });

    await openRowDeleteModal();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }));
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText('{{count}} item(s) could not be deleted.')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Selecting a row and clicking the bulk "Delete Selected" toolbar button
  // opens the same confirmation modal — single entry point for both flows.
  // ---------------------------------------------------------------------------
  test('bulk Delete Selected also opens the confirmation modal', async () => {
    await act(async () => {
      renderMediaPage();
    });

    const checkboxes = await screen.findAllByRole('checkbox', { name: /Select row/i });
    await act(async () => {
      fireEvent.click(checkboxes[0]!);
    });

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /Delete Selected/i }));
    });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete File?')).toBeInTheDocument();
  });
});
