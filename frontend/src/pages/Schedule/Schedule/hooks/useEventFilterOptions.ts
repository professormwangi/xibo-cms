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

import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';

import { getBaseFilterKeys } from '../EventsConfig';

import type { FilterOption } from '@/components/ui/SelectFilter';
import { fetchCampaigns } from '@/services/campaignApi';
import { fetchDisplayGroups } from '@/services/displayGroupApi';
import { fetchDisplays } from '@/services/displaysApi';

const PAGE_SIZE = 10;

export function useEventFilterOptions(t: TFunction) {
  const [layoutOptions, setLayoutOptions] = useState<FilterOption[]>([]);
  const [layoutPage, setLayoutPage] = useState(0);
  const [hasMoreLayouts, setHasMoreLayouts] = useState(false);
  const [isLoadingLayouts, setIsLoadingLayouts] = useState(false);
  const [isLoadingMoreLayouts, setIsLoadingMoreLayouts] = useState(false);

  const [campaignOptions, setCampaignOptions] = useState<FilterOption[]>([]);
  const [campaignPage, setCampaignPage] = useState(0);
  const [hasMoreCampaigns, setHasMoreCampaigns] = useState(false);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [isLoadingMoreCampaigns, setIsLoadingMoreCampaigns] = useState(false);

  const [displayOptions, setDisplayOptions] = useState<FilterOption[]>([]);
  const [displayPage, setDisplayPage] = useState(0);
  const [hasMoreDisplays, setHasMoreDisplays] = useState(false);
  const [isLoadingDisplays, setIsLoadingDisplays] = useState(false);
  const [isLoadingMoreDisplays, setIsLoadingMoreDisplays] = useState(false);

  const [displayGroupOptions, setDisplayGroupOptions] = useState<FilterOption[]>([]);
  const [displayGroupPage, setDisplayGroupPage] = useState(0);
  const [hasMoreDisplayGroups, setHasMoreDisplayGroups] = useState(false);
  const [isLoadingDisplayGroups, setIsLoadingDisplayGroups] = useState(false);
  const [isLoadingMoreDisplayGroups, setIsLoadingMoreDisplayGroups] = useState(false);

  useEffect(() => {
    setIsLoadingLayouts(true);
    fetchCampaigns({ start: 0, length: PAGE_SIZE, isLayoutSpecific: 1 })
      .then((res) => {
        setLayoutOptions(res.rows.map((c) => ({ label: c.campaign, value: c.campaignId })));
        setLayoutPage(0);
        setHasMoreLayouts(res.rows.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setIsLoadingLayouts(false));
  }, []);

  useEffect(() => {
    setIsLoadingCampaigns(true);
    fetchCampaigns({ start: 0, length: PAGE_SIZE, isLayoutSpecific: 0 })
      .then((res) => {
        setCampaignOptions(res.rows.map((c) => ({ label: c.campaign, value: c.campaignId })));
        setCampaignPage(0);
        setHasMoreCampaigns(res.rows.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setIsLoadingCampaigns(false));
  }, []);

  useEffect(() => {
    setIsLoadingDisplays(true);
    fetchDisplays({ start: 0, length: PAGE_SIZE })
      .then((res) => {
        setDisplayOptions(res.rows.map((d) => ({ label: d.display, value: d.displayGroupId })));
        setDisplayPage(0);
        setHasMoreDisplays(res.rows.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setIsLoadingDisplays(false));
  }, []);

  useEffect(() => {
    setIsLoadingDisplayGroups(true);
    fetchDisplayGroups({ start: 0, length: PAGE_SIZE, isDisplaySpecific: 0 })
      .then((res) => {
        setDisplayGroupOptions(
          res.rows.map((g) => ({ label: g.displayGroup, value: g.displayGroupId })),
        );
        setDisplayGroupPage(0);
        setHasMoreDisplayGroups(res.rows.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setIsLoadingDisplayGroups(false));
  }, []);

  const handleLoadMoreLayouts = () => {
    if (isLoadingMoreLayouts || !hasMoreLayouts) {
      return;
    }
    const nextPage = layoutPage + 1;
    setIsLoadingMoreLayouts(true);
    fetchCampaigns({ start: nextPage * PAGE_SIZE, length: PAGE_SIZE, isLayoutSpecific: 1 })
      .then((res) => {
        setLayoutOptions((prev) => [
          ...prev,
          ...res.rows.map((c) => ({ label: c.campaign, value: c.campaignId })),
        ]);
        setLayoutPage(nextPage);
        setHasMoreLayouts(res.rows.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setIsLoadingMoreLayouts(false));
  };

  const handleLoadMoreCampaigns = () => {
    if (isLoadingMoreCampaigns || !hasMoreCampaigns) {
      return;
    }
    const nextPage = campaignPage + 1;
    setIsLoadingMoreCampaigns(true);
    fetchCampaigns({ start: nextPage * PAGE_SIZE, length: PAGE_SIZE, isLayoutSpecific: 0 })
      .then((res) => {
        setCampaignOptions((prev) => [
          ...prev,
          ...res.rows.map((c) => ({ label: c.campaign, value: c.campaignId })),
        ]);
        setCampaignPage(nextPage);
        setHasMoreCampaigns(res.rows.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setIsLoadingMoreCampaigns(false));
  };

  const handleLoadMoreDisplays = () => {
    if (isLoadingMoreDisplays || !hasMoreDisplays) {
      return;
    }
    const nextPage = displayPage + 1;
    setIsLoadingMoreDisplays(true);
    fetchDisplays({ start: nextPage * PAGE_SIZE, length: PAGE_SIZE })
      .then((res) => {
        setDisplayOptions((prev) => [
          ...prev,
          ...res.rows.map((d) => ({ label: d.display, value: d.displayGroupId })),
        ]);
        setDisplayPage(nextPage);
        setHasMoreDisplays(res.rows.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setIsLoadingMoreDisplays(false));
  };

  const handleLoadMoreDisplayGroups = () => {
    if (isLoadingMoreDisplayGroups || !hasMoreDisplayGroups) {
      return;
    }
    const nextPage = displayGroupPage + 1;
    setIsLoadingMoreDisplayGroups(true);
    fetchDisplayGroups({ start: nextPage * PAGE_SIZE, length: PAGE_SIZE, isDisplaySpecific: 0 })
      .then((res) => {
        setDisplayGroupOptions((prev) => [
          ...prev,
          ...res.rows.map((g) => ({ label: g.displayGroup, value: g.displayGroupId })),
        ]);
        setDisplayGroupPage(nextPage);
        setHasMoreDisplayGroups(res.rows.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setIsLoadingMoreDisplayGroups(false));
  };

  const filterOptions = getBaseFilterKeys(t).map((item) => {
    if (item.name === 'layoutCampaignId') {
      return {
        ...item,
        options: layoutOptions,
        onLoadMore: handleLoadMoreLayouts,
        hasMore: hasMoreLayouts,
        isLoadingMore: isLoadingMoreLayouts,
        isLoading: isLoadingLayouts,
      };
    }

    if (item.name === 'campaignId') {
      return {
        ...item,
        options: campaignOptions,
        onLoadMore: handleLoadMoreCampaigns,
        hasMore: hasMoreCampaigns,
        isLoadingMore: isLoadingMoreCampaigns,
        isLoading: isLoadingCampaigns,
      };
    }

    if (item.name === 'displaySpecificGroupId') {
      return {
        ...item,
        options: displayOptions,
        onLoadMore: handleLoadMoreDisplays,
        hasMore: hasMoreDisplays,
        isLoadingMore: isLoadingMoreDisplays,
        isLoading: isLoadingDisplays,
      };
    }

    if (item.name === 'displayGroupId') {
      return {
        ...item,
        options: displayGroupOptions,
        onLoadMore: handleLoadMoreDisplayGroups,
        hasMore: hasMoreDisplayGroups,
        isLoadingMore: isLoadingMoreDisplayGroups,
        isLoading: isLoadingDisplayGroups,
      };
    }

    return item;
  });

  return { filterOptions };
}
