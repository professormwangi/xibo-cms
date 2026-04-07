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

import axios from 'axios';

import http from '@/lib/api';
import type { Display } from '@/types/display';

export interface FetchDisplaysRequest {
  start: number;
  length: number;
  keyword?: string;
  mediaInventoryStatus?: number | string;
  loggedIn?: number | string;
  authorised?: number | string;
  xmrRegistered?: number | string;
  clientType?: string;
  displayGroupId?: number | string;
  displayProfileId?: number | string;
  orientation?: string;
  commercialLicence?: number | string;
  isPlayerSupported?: number | string;
  clientCode?: string;
  customId?: string;
  macAddress?: string;
  clientAddress?: string;
  lastAccessed?: string;
  folderId?: number | null;
  sortBy?: string;
  sortDir?: string;
  signal?: AbortSignal;
}

export interface FetchDisplaysResponse {
  rows: Display[];
  totalCount: number;
}

export async function fetchDisplays(
  options: FetchDisplaysRequest = { start: 0, length: 10 },
): Promise<FetchDisplaysResponse> {
  const { signal, ...queryParams } = options;

  const response = await http.get('/display', {
    params: queryParams,
    signal,
  });

  const rows = response.data;
  const totalCountHeader = response.headers['x-total-count'];
  const totalCount = totalCountHeader ? parseInt(totalCountHeader, 10) : 0;

  return { rows, totalCount };
}

export interface UpdateDisplayRequest {
  display: string;
  description?: string;
  licensed?: number;
  incSchedule?: number;
  emailAlert?: number;
  alertTimeout?: number;
  latitude?: number | null;
  longitude?: number | null;
  timeZone?: string;
  isMobile?: number;
  isOutdoor?: number;
  bandwidthLimit?: number | null;
  costPerPlay?: number | null;
  impressionsPerPlay?: number | null;
  ref1?: string;
  ref2?: string;
  ref3?: string;
  ref4?: string;
  ref5?: string;
  customId?: string;
  displayProfileId?: number | null;
  defaultLayoutId?: number | null;
}

export async function updateDisplay(
  displayId: number | string,
  data: UpdateDisplayRequest,
): Promise<Display> {
  const params = new URLSearchParams();

  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });

  const response = await http.put(`/display/${displayId}`, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  return response.data;
}

export async function deleteDisplay(displayId: number | string): Promise<void> {
  await http.delete(`/display/${displayId}`, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
}

export async function toggleDisplayAuthorised(displayId: number | string): Promise<Display> {
  const response = await http.put(`/display/authorise/${displayId}`, null, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  return response.data;
}

export interface DisplayMapFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    displayId: number;
    display: string;
    status: string;
    mediaInventoryStatus: number;
    loggedIn: number;
    orientation: string;
    displayProfile: string;
    resolution: string | null;
    lastAccessed: number | null;
    thumbnail?: string;
  };
}

export interface DisplayMapFeatureCollection {
  type: 'FeatureCollection';
  features: DisplayMapFeature[];
}

export async function fetchDisplaysMap(
  params: Record<string, unknown> = {},
): Promise<DisplayMapFeatureCollection> {
  const response = await axios.get('/display/map', { params, withCredentials: true });
  return response.data;
}
