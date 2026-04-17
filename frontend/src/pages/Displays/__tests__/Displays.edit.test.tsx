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

import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import Displays from '../Displays/Displays';

import { mockDisplays, renderWithClient } from './Setup';

import { fetchDisplays, updateDisplay } from '@/services/displaysApi';

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
    actions?: Array<{
      label: string;
      onClick?: () => void;
      isSubmit?: boolean;
      formId?: string;
      disabled?: boolean;
    }>;
    onClose: () => void;
  }) => {
    if (!isOpen) return null;
    return (
      <div role="dialog" aria-label={title}>
        {title && <h2>{title}</h2>}
        {children}
        <div>
          {actions?.map((action, i) =>
            action.isSubmit ? (
              <button key={i} type="submit" form={action.formId} disabled={action.disabled}>
                {action.label}
              </button>
            ) : (
              <button key={i} onClick={action.onClick} disabled={action.disabled}>
                {action.label}
              </button>
            ),
          )}
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

// The Edit quick-action button has title="Edit" and renders an icon with no text content.
// Use getAllByTitle to select only the title-based quick-action buttons (not the dropdown mocks).
async function clickEditQuickAction(user: ReturnType<typeof userEvent.setup>, rowIndex: number) {
  const editButtons = screen.getAllByTitle('Edit');
  await user.click(editButtons[rowIndex]!);
}

describe('Displays Page - Edit (Update)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDisplays).mockResolvedValue({
      rows: mockDisplays,
      totalCount: 2,
    });
  });

  it('opens the Edit modal when clicking the Edit quick-action button on a row', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await clickEditQuickAction(user, 0);

    // Modal title is: `${t('Edit')} "${data.display}"` → 'Edit "Display 1"'
    await waitFor(() => {
      expect(screen.getByText('Edit "Display 1"')).toBeInTheDocument();
    });
  });

  it('pre-populates the Edit modal with the current display name', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await clickEditQuickAction(user, 0);

    // The form field label is t('Display') → 'Display'
    await waitFor(() => {
      const nameInput = screen.getByLabelText('Display');
      expect(nameInput).toHaveValue('Display 1');
    });
  });

  it('pre-populates the correct data when editing the second row', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 2')).toBeInTheDocument());

    await clickEditQuickAction(user, 1);

    await waitFor(() => {
      const nameInput = screen.getByLabelText('Display');
      expect(nameInput).toHaveValue('Display 2');
    });
  });

  it('calls updateDisplay with the correct displayId and updated name on save', async () => {
    const user = userEvent.setup();
    vi.mocked(updateDisplay).mockResolvedValue({
      ...mockDisplays[0]!,
      display: 'Display 1 Updated',
    });

    renderWithClient(<Displays />);
    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await clickEditQuickAction(user, 0);

    await waitFor(() => screen.getByLabelText('Display'));

    const nameInput = screen.getByLabelText('Display');
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

    await clickEditQuickAction(user, 0);
    await waitFor(() => screen.getByRole('button', { name: 'Save' }));

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

    await clickEditQuickAction(user, 0);
    await waitFor(() => screen.getByRole('button', { name: 'Save' }));

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      // API was called
      expect(updateDisplay).toHaveBeenCalledWith(1, expect.any(Object));

      // Modal must still be open
      expect(screen.getByText('Edit "Display 1"')).toBeInTheDocument();

      // Error message must be displayed
      expect(screen.getByText('Display name already in use.')).toBeInTheDocument();
    });
  });

  it('closes the Edit modal when Cancel is clicked without saving', async () => {
    const user = userEvent.setup();
    renderWithClient(<Displays />);

    await waitFor(() => expect(screen.getByText('Display 1')).toBeInTheDocument());

    await clickEditQuickAction(user, 0);
    await waitFor(() => screen.getByText('Edit "Display 1"'));

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // API was never called
    expect(updateDisplay).not.toHaveBeenCalled();
  });
});
