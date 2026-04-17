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

import type { Dispatch, SetStateAction } from 'react';

import CopyEventModal from './CopyEventModal';
import DeleteEventModal from './DeleteEventModal';

import type { Event } from '@/types/event';

interface EventModalsProps {
  actions: {
    activeModal: string | null;
    closeModal: () => void;
    handleRefresh: () => void;
    deleteError: string | null;
    isDeleting: boolean;
    isCloning: boolean;
  };
  selection: {
    selectedEvent: Event | null;
    selectedEventId: number | null;
    itemsToDelete: Event[];
    existingNames: string[];
    shareEntityIds: number | number[] | null;
    setShareEntityIds: Dispatch<SetStateAction<number | number[] | null>>;
  };
  handlers: {
    confirmDelete: (items: Event[]) => void;
    handleConfirmClone: (name: string) => void;
  };
}

export function EventModals({ actions, selection, handlers }: EventModalsProps) {
  const isModalOpen = (name: string) => actions.activeModal === name;

  return (
    <>
      {isModalOpen('delete') && (
        <DeleteEventModal
          onClose={actions.closeModal}
          onDelete={() => handlers.confirmDelete(selection.itemsToDelete)}
          itemCount={selection.itemsToDelete.length}
          eventName={
            selection.itemsToDelete.length === 1
              ? (selection.itemsToDelete[0]?.name ?? undefined)
              : undefined
          }
          error={actions.deleteError}
          isLoading={actions.isDeleting}
        />
      )}

      {isModalOpen('copy') && (
        <CopyEventModal
          onClose={actions.closeModal}
          onConfirm={(name) => handlers.handleConfirmClone(name)}
          event={selection.selectedEvent}
          isLoading={actions.isCloning}
          existingNames={selection.existingNames}
        />
      )}
    </>
  );
}
