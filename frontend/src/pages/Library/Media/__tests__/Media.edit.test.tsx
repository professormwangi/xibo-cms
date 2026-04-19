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

import { screen, fireEvent, act } from '@testing-library/react';
import type React from 'react';
import { vi, beforeEach, describe, test, expect } from 'vitest';

import type EditMediaModalComponent from '../components/EditMediaModal';

import { mockEditMedia, mockFetchMedia, renderMediaPage } from './mediaTestUtils';

import { fetchMedia, updateMedia } from '@/services/mediaApi';
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
vi.mock('@/services/mediaApi', () => ({
  fetchMedia: vi.fn(),
  uploadMedia: vi.fn(),
  uploadMediaFromUrl: vi.fn(),
  updateMedia: vi.fn(),
  uploadThumbnail: vi.fn(),
  deleteMedia: vi.fn(),
  cloneMedia: vi.fn(),
  replaceMedia: vi.fn(),
  downloadMedia: vi.fn().mockResolvedValue(undefined),
  downloadMediaAsZip: vi.fn().mockResolvedValue(undefined),
  fetchMediaBlob: vi.fn().mockResolvedValue(new Blob()),
}));

// EditMediaModal stub — replaces the real form with a minimal dialog.
// These tests only check that the page opens/closes the modal and refreshes
// the table on save. For form field tests see Media.edit.form.test.tsx.
vi.mock('../components/EditMediaModal', () => ({
  default: ({
    isOpen = true,
    onClose,
    onSave,
  }: React.ComponentProps<typeof EditMediaModalComponent>) =>
    isOpen ? (
      <div role="dialog" aria-label="Edit Media">
        <button onClick={() => onClose?.()}>Cancel</button>
        <button onClick={() => onSave?.({} as Parameters<NonNullable<typeof onSave>>[0])}>
          Save Media
        </button>
      </div>
    ) : null,
}));

// =============================================================================
// Fixtures
// =============================================================================

const updatedMedia = { ...mockEditMedia, name: 'renamed.png' };

// =============================================================================
// Tests
// =============================================================================

describe('Media page — edit', () => {
  beforeEach(() => {
    testQueryClient.clear();
    vi.clearAllMocks();
    mockFetchMedia({ rows: [mockEditMedia], totalCount: 1 });
  });

  // ---------------------------------------------------------------------------
  // Clicking Edit on a row opens the Edit Media modal.
  // ---------------------------------------------------------------------------
  test('opens the Edit modal when the Edit action is clicked on a row', async () => {
    await act(async () => {
      renderMediaPage();
    });

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    });

    expect(await screen.findByRole('dialog', { name: 'Edit Media' })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Clicking Cancel closes the modal without touching the API.
  // ---------------------------------------------------------------------------
  test('Cancel button closes the modal without calling updateMedia', async () => {
    await act(async () => {
      renderMediaPage();
    });

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    });

    await screen.findByRole('dialog', { name: 'Edit Media' });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });

    expect(screen.queryByRole('dialog', { name: 'Edit Media' })).not.toBeInTheDocument();
    expect(updateMedia).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Saving an edit triggers query invalidation so the table row reflects the
  // updated values without a page refresh.
  // ---------------------------------------------------------------------------
  test('saving an edit updates the row name in the table', async () => {
    await act(async () => {
      renderMediaPage();
    });

    expect(await screen.findByText(mockEditMedia.name)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    });

    // When the query is invalidated after save, return the updated media item.
    vi.mocked(fetchMedia).mockResolvedValueOnce({
      rows: [updatedMedia],
      totalCount: 1,
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Media' }));
    });

    expect(await screen.findByText('renamed.png')).toBeInTheDocument();
  });
});
