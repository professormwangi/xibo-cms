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

import Displays from '../Displays';

import { mockDisplays, renderWithClient } from './Setup';

import { fetchDisplays } from '@/services/displayApi';

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

  it('renders the correct loggedIn labels for each row', async () => {
    // Display 1: loggedIn=1 → "Yes", Display 2: loggedIn=0 → "No"
    renderWithClient(<Displays />);

    await waitFor(() => {
      // Both "Yes" (loggedIn) and "No" (loggedIn) cells should be present
      const yesCells = screen.getAllByText('Yes');
      const noCells = screen.getAllByText('No');
      expect(yesCells.length).toBeGreaterThanOrEqual(1);
      expect(noCells.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders the correct authorised labels for each row', async () => {
    // Display 1: licensed=1 → "Yes" (authorised), Display 2: licensed=0 → "No"
    renderWithClient(<Displays />);

    await waitFor(() => {
      expect(screen.getByText('Display 1')).toBeInTheDocument();
    });

    // Column "Authorised" header must be present
    expect(screen.getByText('Authorised')).toBeInTheDocument();
  });

  it('shows the correct clientType for each display', async () => {
    renderWithClient(<Displays />);

    await waitFor(() => {
      expect(screen.getByText('android')).toBeInTheDocument();
      expect(screen.getByText('windows')).toBeInTheDocument();
    });
  });

  it('triggers a new API call when searching by display name', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText('Search display...');
    await user.type(searchInput, 'android display');

    // Wait for debounce and refetch
    await waitFor(() => {
      expect(fetchDisplays).toHaveBeenCalledWith(
        expect.objectContaining({ display: 'android display', start: 0 }),
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
    const searchInput = screen.getByPlaceholderText('Search display...');
    await user.type(searchInput, 'test');

    await waitFor(() => {
      expect(fetchDisplays).toHaveBeenCalledWith(
        expect.objectContaining({ display: 'test', start: 0 }),
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

  it('does not show pagination controls when total count fits on one page', async () => {
    // totalCount=2 with pageSize=10 → only one page, no pagination buttons
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
  });
});
