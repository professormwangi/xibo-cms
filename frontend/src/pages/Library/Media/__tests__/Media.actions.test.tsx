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

import { cloneMedia } from '@/services/mediaApi';
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
  deleteMedia: vi.fn().mockResolvedValue(undefined),
  cloneMedia: vi.fn(),
  replaceMedia: vi.fn(),
  downloadMedia: vi.fn().mockResolvedValue(undefined),
  downloadMediaAsZip: vi.fn().mockResolvedValue(undefined),
  fetchMediaBlob: vi.fn().mockResolvedValue(new Blob()),
}));

// Stub DataTableRowActions so all row actions are rendered directly in the DOM.
// floating-ui's useClick does not fire in JSDOM, making the real dropdown
// inaccessible without this stub.
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

// Stub TagInput so tag interactions don't interfere with action modal tests.
// Tags are pre-set from the media fixture and do not need to be changed here.
vi.mock('@/components/ui/forms/TagInput', () => ({ default: () => null }));

// Stub SelectFolder — used inside the Move modal and the Replace File modal's
// folder context; not relevant to Copy/Replace tests.
vi.mock('@/components/ui/forms/SelectFolder', () => ({ default: () => null }));

// =============================================================================
// Helpers
// =============================================================================

// Clicks the named row action button. With the DataTableRowActions stub all
// action buttons are always rendered — no dropdown open step needed.
const openRowAction = async (label: string) => {
  await screen.findByText(mockEditMedia.name);
  // Some actions (e.g. Edit, Download) appear twice — quick action + dropdown.
  // For those we click the first occurrence; for unique actions getByRole works.
  const buttons = screen.getAllByRole('button', { name: label });
  fireEvent.click(buttons[0]!);
};

// =============================================================================
// Tests
// =============================================================================

describe('Media page — row actions', () => {
  beforeEach(() => {
    testQueryClient.clear();
    vi.clearAllMocks();
    vi.mocked(cloneMedia).mockResolvedValue({ ...mockEditMedia });
    mockMediaData({
      data: { rows: [mockEditMedia], totalCount: 1 },
      isFetching: false,
      isError: false,
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // Copy (Make a Copy)
  //
  // CopyMediaModal pre-fills the name via incrementName(media.name).
  // incrementName('test-image.png') → 'test-image.png (1)'
  // ---------------------------------------------------------------------------
  describe('Copy (Make a Copy)', () => {
    // Modal opens with the name field pre-filled as incrementName(media.name).
    test('modal opens with name field pre-filled from the media name', async () => {
      await act(async () => {
        renderMediaPage();
      });

      await openRowAction('Make a Copy');

      const dialog = await screen.findByRole('dialog', { name: 'Copy Media' });
      expect(within(dialog).getByLabelText('New name')).toHaveValue('test-image.png (1)');
    });

    // An empty name must be blocked before calling the API.
    test('empty name shows "Name is required" and does not call cloneMedia', async () => {
      await act(async () => {
        renderMediaPage();
      });

      await openRowAction('Make a Copy');

      const dialog = await screen.findByRole('dialog', { name: 'Copy Media' });
      fireEvent.change(within(dialog).getByLabelText('New name'), { target: { value: '' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

      expect(await screen.findByText('Name is required')).toBeInTheDocument();
      expect(cloneMedia).not.toHaveBeenCalled();
    });

    // The original name 'test-image.png' already exists in the table list.
    test('duplicate name shows validation error and does not call cloneMedia', async () => {
      await act(async () => {
        renderMediaPage();
      });

      await openRowAction('Make a Copy');

      const dialog = await screen.findByRole('dialog', { name: 'Copy Media' });
      fireEvent.change(within(dialog).getByLabelText('New name'), {
        target: { value: mockEditMedia.name },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

      expect(
        await screen.findByText('A media item with this name already exists'),
      ).toBeInTheDocument();
      expect(cloneMedia).not.toHaveBeenCalled();
    });

    // Happy path: valid unique name calls cloneMedia with the mediaId, name, and
    // serialised tags from the fixture (nature|forest).
    test('Save calls cloneMedia with mediaId, new name, and serialised tags', async () => {
      await act(async () => {
        renderMediaPage();
      });

      await openRowAction('Make a Copy');

      const dialog = await screen.findByRole('dialog', { name: 'Copy Media' });
      // The pre-filled value 'test-image.png (1)' is unique — just click Save.
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(cloneMedia).toHaveBeenCalledWith({
          mediaId: mockEditMedia.mediaId,
          name: 'test-image.png (1)',
          tags: 'nature|forest',
        });
      });
    });

    // Cancelling must close the modal without calling the API.
    test('Cancel closes the modal without calling cloneMedia', async () => {
      await act(async () => {
        renderMediaPage();
      });

      await openRowAction('Make a Copy');

      const dialog = await screen.findByRole('dialog', { name: 'Copy Media' });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(cloneMedia).not.toHaveBeenCalled();
    });

    // Modal closes automatically after a successful copy.
    test('modal closes after a successful copy', async () => {
      await act(async () => {
        renderMediaPage();
      });

      await openRowAction('Make a Copy');

      const dialog = await screen.findByRole('dialog', { name: 'Copy Media' });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });

  // ---------------------------------------------------------------------------
  // Replace File
  //
  // ReplaceFileModal lets the user swap the underlying file of a media item.
  // The Save button is disabled until a replacement file is selected.
  // ---------------------------------------------------------------------------
  describe('Replace File', () => {
    // The modal title is "Replace File" and it shows the current file details.
    test('modal opens showing the Replace File title', async () => {
      await act(async () => {
        renderMediaPage();
      });

      await openRowAction('Replace File');

      expect(await screen.findByRole('dialog', { name: 'Replace File' })).toBeInTheDocument();
    });

    // Save is disabled when no replacement file has been selected yet.
    test('Save button is disabled until a file is selected', async () => {
      await act(async () => {
        renderMediaPage();
      });

      await openRowAction('Replace File');

      await screen.findByRole('dialog', { name: 'Replace File' });
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    // Selecting a file enables the Save button.
    test('Save button becomes enabled after a file is selected', async () => {
      await act(async () => {
        renderMediaPage();
      });

      await openRowAction('Replace File');
      const dialog = await screen.findByRole('dialog', { name: 'Replace File' });

      // Scope to the dialog — document.querySelector would pick up the page's
      // hidden upload input before the modal's own file input.
      const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['content'], 'new-image.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
      });
    });

    // Cancelling closes the modal without making any API call.
    test('Cancel closes the modal', async () => {
      await act(async () => {
        renderMediaPage();
      });

      await openRowAction('Replace File');
      await screen.findByRole('dialog', { name: 'Replace File' });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });
});
