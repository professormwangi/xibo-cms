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

// NOTE: Displays have no "Add" action — they self-register via the player
// software. This file covers the Edit (update) workflow only.

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import Displays from '../Displays';

import { mockDisplays, renderWithClient } from './Setup';

import { fetchDisplays, updateDisplay } from '@/services/displayApi';

describe('Displays Page - Edit (Update)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDisplays).mockResolvedValue({
      rows: mockDisplays,
      totalCount: 2,
    });
  });

  it('opens the Edit modal when clicking the Edit button on a row', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]!);

    expect(screen.getByRole('heading', { name: 'Edit Display' })).toBeInTheDocument();
  });

  it('pre-populates the Edit modal with the current display name', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);

    const nameInput = screen.getByLabelText('Display Name');
    expect(nameInput).toHaveValue('Display 1');
  });

  it('pre-populates the correct data when editing the second row', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 2')).toBeInTheDocument());

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[1]!);

    const nameInput = screen.getByLabelText('Display Name');
    expect(nameInput).toHaveValue('Display 2');
  });

  it('calls updateDisplay with the correct displayId and updated name on save', async () => {
    const user = userEvent.setup();
    vi.mocked(updateDisplay).mockResolvedValue({
      ...mockDisplays[0]!,
      display: 'Display 1 Updated',
    });

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);

    const nameInput = screen.getByLabelText('Display Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Display 1 Updated');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateDisplay).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ display: 'Display 1 Updated' }),
      );
    });
  });

  it('closes the Edit modal after a successful save', async () => {
    const user = userEvent.setup();
    vi.mocked(updateDisplay).mockResolvedValue({
      ...mockDisplays[0]!,
      display: 'Display 1 Updated',
    });

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('keeps the Edit modal open and shows the API error message when save fails', async () => {
    const user = userEvent.setup();
    const mockAxiosError = {
      isAxiosError: true,
      response: { data: { message: 'Display name already in use.' } },
    };
    vi.mocked(updateDisplay).mockRejectedValue(mockAxiosError);

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      // API was called
      expect(updateDisplay).toHaveBeenCalledWith(1, expect.any(Object));

      // Modal must still be open
      expect(screen.getByRole('heading', { name: 'Edit Display' })).toBeInTheDocument();

      // Error message must be displayed
      expect(screen.getByText('Display name already in use.')).toBeInTheDocument();
    });
  });

  it('closes the Edit modal when Cancel is clicked without saving', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);
    expect(screen.getByRole('heading', { name: 'Edit Display' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // API was never called
    expect(updateDisplay).not.toHaveBeenCalled();
  });
});
