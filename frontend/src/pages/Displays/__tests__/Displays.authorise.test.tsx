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

// Authorise / Unauthorise is a toggle action unique to Displays.
// A display with licensed=0 is "unauthorised" — the row action label is "Authorise".
// A display with licensed=1 is "authorised"   — the row action label is "Unauthorise".
// Both states call the same endpoint via toggleDisplayAuthorised(displayId).

import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import Displays from '../Displays/Displays';

import { mockDisplays, renderWithClient } from './Setup';

import { toggleDisplayAuthorised, fetchDisplays } from '@/services/displaysApi';

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
vi.mock('@/components/ui/modals/Modal', () => ({
  default: ({
    isOpen = true,
    title,
    children,
    actions,
  }: {
    isOpen?: boolean;
    title?: string;
    children?: React.ReactNode;
    actions?: Array<{ label: string; onClick?: () => void; disabled?: boolean }>;
    onClose: () => void;
  }) => {
    if (!isOpen) return null;
    return (
      <div role="dialog" aria-label={title}>
        {title && <h2>{title}</h2>}
        {children}
        <div>
          {actions?.map((action, i) => (
            <button key={i} onClick={action.onClick} disabled={action.disabled}>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    );
  },
}));
// Stub the floating-ui dropdown so all action buttons are always visible in the DOM.
// useClick from @floating-ui/react does not fire in jsdom.
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

// With the DataTableRowActions mock, all action buttons are always visible in the DOM.
// For actions unique to a row (Authorise/Unauthorise), getByRole finds exactly one.
// For actions in every row (e.g. Delete), getAllByRole is used with rowIndex to pick the right one.
async function openDropdownAndClick(
  user: ReturnType<typeof userEvent.setup>,
  rowIndex: number,
  actionLabel: string,
) {
  const buttons = screen.getAllByRole('button', { name: actionLabel });
  // If the action appears in every row, buttons[rowIndex] selects the right row.
  // If the action is unique to one row, buttons[0] is the only match — rowIndex fallback handles it.
  await user.click(buttons[rowIndex] ?? buttons[0]!);
}

describe('Displays Page - Authorise / Unauthorise', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDisplays).mockResolvedValue({
      rows: mockDisplays,
      totalCount: 2,
    });
  });

  // ─── Button labels reflect current licensed state ─────────────────────────

  it('shows "Unauthorise" in the dropdown for an authorised display (licensed=1)', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    // Open More actions for Display 1 (licensed=1)
    const moreActionsButtons = screen.getAllByRole('button', { name: 'More actions' });
    await user.click(moreActionsButtons[0]!);

    expect(screen.getByRole('button', { name: 'Unauthorise' })).toBeInTheDocument();
  });

  it('shows "Authorise" in the dropdown for an unauthorised display (licensed=0)', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 2')).toBeInTheDocument());

    // Open More actions for Display 2 (licensed=0)
    const moreActionsButtons = screen.getAllByRole('button', { name: 'More actions' });
    await user.click(moreActionsButtons[1]!);

    expect(screen.getByRole('button', { name: 'Authorise' })).toBeInTheDocument();
  });

  // ─── Modal content differs by current state ───────────────────────────────

  it('opens the Unauthorise modal for an authorised display', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    // Click "Unauthorise" for Display 1 (licensed=1)
    await openDropdownAndClick(user, 0, 'Unauthorise');

    // Heading and body text for the unauthorise state
    expect(screen.getByRole('heading', { name: 'Unauthorise Display' })).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to de-authorise this Display?'),
    ).toBeInTheDocument();
  });

  it('opens the Authorise modal for an unauthorised display', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 2')).toBeInTheDocument());

    // Click "Authorise" for Display 2 (licensed=0)
    await openDropdownAndClick(user, 1, 'Authorise');

    // Heading and body text for the authorise state
    expect(screen.getByRole('heading', { name: 'Authorise Display' })).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to authorise this Display?'),
    ).toBeInTheDocument();
  });

  // ─── API call on confirmation ─────────────────────────────────────────────

  it('calls toggleDisplayAuthorised with the correct displayId when confirming unauthorise', async () => {
    const user = userEvent.setup();
    vi.mocked(toggleDisplayAuthorised).mockResolvedValue(mockDisplays[0]!);

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await openDropdownAndClick(user, 0, 'Unauthorise');
    await user.click(screen.getByRole('button', { name: 'Yes, Unauthorise' }));

    await waitFor(() => {
      expect(toggleDisplayAuthorised).toHaveBeenCalledWith(1);
    });
  });

  it('calls toggleDisplayAuthorised with the correct displayId when confirming authorise', async () => {
    const user = userEvent.setup();
    vi.mocked(toggleDisplayAuthorised).mockResolvedValue(mockDisplays[0]!);

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 2')).toBeInTheDocument());

    await openDropdownAndClick(user, 1, 'Authorise');
    await user.click(screen.getByRole('button', { name: 'Yes, Authorise' }));

    await waitFor(() => {
      expect(toggleDisplayAuthorised).toHaveBeenCalledWith(2);
    });
  });

  // ─── Modal close behaviour ────────────────────────────────────────────────

  it('closes the modal after successful confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(toggleDisplayAuthorised).mockResolvedValue(mockDisplays[0]!);

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await openDropdownAndClick(user, 0, 'Unauthorise');
    await user.click(screen.getByRole('button', { name: 'Yes, Unauthorise' }));

    await waitFor(() => {
      expect(toggleDisplayAuthorised).toHaveBeenCalledWith(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes the modal when Cancel is clicked without confirming', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await openDropdownAndClick(user, 0, 'Unauthorise');
    expect(screen.getByRole('heading', { name: 'Unauthorise Display' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // API must never have been called
    expect(toggleDisplayAuthorised).not.toHaveBeenCalled();
  });
});
