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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import Displays from '../Displays/Displays';

import { UserProvider } from '@/context/UserContext';
import type { Display } from '@/types/display';
import type { User } from '@/types/user';

// ─── Mock user ────────────────────────────────────────────────────────────────

const mockUser: User = {
  userId: 1,
  userName: 'TestUser',
  userTypeId: 1,
  groupId: 1,
  features: {},
  settings: {
    defaultTimezone: 'UTC',
    defaultLanguage: 'en',
    DATE_FORMAT_JS: 'DD/MM/YYYY',
    TIME_FORMAT_JS: 'HH:mm',
  },
};

// ─── Render helper ────────────────────────────────────────────────────────────

// Provide a fresh QueryClient, UserProvider, and Router for each test render
export const renderWithClient = (ui: React.ReactElement = <Displays />) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // Pre-seed the displays_page preference so useTableState hydrates immediately,
  // which makes isHydrated=true and allows the DataTable to render.
  queryClient.setQueryData(['userPref', 'displays_page'], null);

  return render(
    <QueryClientProvider client={queryClient}>
      <UserProvider initialUser={mockUser}>
        <MemoryRouter>{ui}</MemoryRouter>
      </UserProvider>
    </QueryClientProvider>,
  );
};

// ─── Shared mock data ─────────────────────────────────────────────────────────

export const mockDisplays: Display[] = [
  {
    displayId: 1,
    displayGroupId: 10,
    display: 'Display 1',
    description: 'First display',
    licensed: 1,               // authorised
    loggedIn: 1,               // online
    mediaInventoryStatus: 1,   // up to date
    clientType: 'android',
    clientVersion: '4.0.0',
    clientCode: 400,
    macAddress: '00:11:22:33:44:55',
    clientAddress: '192.168.1.1',
  },
  {
    displayId: 2,
    displayGroupId: 20,
    display: 'Display 2',
    description: 'Second display',
    licensed: 0,               // unauthorised
    loggedIn: 0,               // offline
    mediaInventoryStatus: 3,   // out of date
    clientType: 'windows',
    clientVersion: '3.0.0',
    clientCode: 300,
    macAddress: '00:11:22:33:44:66',
    clientAddress: '192.168.1.2',
  },
];
