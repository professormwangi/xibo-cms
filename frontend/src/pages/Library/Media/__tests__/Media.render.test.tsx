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

import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { vi, beforeEach, describe, test, expect } from 'vitest';

import { useMediaData } from '../hooks/useMediaData';

import { renderMediaPage } from './mediaTestUtils';

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
// Tests
// =============================================================================

describe('Media page', () => {
  beforeEach(() => {
    testQueryClient.clear();
    vi.clearAllMocks();
    vi.mocked(useMediaData).mockReturnValue({
      data: { rows: [], totalCount: 0 },
      isFetching: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useMediaData>);
  });

  // ---------------------------------------------------------------------------
  // On first render: the table, search input, Add Media button, Filters button,
  // and all expected column headers are present; no error alert is shown.
  // ---------------------------------------------------------------------------
  test('verifies initial UI elements and successful load', async () => {
    renderMediaPage();

    expect(await screen.findByTitle('Table View')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Media' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search media...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Thumbnail' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tags' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Duration' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Size' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Resolution' })).toBeInTheDocument();
    expect(document.querySelector('.no-results')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // While isFetching is true the page shows a spinner and no data rows.
  // ---------------------------------------------------------------------------
  test('verifies loading state while fetching data', async () => {
    vi.mocked(useMediaData).mockReturnValue({
      data: undefined,
      isFetching: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useMediaData>);

    renderMediaPage();

    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // When the hook returns isError: true the error message surfaces in an alert.
  // ---------------------------------------------------------------------------
  test('verifies error message when API fails', async () => {
    vi.mocked(useMediaData).mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: true,
      error: new Error('API connection failed'),
    } as unknown as ReturnType<typeof useMediaData>);

    renderMediaPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('API connection failed');
  });

  // ---------------------------------------------------------------------------
  // A media row renders with its name, type, and file size. Hidden columns
  // (Created date) become visible after the user toggles them on.
  // ---------------------------------------------------------------------------
  test('verifies media items and formatting render correctly from API response', async () => {
    const user = userEvent.setup({ delay: null });

    vi.mocked(useMediaData).mockReturnValue({
      data: {
        rows: [
          {
            mediaId: 1,
            name: 'mock_video_presentation.mp4',
            mediaType: 'video',
            fileSize: 1048576,
            fileSizeFormatted: '1.00 MB',
            duration: 60,
            createdDt: '2024-02-14 10:30:00',
            modifiedDt: '2024-02-15 11:45:00',
          },
        ],
        totalCount: 1,
      },
      isFetching: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useMediaData>);

    renderMediaPage();

    expect(await screen.findByText('mock_video_presentation.mp4')).toBeInTheDocument();

    const videoElements = screen.getAllByText('video');
    expect(videoElements[0]).toBeInTheDocument();

    expect(screen.getByText(/1(.*?)MB|1048576/i)).toBeInTheDocument();

    const toggleColumnsBtn = screen.getByRole('button', { name: /Toggle columns/i });
    await user.click(toggleColumnsBtn);

    const createdDateToggle = await screen.findAllByRole('checkbox', { name: /Created/i });
    await user.click(createdDateToggle[0]!);

    await waitFor(() => {
      expect(screen.getByText(/2024-02-14|2024-02-15/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Selecting rows via checkbox reveals the bulk action toolbar (Move, Share,
  // Download, Delete). Selecting all then deselecting all keeps rows checked.
  // ---------------------------------------------------------------------------
  test('verifies media selection behaviours and bulk actions', async () => {
    vi.mocked(useMediaData).mockReturnValue({
      data: {
        rows: [
          {
            mediaId: 1,
            name: 'Item 1',
            mediaType: 'image',
            userPermissions: { delete: true, share: true, edit: true },
          },
          {
            mediaId: 2,
            name: 'Item 2',
            mediaType: 'image',
            userPermissions: { delete: true, share: true, edit: true },
          },
        ],
        totalCount: 2,
      },
      isFetching: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useMediaData>);

    renderMediaPage();

    const selectAllCheckbox = await screen.findByRole('checkbox', { name: /All Items/i });
    const rowCheckboxes = screen.getAllByRole('checkbox', { name: /Select row/i });

    fireEvent.click(rowCheckboxes[0]!);
    expect(rowCheckboxes[0]).toBeChecked();

    expect(screen.getAllByRole('button', { name: /Move/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Share/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Download/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Delete/i })[0]).toBeInTheDocument();

    fireEvent.click(rowCheckboxes[1]!);
    expect(rowCheckboxes[0]).toBeChecked();
    expect(rowCheckboxes[1]).toBeChecked();

    fireEvent.click(selectAllCheckbox);
    fireEvent.click(selectAllCheckbox);
    expect(rowCheckboxes[0]).toBeChecked();
    expect(rowCheckboxes[1]).toBeChecked();
  });

  // ---------------------------------------------------------------------------
  // The view-toggle switches between Table (shows <table>) and Grid (no table).
  // ---------------------------------------------------------------------------
  test('verifies toggling between Table and Grid views', async () => {
    vi.mocked(useMediaData).mockReturnValue({
      data: {
        rows: [{ mediaId: 1, name: 'toggle_target.jpg', mediaType: 'image' }],
        totalCount: 1,
      },
      isFetching: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useMediaData>);

    renderMediaPage();

    expect(await screen.findByRole('table')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /Grid View/i }));

    await waitFor(() => {
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    fireEvent.click(await screen.findByRole('button', { name: /Table View/i }));

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Clicking a thumbnail opens the preview panel with the item name and image.
  // Clicking the close button dismisses the panel.
  // ---------------------------------------------------------------------------
  test('verifies media preview functionality', async () => {
    const user = userEvent.setup({ delay: null });

    vi.mocked(useMediaData).mockReturnValue({
      data: {
        rows: [
          {
            mediaId: 1,
            name: 'fake_blob.jpg',
            mediaType: 'image',
            downloadUrl: 'blob:http://localhost:5173/fake-blob',
            thumbnail: 'blob:http://localhost:5173/fake-blob-thumb',
            tags: [],
            userPermissions: { view: true, edit: true },
          },
        ],
        totalCount: 1,
      },
      isFetching: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useMediaData>);

    renderMediaPage();

    const targetText = await screen.findByText('fake_blob.jpg');
    const tableRow = targetText.closest('tr');
    if (!tableRow) throw new Error('Could not find table row!');

    const thumbnailImg = tableRow.querySelector('img');
    if (!thumbnailImg) throw new Error('Could not find thumbnail image!');

    await user.click(thumbnailImg);

    const previewHeading = await screen.findByRole('heading', { level: 3, name: 'fake_blob.jpg' });
    expect(previewHeading).toBeInTheDocument();

    const previewImages = await screen.findAllByAltText('fake_blob.jpg');
    expect(previewImages.length).toBeGreaterThanOrEqual(1);

    const closePreviewBtn = screen.getByRole('button', { name: /close/i });
    await user.click(closePreviewBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { level: 3, name: 'fake_blob.jpg' }),
      ).not.toBeInTheDocument();
    });
  });
});
