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

// =============================================================================
// Media.folders.test.tsx
//
// Tests for PR #3287 "Changes to folders":
//   - filterMediaByPermission  — pure utility (no rendering required)
//   - getMediaItemActions      — per-item row-action visibility (no rendering required)
//   - FolderSidebar / FolderBreadcrumb rendered only when folder.view is set
//   - Bulk Move button hidden when the user lacks folder.view
//   - Bulk Delete / Share filter items by per-item userPermissions
// =============================================================================

import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { TFunction } from 'i18next';
import type React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi, beforeEach, describe, test, expect } from 'vitest';

import Media from '../Media';
import { filterMediaByPermission, getMediaItemActions } from '../MediaConfig';

import { mockMediaData } from './mediaTestUtils';

import { notify } from '@/components/ui/Notification';
import { UploadProvider } from '@/context/UploadContext';
import { UserProvider } from '@/context/UserContext';
import { testQueryClient } from '@/setupTests';
import type { Media as MediaItem } from '@/types/media';
import type { User, UserFeatures } from '@/types/user';

// =============================================================================
// Module mocks
//
// vi.mock() is hoisted by Vitest — these run before any imports, which is why
// they can swap out dependencies before the component code loads them.
//
//   Notification    — capture notify.warning / notify.info calls without
//                     actually triggering toast UI.
//
//   FolderSidebar   — the real component fetches folder data. Replace with a
//                     plain sentinel so tests can check presence/absence.
//
//   FolderBreadCrumb — same reason as FolderSidebar.
//
//   Modal           — the real modal uses a React portal (renders outside the
//                     normal DOM tree). The fake renders a plain <div role="dialog">
//                     that screen.findByRole can locate.
//
//   folderApi       — prevents live network calls for folder tree / context buttons.
//
//   userApi         — Media page persists column preferences to the server.
//                     Return null so each test starts with default preferences.
//
//   mediaApi        — prevents live uploads / downloads.
//
//   useMediaData    — the data-fetching hook. Replaced with a vi.fn() so each
//                     test can inject exactly the data state it needs.
//
//   useMediaFilterOptions — prevents network calls for filter dropdown population.
//
//   useDebounce     — the real hook delays input. The fake returns immediately,
//                     keeping tests fast and deterministic.
// =============================================================================

vi.mock('@/components/ui/Notification', () => ({
  notify: {
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/ui/FolderSidebar', () => ({
  default: () => <div data-testid="folder-sidebar" />,
}));

vi.mock('@/components/ui/FolderBreadCrumb', () => ({
  default: () => <div data-testid="folder-breadcrumb" />,
}));

vi.mock('@/components/ui/modals/Modal', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ isOpen, title, children, actions }: any) => {
    if (!isOpen) return null;
    return (
      <div role="dialog" aria-label={title}>
        <h1>{title}</h1>
        {children}
        <div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {actions?.map((action: any, i: number) => (
            <button key={i} onClick={action.onClick} disabled={action.disabled}>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    );
  },
}));

vi.mock('@/services/folderApi', () => ({
  fetchFolderById: vi.fn().mockResolvedValue({ id: 1, text: 'Root' }),
  fetchFolderTree: vi.fn().mockResolvedValue([]),
  searchFolders: vi.fn().mockResolvedValue([]),
  fetchContextButtons: vi.fn().mockResolvedValue({ create: true }),
  selectFolder: vi.fn(),
}));

