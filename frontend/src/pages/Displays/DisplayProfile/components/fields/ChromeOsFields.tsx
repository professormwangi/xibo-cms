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

import Checkbox from '@/components/ui/forms/Checkbox';
import DatePickerInput from '@/components/ui/forms/DatePickerInput';
import NumberInput from '@/components/ui/forms/NumberInput';
import SelectDropdown from '@/components/ui/forms/SelectDropdown';
import TextInput from '@/components/ui/forms/TextInput';
import type { PlayerSoftware } from '@/services/playerSoftwareApi';
import type { Daypart } from '@/types/daypart';

export interface ChromeOsFieldProps {
  str: (key: string) => string;
  num: (key: string) => number;
  bool: (key: string) => boolean;
  setStr: (key: string) => (value: string) => void;
  setNum: (key: string) => (value: number) => void;
  setBool: (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  t: TFunction;
  tab: string;
  dayparts: Daypart[];
  daypartsHasMore?: boolean;
  onLoadMoreDayparts?: () => void;
  isLoadingMoreDayparts?: boolean;
  playerVersions: PlayerSoftware[];
  playerVersionsHasMore?: boolean;
  onLoadMorePlayerVersions?: () => void;
  isLoadingMorePlayerVersions?: boolean;
}

const COLLECT_INTERVAL_OPTIONS = [
  { value: '60', label: '1 minute' },
  { value: '300', label: '5 minutes' },
  { value: '600', label: '10 minutes' },
  { value: '1800', label: '30 minutes' },
  { value: '3600', label: '1 hour' },
  { value: '5400', label: '1 hour 30 minutes' },
  { value: '7200', label: '2 hours' },
  { value: '9000', label: '2 hours 30 minutes' },
  { value: '10800', label: '3 hours' },
  { value: '12600', label: '3 hours 30 minutes' },
  { value: '14400', label: '4 hours' },
  { value: '18000', label: '5 hours' },
  { value: '21600', label: '6 hours' },
  { value: '25200', label: '7 hours' },
  { value: '28800', label: '8 hours' },
  { value: '32400', label: '9 hours' },
  { value: '36000', label: '10 hours' },
  { value: '39600', label: '11 hours' },
  { value: '43200', label: '12 hours' },
  { value: '86400', label: '24 hours' },
];

export function ChromeOsFields({
  str,
  num,
  bool,
  setStr,
  setNum,
  setBool,
  t,
  tab,
  dayparts,
  daypartsHasMore,
  onLoadMoreDayparts,
  isLoadingMoreDayparts,
  playerVersions,
  playerVersionsHasMore,
  onLoadMorePlayerVersions,
  isLoadingMorePlayerVersions,
}: ChromeOsFieldProps) {
  if (tab === 'general') {
    return (
      <>
        <TextInput
          name="licenceCode"
          label={t('Licence Code')}
          placeholder=" "
          helpText={t('Provide the Licence Code to license Players using this Display Profile.')}
          value={str('licenceCode')}
          onChange={setStr('licenceCode')}
        />
        <SelectDropdown
          label={t('Collect interval')}
          helper={t('How often should the Player check for new content.')}
          value={str('collectInterval')}
          options={COLLECT_INTERVAL_OPTIONS}
          onSelect={setStr('collectInterval')}
        />
        <TextInput
          name="xmrWebSocketAddress"
          label={t('XMR WebSocket Address')}
          placeholder=" "
          helpText={t('Override the CMS WebSocket address for XMR.')}
          value={str('xmrWebSocketAddress')}
          onChange={setStr('xmrWebSocketAddress')}
        />
        <TextInput
          name="xmrNetworkAddress"
          label={t('XMR Public Address')}
          placeholder=" "
          helpText={t('Override the CMS public address for XMR.')}
          value={str('xmrNetworkAddress')}
          onChange={setStr('xmrNetworkAddress')}
        />
        <Checkbox
          id="statsEnabled"
          title={t('Enable stats reporting?')}
          label={t('Should the application send proof of play stats to the CMS.')}
          checked={bool('statsEnabled')}
          onChange={setBool('statsEnabled')}
        />

        {bool('statsEnabled') && (
          <SelectDropdown
            label={t('Aggregation level')}
            helper={t(
              'Set the level of collection for Proof of Play Statistics to be applied to selected Layouts / Media and Widget items.',
            )}
            value={str('aggregationLevel')}
            options={[
              { value: 'Individual', label: t('Individual') },
              { value: 'Hourly', label: t('Hourly') },
              { value: 'Daily', label: t('Daily') },
            ]}
            onSelect={setStr('aggregationLevel')}
          />
        )}
        <SelectDropdown
          label={t('Player Version')}
          helper={t(
            'The version of the ChromeOS Player to use for Displays assigned to this profile.',
          )}
          value={num('playerVersionId') ? String(num('playerVersionId')) : ''}
          options={[
            ...playerVersions.map((v) => ({
              value: String(v.versionId),
              label: v.playerShowVersion,
            })),
          ]}
          placeholder=" "
          onSelect={setStr('playerVersionId')}
          hasMore={playerVersionsHasMore}
          onLoadMore={onLoadMorePlayerVersions}
          isLoadingMore={isLoadingMorePlayerVersions}
        />
        <SelectDropdown
          label={t('Operating Hours')}
          helper={t(
            'Set the operating hours for this Display. The Display will only run during the selected Daypart.',
          )}
          value={num('dayPartId') ? String(num('dayPartId')) : ''}
          options={[...dayparts.map((d) => ({ value: String(d.dayPartId), label: d.name }))]}
          placeholder=" "
          onSelect={setStr('dayPartId')}
          hasMore={daypartsHasMore}
          onLoadMore={onLoadMoreDayparts}
          isLoadingMore={isLoadingMoreDayparts}
        />
      </>
    );
  }

  if (tab === 'advanced') {
    return (
      <>
        <SelectDropdown
          label={t('Log Level')}
          helper={t('The resting logging level that should be recorded by the Player.')}
          value={str('logLevel')}
          options={[
            { value: 'emergency', label: t('Emergency') },
            { value: 'alert', label: t('Alert') },
            { value: 'critical', label: t('Critical') },
            { value: 'error', label: t('Error') },
            { value: 'off', label: t('Off') },
          ]}
          onSelect={setStr('logLevel')}
        />
        <DatePickerInput
          label={t('Elevate Logging until')}
          helpText={t(
            'Elevate log level for the specified time. Should only be used if there is a problem with the display.',
          )}
          value={(() => {
            const raw = str('elevateLogsUntil');
            if (!raw || raw === '0') {
              return '';
            }
            const ts = Number(raw);
            if (!isNaN(ts) && ts > 0) {
              return new Date(ts * 1000).toISOString();
            }
            const d = new Date(raw);
            return isNaN(d.getTime()) ? '' : d.toISOString();
          })()}
          onChange={(iso) => {
            if (!iso) {
              setStr('elevateLogsUntil')('');
              return;
            }
            const d = new Date(iso);
            const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
            setStr('elevateLogsUntil')(formatted);
          }}
        />
        <Checkbox
          id="sendCurrentLayoutAsStatusUpdate"
          title={t('Notify current layout')}
          label={t(
            'When enabled the Player will send the current layout to the CMS each time it changes. Warning: This is bandwidth intensive and should be disabled unless on a LAN.',
          )}
          checked={bool('sendCurrentLayoutAsStatusUpdate')}
          onChange={setBool('sendCurrentLayoutAsStatusUpdate')}
        />
        <NumberInput
          name="screenShotRequestInterval"
          label={t('Screenshot Interval')}
          helpText={t(
            'The duration between status screen shots in minutes. 0 to disable. Warning: This is bandwidth intensive.',
          )}
          value={num('screenShotRequestInterval')}
          onChange={setNum('screenShotRequestInterval')}
        />
        <SelectDropdown
          label={t('Screen Shot Size')}
          helper={t('The size of the screenshot to return when requested.')}
          value={num('screenShotSize') ? String(num('screenShotSize')) : ''}
          options={[
            { value: '1', label: t('Thumbnail') },
            { value: '2', label: t('Standard') },
          ]}
          placeholder=" "
          onSelect={setStr('screenShotSize')}
        />
      </>
    );
  }

  return null;
}
