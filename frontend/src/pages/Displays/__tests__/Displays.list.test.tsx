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

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import Displays from '../Displays/Displays';

import { mockDisplays, renderWithClient } from './Setup';

import { fetchDisplays } from '@/services/displaysApi';

vi.mock('@/services/displaysApi', () => ({
  fetchDisplays: vi.fn(),
  updateDisplay: vi.fn(),
  deleteDisplay: vi.fn(),
  toggleDisplayAuthorised: vi.fn(),
  fetchDisplayLocales: vi.fn().mockResolvedValue([]),
  fetchDisplayVenues: vi.fn().mockResolvedValue([]),
  checkLicence: vi.fn(),
  collectNow: vi.fn(),
  moveCms: vi.fn(),
  moveCmsCancel: vi.fn(),
  purgeAll: vi.fn(),
  requestScreenShot: vi.fn(),
  sendCommand: vi.fn(),
  setBandwidthLimitMultiple: vi.fn(),
  setDefaultLayout: vi.fn(),
  triggerWebhook: vi.fn(),
  wakeOnLan: vi.fn(),
}));
vi.mock('@/services/displayProfileApi', () => ({
  fetchDisplayProfile: vi.fn().mockResolvedValue({ rows: [], totalCount: 0 }),
  fetchDisplayProfileById: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/services/daypartApi', () => ({
  fetchDaypart: vi.fn().mockResolvedValue({ rows: [] }),
}));
vi.mock('@/services/playerSoftwareApi', () => ({
  fetchPlayerSoftware: vi.fn().mockResolvedValue({ rows: [] }),
}));
vi.mock('@/services/layoutsApi', () => ({
  fetchLayouts: vi.fn().mockResolvedValue({ rows: [] }),
}));
vi.mock('@/services/displayGroupApi', () => ({
  fetchDisplayGroups: vi.fn().mockResolvedValue({ rows: [], totalCount: 0 }),
}));
vi.mock('@/services/folderApi', () => ({
  selectFolder: vi.fn(),
  createFolder: vi.fn(),
  deleteFolder: vi.fn(),
  editFolder: vi.fn(),
  moveFolder: vi.fn(),
  fetchFolderTree: vi.fn().mockResolvedValue([]),
  fetchFolderById: vi.fn().mockResolvedValue(null),
  searchFolders: vi.fn().mockResolvedValue([]),
  fetchContextButtons: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/services/userApi', () => ({
  fetchUserPreference: vi.fn().mockResolvedValue(null),
  saveUserPreference: vi.fn().mockResolvedValue(undefined),
  saveUserPreferencesBulk: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../Displays/components/DisplayMap', () => ({ default: () => null }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('Displays Page - Render, Search, and Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDisplays).mockResolvedValue({
      rows: mockDisplays,
      totalCount: 2,
    });
  });

  it('renders the data table with display names', async () => {
    renderWithClient(<Displays />);

    await waitFor(() => {
      expect(screen.getByText('Display 1')).toBeInTheDocument();
      expect(screen.getByText('Display 2')).toBeInTheDocument();
    });
  });

  it('renders the correct mediaInventoryStatus labels', async () => {
    // Display 1: status=1 → "Up to date", Display 2: status=3 → "Out of date"
    renderWithClient(<Displays />);

    await waitFor(() => {
      expect(screen.getByText('Up to date')).toBeInTheDocument();
      expect(screen.getByText('Out of date')).toBeInTheDocument();
    });
  });

  it('shows "Downloading" label when mediaInventoryStatus is 2', async () => {
    vi.mocked(fetchDisplays).mockResolvedValue({
      rows: [{ ...mockDisplays[0]!, mediaInventoryStatus: 2 }],
      totalCount: 1,
    });

    renderWithClient(<Displays />);

    await waitFor(() => {
      expect(screen.getByText('Downloading')).toBeInTheDocument();
    });
  });

  it('renders the Logged In column header', async () => {
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    // 'Logged In' appears as both a column header and a filter label; verify it's present
    expect(screen.getAllByText('Logged In').length).toBeGreaterThan(0);
  });

  it('renders the Authorised column header', async () => {
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    // 'Authorised' appears as both a column header and a filter label; verify it's present
    expect(screen.getAllByText('Authorised').length).toBeGreaterThan(0);
  });

  it('shows the correct clientType label for each display', async () => {
    // clientType is translated: 'android' → 'Android', 'windows' → 'Windows'
    renderWithClient(<Displays />);

    await waitFor(() => {
      expect(screen.getByText('Android')).toBeInTheDocument();
      expect(screen.getByText('Windows')).toBeInTheDocument();
    });
  });

  it('triggers a new API call when searching by display name', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText('Search displays...');
    await user.type(searchInput, 'android display');

    // Wait for debounce and refetch — the data hook uses 'keyword' not 'display'
    await waitFor(() => {
      expect(fetchDisplays).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'android display', start: 0 }),
      );
    });
  });

  it('resets to the first page when the search term changes', async () => {
    const user = userEvent.setup();

    // Return 20 total items so pagination renders
    vi.mocked(fetchDisplays).mockResolvedValue({
      rows: mockDisplays,
      totalCount: 20,
    });

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    // Navigate to page 2
    const nextButton = screen.getByRole('button', { name: 'Next' });
    await user.click(nextButton);

    await waitFor(() => {
      expect(fetchDisplays).toHaveBeenCalledWith(expect.objectContaining({ start: 10 }));
    });

    // Now type a search term — should reset to start=0
    const searchInput = screen.getByPlaceholderText('Search displays...');
    await user.type(searchInput, 'test');

    await waitFor(() => {
      expect(fetchDisplays).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'test', start: 0 }),
      );
    });
  });

  it('handles pagination — clicking Next fetches the next page', async () => {
    const user = userEvent.setup();

    vi.mocked(fetchDisplays).mockResolvedValue({
      rows: mockDisplays,
      totalCount: 20,
    });

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    const nextButton = screen.getByRole('button', { name: 'Next' });
    await user.click(nextButton);

    await waitFor(() => {
      expect(fetchDisplays).toHaveBeenCalledWith(expect.objectContaining({ start: 10 }));
    });
  });

  it('handles pagination — clicking Previous fetches the previous page', async () => {
    const user = userEvent.setup();

    vi.mocked(fetchDisplays).mockResolvedValue({
      rows: mockDisplays,
      totalCount: 20,
    });

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    // Go to page 2 first
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(fetchDisplays).toHaveBeenCalledWith(expect.objectContaining({ start: 10 })),
    );

    // Go back to page 1
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await waitFor(() => {
      expect(fetchDisplays).toHaveBeenCalledWith(expect.objectContaining({ start: 0 }));
    });
  });

  it('disables pagination controls when total count fits on one page', async () => {
    // totalCount=2 with pageSize=10 → only one page; buttons render but are disabled
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });
});
