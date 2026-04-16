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
import type { DisplayGroup } from '@/types/displayGroup';

export interface FetchDisplayGroupsRequest {
  start: number;
  length: number;
  keyword?: string;
  isDisplaySpecific?: number;
  sortBy?: string;
  sortDir?: string;
  signal?: AbortSignal;
}

export interface FetchDisplayGroupsResponse {
  rows: DisplayGroup[];
  totalCount: number;
}

export async function fetchDisplayGroups(
  options: FetchDisplayGroupsRequest = { start: 0, length: 10 },
): Promise<FetchDisplayGroupsResponse> {
  const { signal, ...queryParams } = options;

  const response = await http.get('/displaygroup', {
    params: queryParams,
    signal,
  });

  const rows = response.data;
  const totalCountHeader = response.headers['x-total-count'];
  const totalCount = totalCountHeader ? parseInt(totalCountHeader, 10) : 0;

  return { rows, totalCount };
}
