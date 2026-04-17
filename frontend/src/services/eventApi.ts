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

import http from '@/lib/api';
import type { Event } from '@/types/event';

export interface FetchEventRequest {
  start: number;
  length: number;
  name?: string;
  eventTypeId?: number | null;
  campaignId?: number | null;
  displaySpecificGroupIds?: number[];
  displayGroupIds?: number[];
  geoAware?: number | null;
  recurring?: number | null;
  directSchedule?: number | null;
  sharedSchedule?: number | null;
  fromDt?: string;
  toDt?: string;
  sortBy?: string;
  sortDir?: string;
  signal?: AbortSignal;
}

export interface FetchEventResponse {
  rows: Event[];
  totalCount: number;
}

export async function fetchEvent(
  options: FetchEventRequest = { start: 0, length: 10 },
): Promise<FetchEventResponse> {
  const { signal, ...queryParams } = options;

  const response = await http.get('/schedule', {
    params: queryParams,
    signal,
  });

  const rows = response.data;

  const totalCountHeader = response.headers['x-total-count'];
  const totalCount = totalCountHeader ? parseInt(totalCountHeader, 10) : 0;

  return {
    rows,
    totalCount,
  };
}

export async function deleteEvent(eventId: number | string): Promise<void> {
  await http.delete(`/schedule/${eventId}`, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
}

export interface CloneEventRequest {
  eventId: number | string;
  name: string;
  signal?: AbortSignal;
}

export async function cloneEvent({ eventId, name }: CloneEventRequest): Promise<Event> {
  const params = new URLSearchParams();

  params.append('name', name);

  const response = await http.post(`/schedule/copy/${eventId}`, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  return response.data;
}
