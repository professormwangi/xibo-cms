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
import TimePickerInput from '@/components/ui/forms/TimePickerInput';
import type { Daypart } from '@/types/daypart';

export interface LinuxFieldProps {
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

export function LinuxFields({
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
}: LinuxFieldProps) {
  if (tab === 'general') {
    return (
      <>
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
          helpText={t('Please enter the WebSocket address for XMR.')}
          value={str('xmrWebSocketAddress')}
          onChange={setStr('xmrWebSocketAddress')}
        />
        <TextInput
          name="xmrNetworkAddress"
          label={t('XMR Public Address')}
          placeholder=" "
          helpText={t('Please enter the public address for XMR.')}
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
      </>
    );
  }

  if (tab === 'network') {
    return (
      <>
        <TimePickerInput
          label={t('Download Window Start Time')}
          helpText={t('The start of the time window to connect to the CMS and download updates.')}
          value={str('downloadStartWindow')}
          onChange={setStr('downloadStartWindow')}
        />
        <TimePickerInput
          label={t('Download Window End Time')}
          helpText={t('The end of the time window to connect to the CMS and download updates.')}
          value={str('downloadEndWindow')}
          onChange={setStr('downloadEndWindow')}
        />
        <Checkbox
          id="forceHttps"
          title={t('Force HTTPS?')}
          label={t('Should Displays be forced to use HTTPS connection to the CMS?')}
          checked={bool('forceHttps')}
          onChange={setBool('forceHttps')}
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

  if (tab === 'location') {
    return (
      <>
        <NumberInput
          name="sizeX"
          label={t('Width')}
          helpText={t('The Width of the Display Window. 0 means full width.')}
          value={num('sizeX')}
          onChange={setNum('sizeX')}
        />
        <NumberInput
          name="sizeY"
          label={t('Height')}
          helpText={t('The Height of the Display Window. 0 means full height.')}
          value={num('sizeY')}
          onChange={setNum('sizeY')}
        />
        <NumberInput
          name="offsetX"
          label={t('Left Coordinate')}
          helpText={t('The left pixel position the display window should be sized from.')}
          value={num('offsetX')}
          onChange={setNum('offsetX')}
        />
        <NumberInput
          name="offsetY"
          label={t('Top Coordinate')}
          helpText={t('The top pixel position the display window should be sized from.')}
          value={num('offsetY')}
          onChange={setNum('offsetY')}
        />
      </>
    );
  }

  if (tab === 'troubleshooting') {
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
            if (!raw || raw === '0') return '';
            const ts = Number(raw);
            if (!isNaN(ts) && ts > 0) return new Date(ts * 1000).toISOString();
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
      </>
    );
  }

  if (tab === 'advanced') {
    return (
      <>
        <Checkbox
          id="enableShellCommands"
          title={t('Enable Shell Commands')}
          label={t('Enable the Shell Command module.')}
          checked={bool('enableShellCommands')}
          onChange={setBool('enableShellCommands')}
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
        <Checkbox
          id="expireModifiedLayouts"
          title={t('Expire Modified Layouts?')}
          label={t(
            'Expire Modified Layouts immediately on change. This means a layout can be cut during playback if it receives an update from the CMS',
          )}
          checked={bool('expireModifiedLayouts')}
          onChange={setBool('expireModifiedLayouts')}
        />
        <NumberInput
          name="maxConcurrentDownloads"
          label={t('Maximum concurrent downloads')}
          helpText={t('The maximum number of concurrent downloads the Player will attempt.')}
          value={num('maxConcurrentDownloads')}
          onChange={setNum('maxConcurrentDownloads')}
        />
        <TextInput
          name="shellCommandAllowList"
          label={t('Shell Command Allow List')}
          placeholder=" "
          helpText={t('Which shell commands should the Player execute?')}
          value={str('shellCommandAllowList')}
          onChange={setStr('shellCommandAllowList')}
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
        <NumberInput
          name="screenShotSize"
          label={t('Screen Shot Size')}
          helpText={t('The size of the largest dimension. Empty or 0 means the screen size.')}
          value={num('screenShotSize')}
          onChange={setNum('screenShotSize')}
        />
        <NumberInput
          name="maxLogFileUploads"
          label={t('Limit the number of log files uploaded concurrently')}
          helpText={t(
            'The number of log files to upload concurrently. The lower the number the longer it will take, but the better for memory usage.',
          )}
          value={num('maxLogFileUploads')}
          onChange={setNum('maxLogFileUploads')}
        />
        <NumberInput
          name="embeddedServerPort"
          label={t('Embedded Web Server Port')}
          helpText={t(
            'The port number to use for the embedded web server on the Player. Only change this if there is a port conflict reported on the status screen.',
          )}
          value={num('embeddedServerPort')}
          onChange={setNum('embeddedServerPort')}
        />
        <Checkbox
          id="embeddedServerAllowWan"
          title={t('Embedded Web Server allow WAN?')}
          label={t(
            'Should we allow access to the Player Embedded Web Server from WAN? You may need to adjust the device firewall to allow external traffic',
          )}
          checked={bool('embeddedServerAllowWan')}
          onChange={setBool('embeddedServerAllowWan')}
        />
        <Checkbox
          id="preventSleep"
          title={t('Prevent Sleep?')}
          label={t('Stop the player PC power management from Sleeping the PC')}
          checked={bool('preventSleep')}
          onChange={setBool('preventSleep')}
        />
      </>
    );
  }

  return null;
}