vi.mock('@/services/userApi', () => ({
  fetchUserPreference: vi.fn().mockResolvedValue(null),
  saveUserPreference: vi.fn().mockResolvedValue(undefined),
  fetchUsers: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/mediaApi', () => ({
  uploadMedia: vi.fn().mockReturnValue(new Promise(() => {})),
  uploadMediaFromUrl: vi.fn().mockReturnValue(new Promise(() => {})),
  updateMedia: vi.fn().mockReturnValue(new Promise(() => {})),
  uploadThumbnail: vi.fn().mockReturnValue(new Promise(() => {})),
  deleteMedia: vi.fn().mockResolvedValue(undefined),
  downloadMedia: vi.fn().mockResolvedValue(undefined),
  downloadMediaAsZip: vi.fn().mockResolvedValue(undefined),
  fetchMedia: vi.fn().mockResolvedValue({ rows: [], totalCount: 0 }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { changeLanguage: vi.fn() } }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../hooks/useMediaData', () => ({
  useMediaData: vi.fn(),
}));

vi.mock('@/pages/Library/Media/hooks/useMediaFilterOptions', () => ({
  useMediaFilterOptions: vi.fn().mockReturnValue({ filterOptions: [], isLoading: false }),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: unknown) => value,
}));

// =============================================================================
// Shared fixtures
// =============================================================================

// Passthrough translation function for pure-function tests.
const t = ((key: string) => key) as unknown as TFunction;

// User WITH folder.view — FolderSidebar and FolderBreadcrumb should render,
// and the bulk Move action should be present.
const mockUserWithFolders: User = {
  userId: 1,
  userName: 'FolderUser',
  userTypeId: 1,
  homeFolderId: 1,
  features: { 'folder.view': true } as UserFeatures,
} as User;

// User WITHOUT folder.view — folder UI and bulk Move should be absent.
const mockUserNoFolders: User = {
  userId: 2,
  userName: 'NoFolderUser',
  userTypeId: 1,
  homeFolderId: 1,
  features: {} as UserFeatures,
} as User;

// Media item where the current user has full permissions.
const itemAllPerms: Partial<MediaItem> = {
  mediaId: 1,
  name: 'all-perms.jpg',
  mediaType: 'image',
  userPermissions: { view: 1, edit: 1, delete: 1, modifyPermissions: 1 },
};

// Media item where the current user has NO write/share/delete permissions.
const itemNoPerms: Partial<MediaItem> = {
  mediaId: 2,
  name: 'no-perms.jpg',
  mediaType: 'image',
  userPermissions: { view: 1, edit: 0, delete: 0, modifyPermissions: 0 },
};

// ---------------------------------------------------------------------------
// Render helper — wraps <Media /> in all required context providers.
// Accepts a User so tests can exercise different permission configurations.
// ---------------------------------------------------------------------------
const renderAs = (user: User) =>
  render(
    <QueryClientProvider client={testQueryClient}>
      <UploadProvider>
        <UserProvider initialUser={user}>
          <MemoryRouter>
            <Media />
          </MemoryRouter>
        </UserProvider>
      </UploadProvider>
    </QueryClientProvider>,
  );

// =============================================================================
// 1. filterMediaByPermission — pure function
//
// This utility lives in MediaConfig.tsx. It accepts a list of items, a
// permission-check callback, a translation function, and an action label.
// It returns only the items that pass the check, emitting toasts for skipped
// or fully-blocked scenarios.
// =============================================================================

