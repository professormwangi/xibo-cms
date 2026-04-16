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

import { deleteDisplay, fetchDisplays } from '@/services/displayApi';

describe('Displays Page - Delete and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDisplays).mockResolvedValue({
      rows: mockDisplays,
      totalCount: 2,
    });
  });

  it('opens the Delete modal when clicking the Delete button on a row', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]!);

    expect(screen.getByRole('heading', { name: 'Delete Display?' })).toBeInTheDocument();
  });

  it('shows the display name in the Delete modal confirmation message', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);

    // The modal message should reference the target display name
    expect(screen.getByRole('dialog')).toHaveTextContent('Display 1');
  });

  it('calls deleteDisplay with the correct displayId on confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteDisplay).mockResolvedValue(undefined);

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Yes, Delete' }));

    await waitFor(() => {
      expect(deleteDisplay).toHaveBeenCalledWith(1);
    });
  });

  it('closes the Delete modal after successful deletion', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteDisplay).mockResolvedValue(undefined);

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Yes, Delete' }));

    await waitFor(() => {
      expect(deleteDisplay).toHaveBeenCalledWith(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('keeps the Delete modal open and shows the API error message when deletion fails', async () => {
    const user = userEvent.setup();
    const mockAxiosError = {
      isAxiosError: true,
      response: { data: { message: 'Cannot delete display. It is currently in use.' } },
    };
    vi.mocked(deleteDisplay).mockRejectedValue(mockAxiosError);

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Yes, Delete' }));

    await waitFor(() => {
      // API was called
      expect(deleteDisplay).toHaveBeenCalledWith(1);

      // CRITICAL: modal must still be open
      expect(screen.getByRole('heading', { name: 'Delete Display?' })).toBeInTheDocument();

      // CRITICAL: API error message must be visible inside the modal
      expect(
        screen.getByText('Cannot delete display. It is currently in use.'),
      ).toBeInTheDocument();
    });
  });

  it('closes the Delete modal when Cancel is clicked without deleting', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);
    expect(screen.getByRole('heading', { name: 'Delete Display?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // API must never have been called
    expect(deleteDisplay).not.toHaveBeenCalled();
  });

  it('calls deleteDisplay with the correct displayId when deleting the second row', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteDisplay).mockResolvedValue(undefined);

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 2')).toBeInTheDocument());

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[1]!);
    await user.click(screen.getByRole('button', { name: 'Yes, Delete' }));

    await waitFor(() => {
      expect(deleteDisplay).toHaveBeenCalledWith(2);
    });
  });

  it('clears the error when the Delete modal is dismissed and reopened', async () => {
    const user = userEvent.setup();

    // First attempt fails
    const mockAxiosError = {
      isAxiosError: true,
      response: { data: { message: 'Cannot delete display. It is currently in use.' } },
    };
    vi.mocked(deleteDisplay).mockRejectedValue(mockAxiosError);

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Yes, Delete' }));

    await waitFor(() => {
      expect(screen.getByText('Cannot delete display. It is currently in use.')).toBeInTheDocument();
    });

    // Dismiss modal
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Reopen modal — error should be gone
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);
    expect(
      screen.queryByText('Cannot delete display. It is currently in use.'),
    ).not.toBeInTheDocument();
  });
});
