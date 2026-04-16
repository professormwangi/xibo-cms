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

// Authorise / De-authorise is a toggle action unique to Displays.
// A display with licensed=0 is "unauthorised" — the action is "Authorise".
// A display with licensed=1 is "authorised"   — the action is "De-authorise".
// Both states call the same endpoint: PUT /display/authorise/{id}

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import Displays from '../Displays';

import { mockDisplays, renderWithClient } from './Setup';

import { authoriseDisplay, fetchDisplays } from '@/services/displayApi';

describe('Displays Page - Authorise / De-authorise', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDisplays).mockResolvedValue({
      rows: mockDisplays,
      totalCount: 2,
    });
  });

  // ─── Button labels reflect current licensed state ─────────────────────────

  it('shows "De-authorise" button for an authorised display (licensed=1)', async () => {
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    // Display 1 is licensed=1, so its action button should say "De-authorise"
    const deAuthButtons = screen.getAllByRole('button', { name: 'De-authorise' });
    expect(deAuthButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Authorise" button for an unauthorised display (licensed=0)', async () => {
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 2')).toBeInTheDocument());

    // Display 2 is licensed=0, so its action button should say "Authorise"
    const authButtons = screen.getAllByRole('button', { name: 'Authorise' });
    expect(authButtons.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Modal content differs by current state ───────────────────────────────

  it('opens the De-authorise modal for an authorised display', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    // Click "De-authorise" for Display 1 (licensed=1)
    await user.click(screen.getAllByRole('button', { name: 'De-authorise' })[0]!);

    expect(screen.getByRole('heading', { name: 'De-authorise Display?' })).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to de-authorise this Display?'),
    ).toBeInTheDocument();
  });

  it('opens the Authorise modal for an unauthorised display', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 2')).toBeInTheDocument());

    // Click "Authorise" for Display 2 (licensed=0)
    await user.click(screen.getAllByRole('button', { name: 'Authorise' })[0]!);

    expect(screen.getByRole('heading', { name: 'Authorise Display?' })).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to authorise this Display?'),
    ).toBeInTheDocument();
  });

  // ─── API call on confirmation ─────────────────────────────────────────────

  it('calls authoriseDisplay with the correct displayId when confirming de-authorise', async () => {
    const user = userEvent.setup();
    vi.mocked(authoriseDisplay).mockResolvedValue(undefined);

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'De-authorise' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Yes' }));

    await waitFor(() => {
      expect(authoriseDisplay).toHaveBeenCalledWith(1);
    });
  });

  it('calls authoriseDisplay with the correct displayId when confirming authorise', async () => {
    const user = userEvent.setup();
    vi.mocked(authoriseDisplay).mockResolvedValue(undefined);

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 2')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Authorise' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Yes' }));

    await waitFor(() => {
      expect(authoriseDisplay).toHaveBeenCalledWith(2);
    });
  });

  // ─── Modal close behaviour ────────────────────────────────────────────────

  it('closes the Authorise modal after successful confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(authoriseDisplay).mockResolvedValue(undefined);

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'De-authorise' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Yes' }));

    await waitFor(() => {
      expect(authoriseDisplay).toHaveBeenCalledWith(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes the Authorise modal when Cancel is clicked without confirming', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'De-authorise' })[0]!);
    expect(screen.getByRole('heading', { name: 'De-authorise Display?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // API must never have been called
    expect(authoriseDisplay).not.toHaveBeenCalled();
  });
});
