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

import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import Displays from '../Displays/Displays';

import { mockDisplays, renderWithClient } from './Setup';

import { deleteDisplay, fetchDisplays } from '@/services/displaysApi';

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
// For actions in every row (e.g. Delete), getAllByRole with rowIndex picks the correct row.
async function openDropdownAndClick(user: ReturnType<typeof userEvent.setup>, rowIndex: number, actionLabel: string) {
  const buttons = screen.getAllByRole('button', { name: actionLabel });
  // If the action appears in every row, buttons[rowIndex] selects the right row.
  // If the action is unique to one row, buttons[0] is the only match — rowIndex fallback handles it.
  await user.click(buttons[rowIndex] ?? buttons[0]!);
}

describe('Displays Page - Delete and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDisplays).mockResolvedValue({
      rows: mockDisplays,
      totalCount: 2,
    });
  });

  it('opens the Delete modal when clicking Delete in the row actions dropdown', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await openDropdownAndClick(user, 0, 'Delete');

    expect(screen.getByRole('heading', { name: 'Delete Display?' })).toBeInTheDocument();
  });

  it('shows the display name in the Delete modal confirmation message', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await openDropdownAndClick(user, 0, 'Delete');

    // The modal message should reference the target display name
    expect(screen.getByRole('dialog')).toHaveTextContent('Display 1');
  });

  it('calls deleteDisplay with the correct displayId on confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteDisplay).mockResolvedValue(undefined);

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await openDropdownAndClick(user, 0, 'Delete');
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

    await openDropdownAndClick(user, 0, 'Delete');
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

    await openDropdownAndClick(user, 0, 'Delete');
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

    await openDropdownAndClick(user, 0, 'Delete');
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

    await openDropdownAndClick(user, 1, 'Delete');
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

    await openDropdownAndClick(user, 0, 'Delete');
    await user.click(screen.getByRole('button', { name: 'Yes, Delete' }));

    await waitFor(() => {
      expect(screen.getByText('Cannot delete display. It is currently in use.')).toBeInTheDocument();
    });

    // Dismiss modal
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Reopen modal — error should be gone
    await openDropdownAndClick(user, 0, 'Delete');
    expect(
      screen.queryByText('Cannot delete display. It is currently in use.'),
    ).not.toBeInTheDocument();
  });
});