describe('filterMediaByPermission', () => {
  beforeEach(() => {
    vi.mocked(notify.warning).mockClear();
    vi.mocked(notify.info).mockClear();
  });

  // ---------------------------------------------------------------------------
  // Happy path: every item passes → return all, no toasts.
  // ---------------------------------------------------------------------------
  test('returns all items and shows no toasts when every item has permission', () => {
    const items = [
      { id: 1, userPermissions: { delete: 1 } },
      { id: 2, userPermissions: { delete: 1 } },
    ];

    const result = filterMediaByPermission(
      items,
      (item) => item.userPermissions.delete,
      t,
      'delete',
    );

    expect(result).toHaveLength(2);
    expect(notify.warning).not.toHaveBeenCalled();
    expect(notify.info).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Partial permission: some items pass, some don't.
  // Permitted items are returned; an info toast shows the skipped count.
  // ---------------------------------------------------------------------------
  test('returns only permitted items and shows an info toast for skipped items', () => {
    const items = [
      { id: 1, userPermissions: { delete: 1 } }, // permitted
      { id: 2, userPermissions: { delete: 0 } }, // skipped
      { id: 3, userPermissions: { delete: 0 } }, // skipped
    ];

    const result = filterMediaByPermission(
      items,
      (item) => item.userPermissions.delete,
      t,
      'delete',
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(items[0]);
    expect(notify.info).toHaveBeenCalledOnce();
    expect(notify.warning).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // No permission at all → warning toast, empty array returned.
  // ---------------------------------------------------------------------------
  test('shows a warning toast and returns an empty array when no items have permission', () => {
    const items = [
      { id: 1, userPermissions: { delete: 0 } },
      { id: 2, userPermissions: { delete: 0 } },
    ];

    const result = filterMediaByPermission(
      items,
      (item) => item.userPermissions.delete,
      t,
      'delete',
    );

    expect(result).toHaveLength(0);
    expect(notify.warning).toHaveBeenCalledOnce();
    expect(notify.info).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Single permitted item → returns it, no toasts.
  // ---------------------------------------------------------------------------
  test('handles a single permitted item correctly (no toasts)', () => {
    const items = [{ id: 1, userPermissions: { delete: 1 } }];

    const result = filterMediaByPermission(
      items,
      (item) => item.userPermissions.delete,
      t,
      'delete',
    );

    expect(result).toHaveLength(1);
    expect(notify.warning).not.toHaveBeenCalled();
    expect(notify.info).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // modifyPermissions check — verifies the function works for share actions.
  // ---------------------------------------------------------------------------
  test('filters correctly when checking modifyPermissions (share action)', () => {
    const items = [
      { id: 1, userPermissions: { modifyPermissions: 1 } },
      { id: 2, userPermissions: { modifyPermissions: 0 } },
    ];

    const result = filterMediaByPermission(
      items,
      (item) => item.userPermissions.modifyPermissions,
      t,
      'share',
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(items[0]);
    expect(notify.info).toHaveBeenCalledOnce();
  });
});

// =============================================================================
// 2. getMediaItemActions — per-item row-action visibility
//
// Returns a function `(media: Media) => ActionItem[]`.
// Edit, Replace File, Move, Delete, and Share are all conditional based on
// the item's userPermissions and whether the optional callback props are set.
// Download is always present.
// =============================================================================

describe('getMediaItemActions', () => {
  // Minimal required props shared across all sub-tests.
  const baseProps = {
    t,
    onDelete: vi.fn(),
    onDownload: vi.fn(),
    openEditModal: vi.fn(),
    openReplaceModal: vi.fn(),
  };

  // Build the action factory, merging in any prop overrides.
  const makeActionsFor = (item: Partial<MediaItem>, overrides = {}) =>
    getMediaItemActions({ ...baseProps, ...overrides })(item as MediaItem);

  // Extract non-separator action labels for easy assertions.
  const labels = (actions: ReturnType<typeof makeActionsFor>) =>
    actions.filter((a) => !a.isSeparator && a.label).map((a) => a.label as string);

  // ---------------------------------------------------------------------------
  // Edit / Replace File — gated by userPermissions.edit
  // ---------------------------------------------------------------------------
  test('includes Edit and Replace File when item has edit permission', () => {
    const result = labels(makeActionsFor(itemAllPerms));
    expect(result).toContain('Edit');
    expect(result).toContain('Replace File');
  });

  test('excludes Edit and Replace File when item lacks edit permission', () => {
    const result = labels(makeActionsFor(itemNoPerms));
    expect(result).not.toContain('Edit');
    expect(result).not.toContain('Replace File');
  });

  // ---------------------------------------------------------------------------
  // Delete — gated by userPermissions.delete
  // ---------------------------------------------------------------------------
  test('includes Delete when item has delete permission', () => {
    expect(labels(makeActionsFor(itemAllPerms))).toContain('Delete');
  });

  test('excludes Delete when item lacks delete permission', () => {
    expect(labels(makeActionsFor(itemNoPerms))).not.toContain('Delete');
  });

  // ---------------------------------------------------------------------------
  // Move — gated by both userPermissions.edit AND openMoveModal being provided.
  // openMoveModal is set to undefined when canViewFolders is false (PR #3287).
  // ---------------------------------------------------------------------------
  test('includes Move when item has edit permission and openMoveModal is provided', () => {
    const result = labels(makeActionsFor(itemAllPerms, { openMoveModal: vi.fn() }));
    expect(result).toContain('Move');
  });

  test('excludes Move when openMoveModal is not provided (canViewFolders is false)', () => {
    // openMoveModal: undefined is the signal that folder navigation is disabled
    const result = labels(makeActionsFor(itemAllPerms, { openMoveModal: undefined }));
    expect(result).not.toContain('Move');
  });

  test('excludes Move when item lacks edit permission even if openMoveModal is provided', () => {
    const result = labels(makeActionsFor(itemNoPerms, { openMoveModal: vi.fn() }));
    expect(result).not.toContain('Move');
  });

  // ---------------------------------------------------------------------------
  // Share — gated by userPermissions.modifyPermissions AND openShareModal
  // ---------------------------------------------------------------------------
  test('includes Share when item has modifyPermissions and openShareModal is provided', () => {
    const result = labels(makeActionsFor(itemAllPerms, { openShareModal: vi.fn() }));
    expect(result).toContain('Share');
  });

  test('excludes Share when item lacks modifyPermissions', () => {
    const result = labels(makeActionsFor(itemNoPerms, { openShareModal: vi.fn() }));
    expect(result).not.toContain('Share');
  });

  test('excludes Share when openShareModal is not provided', () => {
    const result = labels(makeActionsFor(itemAllPerms, { openShareModal: undefined }));
    expect(result).not.toContain('Share');
  });

  // ---------------------------------------------------------------------------
  // Download — always present regardless of permissions
  // ---------------------------------------------------------------------------
  test('always includes Download regardless of item permissions', () => {
    expect(labels(makeActionsFor(itemNoPerms))).toContain('Download');
    expect(labels(makeActionsFor(itemAllPerms))).toContain('Download');
  });
});

// =============================================================================
// 3. Media page — FolderSidebar / FolderBreadcrumb visibility
//
// Both components are wrapped in `{canViewFolders && <Component />}` in
// Media.tsx. The canViewFolders flag comes from usePermissions(), which reads
// user.features['folder.view']. We render with two different users to verify
// the conditional rendering.
// =============================================================================

describe('Media page — folder sidebar visibility', () => {
  beforeEach(() => {
    testQueryClient.clear();
    vi.clearAllMocks();
    mockMediaData({
      data: { rows: [], totalCount: 0 },
      isFetching: false,
      isError: false,
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // With folder.view → both FolderSidebar and FolderBreadcrumb mount.
  // We check for FolderBreadcrumb because it is always in the DOM (the sidebar
  // needs a toggle button to appear). FolderSidebar renders conditionally on
  // a toggle, but its mount is gated by canViewFolders.
  // ---------------------------------------------------------------------------
  test('renders FolderBreadcrumb when the user has the folder.view feature', async () => {
    renderAs(mockUserWithFolders);
    expect(await screen.findByTestId('folder-breadcrumb')).toBeInTheDocument();
  });

  test('renders FolderSidebar in the DOM when the user has the folder.view feature', async () => {
    renderAs(mockUserWithFolders);
    // findByTestId waits for the component to mount (async state settling)
    expect(await screen.findByTestId('folder-sidebar')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Without folder.view → neither component should appear in the DOM.
  // We use findBy to wait for the page to settle before asserting absence.
  // ---------------------------------------------------------------------------
  test('does not render FolderBreadcrumb when the user lacks folder.view', async () => {
    renderAs(mockUserNoFolders);
    // Wait for the page to fully settle (Add Media button confirms render complete)
    await screen.findByRole('button', { name: 'Add Media' });
    expect(screen.queryByTestId('folder-breadcrumb')).not.toBeInTheDocument();
  });

  test('does not render FolderSidebar when the user lacks folder.view', async () => {
    renderAs(mockUserNoFolders);
    await screen.findByRole('button', { name: 'Add Media' });
    expect(screen.queryByTestId('folder-sidebar')).not.toBeInTheDocument();
  });
});

// =============================================================================
// 4. Media page — bulk Move button visibility
//
// getBulkActions() receives `onMove: canViewFolders ? handler : undefined`.
// DataTableBulkActions skips rendering any action whose onClick is undefined.
// The bulk bar only appears when at least one row is selected.
// =============================================================================

describe('Media page — bulk Move button visibility', () => {
  // Two items that both have full permissions — ensures checkboxes and all
  // bulk actions would appear when Move is enabled.
  const twoItems = [
    {
      mediaId: 1,
      name: 'Item A',
      mediaType: 'image',
      userPermissions: { view: 1, edit: 1, delete: 1, modifyPermissions: 1 },
    },
    {
      mediaId: 2,
      name: 'Item B',
      mediaType: 'image',
      userPermissions: { view: 1, edit: 1, delete: 1, modifyPermissions: 1 },
    },
  ];

  beforeEach(() => {
    testQueryClient.clear();
    vi.clearAllMocks();
    mockMediaData({
      data: { rows: twoItems, totalCount: 2 },
      isFetching: false,
      isError: false,
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // With folder.view: selecting a row should reveal a bulk Move button.
  // DataTableBulkActions renders buttons with `title={action.label}`.
  // ---------------------------------------------------------------------------
  test('bulk Move button is visible after selecting a row when user has folder.view', async () => {
    renderAs(mockUserWithFolders);
    const checkboxes = await screen.findAllByRole('checkbox', { name: /Select row/i });
    fireEvent.click(checkboxes[0]!);
    expect(await screen.findByTitle('Move')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Without folder.view: the Move action is never added to the bulk actions
  // array, so its button must not appear even after selection.
  // We first confirm the bulk bar IS showing (Delete Selected must be present)
  // before asserting Move's absence.
  // ---------------------------------------------------------------------------
  test('bulk Move button is absent after selecting a row when user lacks folder.view', async () => {
    renderAs(mockUserNoFolders);
    const checkboxes = await screen.findAllByRole('checkbox', { name: /Select row/i });
    fireEvent.click(checkboxes[0]!);

    // Wait for the bulk bar to appear (Delete Selected is always present)
    await screen.findByTitle('Delete Selected');
    expect(screen.queryByTitle('Move')).not.toBeInTheDocument();
  });
});

// =============================================================================
// 5. Media page — bulk Delete permission filtering
//
// When the user clicks "Delete Selected", Media.tsx calls filterMediaByPermission
// with (item) => item.userPermissions.delete. Only permitted items proceed to
// the delete confirmation dialog. Skipped items trigger an info toast.
// If no items are permitted, a warning toast fires and no dialog opens.
// =============================================================================

describe('Media page — bulk Delete permission filtering', () => {
  beforeEach(() => {
    testQueryClient.clear();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Mixed permissions: one item can be deleted, one cannot.
  // Expect the dialog to open (for the permitted item) and an info toast.
  // ---------------------------------------------------------------------------
  test('opens delete dialog for permitted item and shows info toast for the skipped item', async () => {
    mockMediaData({
      data: {
        rows: [
          {
            mediaId: 1,
            name: 'allowed.jpg',
            mediaType: 'image',
            userPermissions: { view: 1, edit: 1, delete: 1, modifyPermissions: 0 },
          },
          {
            mediaId: 2,
            name: 'denied.jpg',
            mediaType: 'image',
            userPermissions: { view: 1, edit: 0, delete: 0, modifyPermissions: 0 },
          },
        ],
        totalCount: 2,
      },
      isFetching: false,
      isError: false,
      error: null,
    });

    renderAs(mockUserWithFolders);

    // Select both rows
    const checkboxes = await screen.findAllByRole('checkbox', { name: /Select row/i });
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(checkboxes[1]!);

    // Trigger bulk delete
    fireEvent.click(await screen.findByTitle('Delete Selected'));

    // Delete dialog opens for the one permitted item
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Info toast fires because one item was skipped
    expect(notify.info).toHaveBeenCalledOnce();
    expect(notify.warning).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // No permissions: selecting an item the user cannot delete should show a
  // warning toast and must NOT open the delete dialog.
  // ---------------------------------------------------------------------------
  test('shows warning toast and skips dialog when the selected item has no delete permission', async () => {
    mockMediaData({
      data: {
        rows: [
          {
            mediaId: 1,
            name: 'no-delete.jpg',
            mediaType: 'image',
            userPermissions: { view: 1, edit: 0, delete: 0, modifyPermissions: 0 },
          },
        ],
        totalCount: 1,
      },
      isFetching: false,
      isError: false,
      error: null,
    });

    renderAs(mockUserWithFolders);

    const checkboxes = await screen.findAllByRole('checkbox', { name: /Select row/i });
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(await screen.findByTitle('Delete Selected'));

    await waitFor(() => {
      expect(notify.warning).toHaveBeenCalledOnce();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // All items have delete permission → dialog opens, no toasts.
  // ---------------------------------------------------------------------------
  test('opens delete dialog without any toast when all selected items have delete permission', async () => {
    mockMediaData({
      data: {
        rows: [
          {
            mediaId: 1,
            name: 'can-delete.jpg',
            mediaType: 'image',
            userPermissions: { view: 1, edit: 1, delete: 1, modifyPermissions: 0 },
          },
        ],
        totalCount: 1,
      },
      isFetching: false,
      isError: false,
      error: null,
    });

    renderAs(mockUserWithFolders);

    const checkboxes = await screen.findAllByRole('checkbox', { name: /Select row/i });
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(await screen.findByTitle('Delete Selected'));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(notify.warning).not.toHaveBeenCalled();
    expect(notify.info).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 6. Media page — bulk Share permission filtering
//
// The bulk Share handler (inline in Media.tsx) filters items by
// item.userPermissions.modifyPermissions. If none pass, a warning fires.
// If some pass and some are skipped, an info toast fires.
// =============================================================================

describe('Media page — bulk Share permission filtering', () => {
  beforeEach(() => {
    testQueryClient.clear();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // No modifyPermissions on any selected item → warning toast, no dialog.
  // ---------------------------------------------------------------------------
  test('shows warning toast and skips share dialog when no selected items have modifyPermissions', async () => {
    mockMediaData({
      data: {
        rows: [
          {
            mediaId: 1,
            name: 'no-share.jpg',
            mediaType: 'image',
            userPermissions: { view: 1, edit: 1, delete: 1, modifyPermissions: 0 },
          },
        ],
        totalCount: 1,
      },
      isFetching: false,
      isError: false,
      error: null,
    });

    renderAs(mockUserWithFolders);

    const checkboxes = await screen.findAllByRole('checkbox', { name: /Select row/i });
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(await screen.findByTitle('Share'));

    await waitFor(() => {
      expect(notify.warning).toHaveBeenCalledOnce();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Mixed permissions: one item can be shared, one cannot.
  // Expect the share dialog to open and an info toast for the skipped item.
  // ---------------------------------------------------------------------------
  test('opens share dialog for permitted item and shows info toast for the skipped item', async () => {
    mockMediaData({
      data: {
        rows: [
          {
            mediaId: 1,
            name: 'can-share.jpg',
            mediaType: 'image',
            userPermissions: { view: 1, edit: 1, delete: 1, modifyPermissions: 1 },
          },
          {
            mediaId: 2,
            name: 'no-share.jpg',
            mediaType: 'image',
            userPermissions: { view: 1, edit: 1, delete: 1, modifyPermissions: 0 },
          },
        ],
        totalCount: 2,
      },
      isFetching: false,
      isError: false,
      error: null,
    });

    renderAs(mockUserWithFolders);

    const checkboxes = await screen.findAllByRole('checkbox', { name: /Select row/i });
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(checkboxes[1]!);
    fireEvent.click(await screen.findByTitle('Share'));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(notify.info).toHaveBeenCalledOnce();
    expect(notify.warning).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // All items have modifyPermissions → dialog opens, no toasts.
  // ---------------------------------------------------------------------------
  test('opens share dialog without any toast when all selected items have modifyPermissions', async () => {
    mockMediaData({
      data: {
        rows: [
          {
            mediaId: 1,
            name: 'share-ok.jpg',
            mediaType: 'image',
            userPermissions: { view: 1, edit: 1, delete: 1, modifyPermissions: 1 },
          },
        ],
        totalCount: 1,
      },
      isFetching: false,
      isError: false,
      error: null,
    });

    renderAs(mockUserWithFolders);

    const checkboxes = await screen.findAllByRole('checkbox', { name: /Select row/i });
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(await screen.findByTitle('Share'));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(notify.warning).not.toHaveBeenCalled();
    expect(notify.info).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 7. Media page — bulk Move permission filtering (canViewFolders is true)
//
// When folder.view is set, the bulk Move handler filters items by
// item.userPermissions.edit. Items without edit permission are skipped.
// =============================================================================

describe('Media page — bulk Move permission filtering', () => {
  beforeEach(() => {
    testQueryClient.clear();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Mixed edit permissions: one item can be moved, one cannot.
  // Move dialog opens for the permitted item, info toast fires for the skipped one.
  // ---------------------------------------------------------------------------
  test('opens move dialog for permitted item and shows info toast for the skipped item', async () => {
    mockMediaData({
      data: {
        rows: [
          {
            mediaId: 1,
            name: 'can-move.jpg',
            mediaType: 'image',
            userPermissions: { view: 1, edit: 1, delete: 1, modifyPermissions: 1 },
          },
          {
            mediaId: 2,
            name: 'no-move.jpg',
            mediaType: 'image',
            userPermissions: { view: 1, edit: 0, delete: 0, modifyPermissions: 0 },
          },
        ],
        totalCount: 2,
      },
      isFetching: false,
      isError: false,
      error: null,
    });

    renderAs(mockUserWithFolders);

    const checkboxes = await screen.findAllByRole('checkbox', { name: /Select row/i });
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(checkboxes[1]!);
    fireEvent.click(await screen.findByTitle('Move'));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(notify.info).toHaveBeenCalledOnce();
    expect(notify.warning).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // No edit permissions → warning toast, no dialog.
  // ---------------------------------------------------------------------------
  test('shows warning toast and skips move dialog when no selected items have edit permission', async () => {
    mockMediaData({
      data: {
        rows: [
          {
            mediaId: 1,
            name: 'no-edit.jpg',
            mediaType: 'image',
            userPermissions: { view: 1, edit: 0, delete: 0, modifyPermissions: 0 },
          },
        ],
        totalCount: 1,
      },
      isFetching: false,
      isError: false,
      error: null,
    });

    renderAs(mockUserWithFolders);

    const checkboxes = await screen.findAllByRole('checkbox', { name: /Select row/i });
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(await screen.findByTitle('Move'));

    await waitFor(() => {
      expect(notify.warning).toHaveBeenCalledOnce();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
