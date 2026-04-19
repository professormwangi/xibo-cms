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

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import type React from 'react';
import { test, vi, beforeEach, describe, expect } from 'vitest';

import { mockEditMedia, mockMediaData, openEditModal, renderMediaPage } from './mediaTestUtils';

import { updateMedia } from '@/services/mediaApi';
import { testQueryClient } from '@/setupTests';

// -----------------------------------------------------------------------------
// Module mocks
// -----------------------------------------------------------------------------

vi.mock('@/pages/Library/Media/hooks/useMediaFilterOptions', () => ({
  useMediaFilterOptions: vi.fn().mockReturnValue({ filterOptions: [], isLoading: false }),
}));
vi.mock('../hooks/useMediaData');
vi.mock('@/components/ui/modals/Modal');
vi.mock('@/services/mediaApi', () => ({
  uploadMedia: vi.fn(),
  uploadMediaFromUrl: vi.fn(),
  updateMedia: vi.fn(),
  uploadThumbnail: vi.fn(),
  deleteMedia: vi.fn(),
}));
vi.mock('@/services/folderApi', () => ({
  fetchFolderById: vi.fn().mockResolvedValue({ id: 1, text: 'Root' }),
  fetchFolderTree: vi.fn().mockResolvedValue([]),
  searchFolders: vi.fn().mockResolvedValue([]),
  fetchContextButtons: vi.fn().mockResolvedValue({ create: true }),
  selectFolder: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { changeLanguage: vi.fn() } }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/services/userApi', () => ({
  fetchUserPreference: vi.fn().mockResolvedValue(null),
  saveUserPreference: vi.fn().mockResolvedValue(undefined),
  fetchUsers: vi.fn().mockResolvedValue([]),
}));

// =============================================================================
// Tests
// =============================================================================

describe('Edit Media — form state', () => {
  beforeEach(() => {
    testQueryClient.clear();
    vi.clearAllMocks();
    vi.mocked(updateMedia).mockResolvedValue({ ...mockEditMedia });
    mockMediaData({
      data: { rows: [mockEditMedia], totalCount: 1 },
      isFetching: false,
      isError: false,
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // Edit the name field, click Cancel, then reopen the modal.
  // The name should be back to the original — Cancel must throw away any
  // changes the user made, not keep them for the next time the modal opens.
  // ---------------------------------------------------------------------------
  test('Cancel after editing discards changes — modal reopens with original values', async () => {
    renderMediaPage();
    await openEditModal();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'changed-name.png' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    const dialog = await openEditModal();
    expect(within(dialog).getByLabelText('Name')).toHaveValue(mockEditMedia.name);
  });

  // ---------------------------------------------------------------------------
  // Press Escape while the modal is open and check it closes.
  // This is the keyboard equivalent of clicking Cancel.
  // ---------------------------------------------------------------------------
  test('Pressing Escape closes the modal', async () => {
    renderMediaPage();
    const dialog = await openEditModal();

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Edit Media' })).not.toBeInTheDocument();
  });
});

describe('Edit Media — save behaviour', () => {
  beforeEach(() => {
    testQueryClient.clear();
    vi.clearAllMocks();
    vi.mocked(updateMedia).mockResolvedValue({ ...mockEditMedia });
    mockMediaData({
      data: { rows: [mockEditMedia], totalCount: 1 },
      isFetching: false,
      isError: false,
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // Click Save and check that updateMedia was called with the media id and
  // the form values.
  // ---------------------------------------------------------------------------
  test('Save button calls updateMedia with the correct payload', async () => {
    renderMediaPage();
    await openEditModal();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateMedia).toHaveBeenCalledWith(
        mockEditMedia.mediaId,
        expect.objectContaining({ name: mockEditMedia.name }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Click the up arrow twice to change the duration, then save.
  // Check that updateMedia receives the updated duration in seconds.
  // mockEditMedia.duration = 10, two increments → 12 seconds.
  // ---------------------------------------------------------------------------
  test('Saving after incrementing duration sends the updated seconds in the payload', async () => {
    renderMediaPage();
    const dialog = await openEditModal();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Increase duration' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Increase duration' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateMedia).toHaveBeenCalledWith(
        mockEditMedia.mediaId,
        expect.objectContaining({ duration: 12 }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Open the modal and click Save immediately without changing anything.
  // The save should still go through — the form must not silently skip the
  // API call just because no fields were changed.
  // ---------------------------------------------------------------------------
  test('Save without making changes still calls updateMedia', async () => {
    renderMediaPage();
    await openEditModal();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateMedia).toHaveBeenCalledWith(
        mockEditMedia.mediaId,
        expect.objectContaining({ name: mockEditMedia.name }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // While the save is in progress the Save button should show "Saving…" and
  // be disabled so the user cannot click it a second time.
  //
  // To hold the save in progress we make updateMedia return a promise that
  // never resolves. The component stays in its loading state indefinitely,
  // giving us time to check the button before anything finishes.
  // ---------------------------------------------------------------------------
  test('Save button is disabled while save is in progress', async () => {
    vi.mocked(updateMedia).mockReturnValueOnce(new Promise(() => {}));

    renderMediaPage();
    await openEditModal();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Label changes to "Saving…" and the button becomes disabled
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  // ---------------------------------------------------------------------------
  // After a successful save the modal should close automatically.
  // ---------------------------------------------------------------------------
  test('Modal closes after a successful save', async () => {
    renderMediaPage();
    await openEditModal();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Edit Media' })).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // If the save fails, the modal should stay open so the user can fix the
  // problem and try again.
  // ---------------------------------------------------------------------------
  test('API error on save — modal stays open', async () => {
    vi.mocked(updateMedia).mockRejectedValueOnce(new Error('Server error'));

    renderMediaPage();
    await openEditModal();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Edit Media' })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // The finally block in handleSave always resets isSaving, so the Save button
  // re-enables and its label reverts from "Saving…" back to "Save" after a failure.
  // ---------------------------------------------------------------------------
  test('Save button re-enables after a failed save', async () => {
    vi.mocked(updateMedia).mockRejectedValueOnce(new Error('Network error'));

    renderMediaPage();
    await openEditModal();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
    });
  });
});

describe('Edit Media — form fields', () => {
  beforeEach(() => {
    testQueryClient.clear();
    vi.clearAllMocks();
    vi.mocked(updateMedia).mockResolvedValue({ ...mockEditMedia });
    mockMediaData({
      data: { rows: [mockEditMedia], totalCount: 1 },
      isFetching: false,
      isError: false,
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // Open the modal and check every field shows the media's current values.
  // ---------------------------------------------------------------------------
  test('Modal pre-populates all fields with the selected media current values', async () => {
    renderMediaPage();
    const dialog = await openEditModal();

    expect(within(dialog).getByLabelText('Name')).toHaveValue(mockEditMedia.name);

    // mockEditMedia.duration = 10 seconds, displayed as HH:MM:SS
    expect(within(dialog).getByPlaceholderText('00:00:00')).toHaveValue('00:00:10');

    // The existing tag from mockEditMedia.tags should appear as a pill
    expect(within(dialog).getByText('nature')).toBeInTheDocument();

    // mockEditMedia.retired = false, so the checkbox should be unchecked
    expect(within(dialog).getByRole('checkbox', { name: /Retire this media/i })).not.toBeChecked();

    // mockEditMedia.updateInLayouts = false, so the checkbox should be unchecked
    expect(
      within(dialog).getByRole('checkbox', { name: /all layouts it is assigned to/i }),
    ).not.toBeChecked();
  });

  // ---------------------------------------------------------------------------
  // DurationInput — up arrow increments by 1 second.
  // mockEditMedia.duration = 10, so 10 → 11 = '00:00:11'.
  // ---------------------------------------------------------------------------
  test('DurationInput up arrow increments the value by 1 second', async () => {
    renderMediaPage();
    const dialog = await openEditModal();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Increase duration' }));

    expect(within(dialog).getByPlaceholderText('00:00:00')).toHaveValue('00:00:11');
  });

  // ---------------------------------------------------------------------------
  // DurationInput — down arrow at 0 cannot produce a negative duration.
  // ---------------------------------------------------------------------------
  test('DurationInput down arrow at 0 stays at 0', async () => {
    mockMediaData({
      data: { rows: [{ ...mockEditMedia, duration: 0 }], totalCount: 1 },
      isFetching: false,
      isError: false,
      error: null,
    });

    renderMediaPage();
    const dialog = await openEditModal();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Decrease duration' }));

    expect(within(dialog).getByPlaceholderText('00:00:00')).toHaveValue('00:00:00');
  });

  // ---------------------------------------------------------------------------
  // Name field — editable text input connected to the draft via onChange.
  // The label "Name" is linked to the input via htmlFor="name".
  // ---------------------------------------------------------------------------
  test('Name field is editable and reflects typed input', async () => {
    renderMediaPage();
    await openEditModal();

    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'new-name.png' } });

    expect(nameInput).toHaveValue('new-name.png');
  });

  // ---------------------------------------------------------------------------
  // Tag input — add a new tag in tag|value format.
  //
  // Start with a media item that has no tags. Open the edit modal. Find the tag
  // input box. Type season|summer into it and press Enter. Check that a pill with
  // the text season appears.
  // BUG: pill only shows 'season' — the |value part is stripped from display.
  // Expected: the full 'season|summer' string should appear in the pill.
  // ---------------------------------------------------------------------------
  test.fails('Tag input accepts new tags in tag|value format', async () => {
    mockMediaData({
      data: { rows: [{ ...mockEditMedia, tags: [] }], totalCount: 1 },
      isFetching: false,
      isError: false,
      error: null,
    });

    renderMediaPage();
    await openEditModal();

    const tagInput = screen.getByPlaceholderText('Add tags');
    fireEvent.change(tagInput, { target: { value: 'season|summer' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });

    // Expected: full tag|value string is shown in the pill
    expect(screen.getByText('season|summer')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // BUG: tag typed into the input but not committed with Enter is silently
  // dropped on save. Expected: the uncommitted input value should be included
  // in the saved payload.
  // ---------------------------------------------------------------------------
  test.fails('Tag typed without pressing Enter is included when form is saved', async () => {
    mockMediaData({
      data: { rows: [{ ...mockEditMedia, tags: [] }], totalCount: 1 },
      isFetching: false,
      isError: false,
      error: null,
    });

    renderMediaPage();
    await openEditModal();

    const tagInput = screen.getByPlaceholderText('Add tags');
    fireEvent.change(tagInput, { target: { value: 'season|summer' } });
    // No Enter pressed — tag is still in the input field, not yet a pill

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateMedia).toHaveBeenCalledWith(
        mockEditMedia.mediaId,
        expect.objectContaining({ tags: expect.stringContaining('season') }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Tags whose name starts with "Tag" should display with the original
  // capitalisation.
  // ---------------------------------------------------------------------------
  test('Tag name starting with "Tag" is displayed with correct capitalisation', async () => {
    mockMediaData({
      data: { rows: [{ ...mockEditMedia, tags: [] }], totalCount: 1 },
      isFetching: false,
      isError: false,
      error: null,
    });

    renderMediaPage();
    const dialog = await openEditModal();

    const tagInput = screen.getByPlaceholderText('Add tags');
    fireEvent.change(tagInput, { target: { value: 'Tag|value' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });

    // Expected: pill shows 'Tag', not 'TAg'
    expect(within(dialog).getByText('Tag')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // BUG: tags with Season|summer only saves Season.
  // ---------------------------------------------------------------------------
  test('Tag name preserves original capitalisation when added', async () => {
    mockMediaData({
      data: { rows: [{ ...mockEditMedia, tags: [] }], totalCount: 1 },
      isFetching: false,
      isError: false,
      error: null,
    });

    renderMediaPage();
    const dialog = await openEditModal();

    const tagInput = screen.getByPlaceholderText('Add tags');
    fireEvent.change(tagInput, { target: { value: 'Season|summer' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });

    // Expected: pill shows 'Season', not 'season'
    expect(within(dialog).getByText('Season')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Tag input — remove an existing tag.
  //
  // Each tag pill renders a small X button. We scope the query to the pill
  // element with within() to find the remove button unambiguously.
  // ---------------------------------------------------------------------------
  test('Tag input allows removing an existing tag', async () => {
    renderMediaPage();
    const dialog = await openEditModal();

    // 'nature' also appears as a tag badge in the table row behind the modal,
    // so scope all queries to the dialog to avoid ambiguity.
    expect(within(dialog).getByText('nature')).toBeInTheDocument();

    // Find the tag pill span inside the dialog and click its remove button
    const tagPill = within(dialog).getByText('nature').closest('span')!;
    fireEvent.click(within(tagPill).getByRole('button'));

    expect(within(dialog).queryByText('nature')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Orientation dropdown — SelectDropdown.
  //
  // The toggle is a <div onClick>, not a <button>. Clicking the visible label
  // text ("Landscape") opens the dropdown. The option buttons are rendered in
  // CSS-hidden list (opacity-0), so getAllByText returns [toggleSpan, optionBtn]
  // — we click index [0] (the toggle span) to open.
  // ---------------------------------------------------------------------------
  test('Orientation dropdown changes between portrait and landscape', async () => {
    renderMediaPage();
    await openEditModal();

    // Click the toggle span showing the current value
    fireEvent.click(screen.getAllByText('Landscape')[0]!);

    // Portrait option button appears in the open dropdown
    const portraitBtn = await screen.findByRole('button', { name: 'Portrait' });
    fireEvent.click(portraitBtn);

    // Toggle now shows "Portrait"
    expect(screen.getAllByText('Portrait')[0]).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Duration input — DurationInput formats seconds as HH:MM:SS.
  //
  // mockEditMedia.duration = 10 → pre-filled as "00:00:10".
  // Find the duration input. Type 00:00:30 into it and move focus away.
  // Check that the input shows 00:00:30
  // ---------------------------------------------------------------------------
  test('Duration input accepts a numeric value', async () => {
    renderMediaPage();
    await openEditModal();

    const durationInput = screen.getByPlaceholderText('00:00:00');
    fireEvent.change(durationInput, { target: { value: '00:00:30' } });
    fireEvent.blur(durationInput);

    expect(durationInput).toHaveValue('00:00:30');
  });

  // ---------------------------------------------------------------------------
  // Expiry date dropdown — shows all preset option buttons when opened.
  // ---------------------------------------------------------------------------
  test('Expiry date dropdown shows all preset options', async () => {
    renderMediaPage();
    await openEditModal();

    // Click the toggle div — the visible text "Never Expire" is inside a span
    // that bubbles the click up to its parent div's onClick handler
    fireEvent.click(screen.getByText('Never Expire'));

    expect(await screen.findByRole('button', { name: 'Never Expire' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End of Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In 7 Days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In 14 Days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In 30 Days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose Date' })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Selecting a preset expiry option updates the toggle display.
  // ---------------------------------------------------------------------------
  test('Selecting a preset expiry option updates the displayed value', async () => {
    renderMediaPage();
    await openEditModal();

    fireEvent.click(screen.getByText('Never Expire'));
    fireEvent.click(await screen.findByRole('button', { name: 'In 7 Days' }));

    // Toggle area now shows the selected preset
    expect(screen.getByText('In 7 Days')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Enable Stats dropdown.
  //
  // mockEditMedia.enableStat = 'Inherit' (capital I from API) does not match
  // the option value 'inherit' (lowercase), so selectedLabel is empty and the
  // placeholder "Inherit" is shown. getAllByText handles the hidden option
  // button — index [0] is the visible toggle span.
  // ---------------------------------------------------------------------------
  test('Enable Stats dropdown changes between Inherit / On / Off', async () => {
    renderMediaPage();
    await openEditModal();

    // Click the toggle showing "Inherit" placeholder
    fireEvent.click(screen.getAllByText('Inherit')[0]!);

    // Click "On" from the dropdown options
    fireEvent.click(await screen.findByRole('button', { name: 'On' }));

    // Toggle now reflects "On"
    expect(screen.getAllByText('On')[0]).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Retired checkbox — toggling updates the draft.retired boolean.
  //
  // Find the Retired checkbox — it starts unchecked.
  // Click it and check it is now checked.
  // Click it again and check it is unchecked.
  // ---------------------------------------------------------------------------
  test('Retired checkbox toggles on and off', async () => {
    renderMediaPage();
    await openEditModal();

    const retiredCheckbox = screen.getByRole('checkbox', {
      name: /Retire this media/i,
    });
    expect(retiredCheckbox).not.toBeChecked();

    fireEvent.click(retiredCheckbox);
    expect(retiredCheckbox).toBeChecked();

    fireEvent.click(retiredCheckbox);
    expect(retiredCheckbox).not.toBeChecked();
  });

  // ---------------------------------------------------------------------------
  // Update in Layouts checkbox — accessible name from <label htmlFor="update">:
  // Find the Update in Layouts checkbox — it starts unchecked. Click it and
  // check it is now checked. Click it again and check it is unchecked.
  // ---------------------------------------------------------------------------
  test('Update in Layouts checkbox toggles on and off', async () => {
    renderMediaPage();
    await openEditModal();

    const updateCheckbox = screen.getByRole('checkbox', { name: /all layouts it is assigned to/i });
    expect(updateCheckbox).not.toBeChecked();

    fireEvent.click(updateCheckbox);
    expect(updateCheckbox).toBeChecked();

    fireEvent.click(updateCheckbox);
    expect(updateCheckbox).not.toBeChecked();
  });

  // ---------------------------------------------------------------------------
  // BUG: clearing the name field and clicking Save still calls updateMedia.
  // Expected: the form should block submission client-side when the name is
  // empty — either by disabling the Save button or showing an inline error.
  // ---------------------------------------------------------------------------
  test('Save with name cleared — no client-side validation prevents submission', async () => {
    renderMediaPage();
    await openEditModal();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(updateMedia).not.toHaveBeenCalled();
  });
});
