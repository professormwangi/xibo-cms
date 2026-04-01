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
import { Minus, Plus } from 'lucide-react';

import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/forms/Checkbox';
import DatePickerInput from '@/components/ui/forms/DatePickerInput';
import NumberInput from '@/components/ui/forms/NumberInput';
import SelectDropdown from '@/components/ui/forms/SelectDropdown';
import Slider from '@/components/ui/forms/Slider';
import TextInput from '@/components/ui/forms/TextInput';
import TimePickerInput from '@/components/ui/forms/TimePickerInput';
import type { PlayerSoftware } from '@/services/playerSoftwareApi';
import type { Daypart } from '@/types/daypart';

export interface TimerRow {
  id: number;
  day: string;
  on: string;
  off: string;
}

export interface PictureOptionRow {
  id: number;
  property: string;
  value: number;
}

export interface LockOptionsState {
  usblock: string;
  osdlock: string;
  keylockLocal: string;
  keylockRemote: string;
}

export interface PicturePropertyDef {
  name: string;
  min: number;
  max: number;
  labels?: string[]; // PHP string labels indexed by slider value
}

export const PICTURE_PROPERTY_DEFS: Record<string, PicturePropertyDef> = {
  backlight: { name: 'Backlight', min: 0, max: 100 },
  contrast: { name: 'Contrast', min: 0, max: 100 },
  brightness: { name: 'Brightness', min: 0, max: 100 },
  sharpness: { name: 'Sharpness', min: 0, max: 50 },
  hSharpness: { name: 'Horizontal Sharpness', min: 0, max: 50 },
  vSharpness: { name: 'Vertical Sharpness', min: 0, max: 50 },
  color: { name: 'Color', min: 0, max: 100 },
  tint: { name: 'Tint', min: 0, max: 100 },
  colorTemperature: { name: 'Color Temperature', min: 0, max: 100 },
  dynamicContrast: {
    name: 'Dynamic Contrast',
    min: 0,
    max: 3,
    labels: ['off', 'low', 'medium', 'high'],
  },
  superResolution: {
    name: 'Super Resolution',
    min: 0,
    max: 3,
    labels: ['off', 'low', 'medium', 'high'],
  },
  colorGamut: { name: 'Color Gamut', min: 0, max: 1, labels: ['normal', 'extended'] },
  dynamicColor: {
    name: 'Dynamic Color',
    min: 0,
    max: 3,
    labels: ['off', 'low', 'medium', 'high'],
  },
  noiseReduction: {
    name: 'Noise Reduction',
    min: 0,
    max: 4,
    labels: ['auto', 'off', 'low', 'medium', 'high'],
  },
  mpegNoiseReduction: {
    name: 'MPEG Noise Reduction',
    min: 0,
    max: 4,
    labels: ['auto', 'off', 'low', 'medium', 'high'],
  },
  blackLevel: { name: 'Black Level', min: 0, max: 1, labels: ['low', 'high'] },
  gamma: { name: 'Gamma', min: 0, max: 3, labels: ['low', 'medium', 'high', 'high2'] },
};

export function getPictureSliderIndex(property: string, storedValue: string | number): number {
  const def = PICTURE_PROPERTY_DEFS[property];
  if (!def) return 0;
  if (def.labels && typeof storedValue === 'string') {
    const idx = def.labels.indexOf(storedValue.toLowerCase());
    return idx >= 0 ? idx : 0;
  }
  const n = Number(storedValue);
  return isNaN(n) ? 0 : n;
}

export interface LgSsspFieldProps {
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
  playerType?: string;
  playerVersions: PlayerSoftware[];
  playerVersionsHasMore?: boolean;
  onLoadMorePlayerVersions?: () => void;
  isLoadingMorePlayerVersions?: boolean;
  timerRows?: TimerRow[];
  onTimerRowsChange?: (rows: TimerRow[]) => void;
  pictureOptionRows?: PictureOptionRow[];
  onPictureOptionRowsChange?: (rows: PictureOptionRow[]) => void;
  lockOptionsState?: LockOptionsState;
  onLockOptionsStateChange?: (state: LockOptionsState) => void;
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

const ROW_BTN_CLASS = 'h-8 w-8 min-w-8';

export function LgSsspFields({
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
  playerType,
  playerVersions,
  playerVersionsHasMore,
  onLoadMorePlayerVersions,
  isLoadingMorePlayerVersions,
  timerRows = [{ id: 0, day: '', on: '', off: '' }],
  onTimerRowsChange,
  pictureOptionRows = [{ id: 0, property: '', value: 0 }],
  onPictureOptionRowsChange,
  lockOptionsState = { usblock: 'empty', osdlock: 'empty', keylockLocal: '', keylockRemote: '' },
  onLockOptionsStateChange,
}: LgSsspFieldProps) {
  if (tab === 'general') {
    return (
      <>
        <TextInput
          name="emailAddress"
          label={t('Licence Code')}
          placeholder=" "
          helpText={t(
            'Provide the Licence Code (formerly Licence email address) to license Players using this Display Profile.',
          )}
          value={str('emailAddress')}
          onChange={setStr('emailAddress')}
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
          helper={t('The version of the Player to use for Displays assigned to this profile.')}
          value={num('versionMediaId') ? String(num('versionMediaId')) : ''}
          options={[
            { value: '', label: t('Use Default') },
            ...playerVersions.map((v) => ({
              value: String(v.versionId),
              label: v.playerShowVersion,
            })),
          ]}
          onSelect={setStr('versionMediaId')}
          hasMore={playerVersionsHasMore}
          onLoadMore={onLoadMorePlayerVersions}
          isLoadingMore={isLoadingMorePlayerVersions}
        />
        <SelectDropdown
          label={t('Orientation')}
          helper={t(
            'Set the orientation of the device (portrait mode will only work if supported by the hardware) Application Restart Required.',
          )}
          value={str('orientation')}
          options={[
            { value: '0', label: t('Landscape') },
            { value: '1', label: t('Portrait') },
            { value: '8', label: t('Reverse Landscape') },
            { value: '9', label: t('Reverse Portrait') },
          ]}
          onSelect={setStr('orientation')}
        />
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
        <TimePickerInput
          label={t('Update Window Start Time')}
          helpText={t('The start of the time window to install application updates.')}
          value={str('updateStartWindow')}
          onChange={setStr('updateStartWindow')}
        />
        <TimePickerInput
          label={t('Update Window End Time')}
          helpText={t('The end of the time window to install application updates.')}
          value={str('updateEndWindow')}
          onChange={setStr('updateEndWindow')}
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

  if (tab === 'timers') {
    const addRow = () => {
      if (!onTimerRowsChange) return;
      const nextId = timerRows.length > 0 ? Math.max(...timerRows.map((r) => r.id)) + 1 : 1;
      onTimerRowsChange([...timerRows, { id: nextId, day: '', on: '', off: '' }]);
    };

    const removeRow = (id: number) => {
      if (!onTimerRowsChange) return;
      onTimerRowsChange(timerRows.filter((r) => r.id !== id));
    };

    const updateRow = (id: number, field: keyof Omit<TimerRow, 'id'>, value: string) => {
      if (!onTimerRowsChange) return;
      onTimerRowsChange(timerRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    };

    const dayOptions = [
      { value: 'monday', label: t('Monday') },
      { value: 'tuesday', label: t('Tuesday') },
      { value: 'wednesday', label: t('Wednesday') },
      { value: 'thursday', label: t('Thursday') },
      { value: 'friday', label: t('Friday') },
      { value: 'saturday', label: t('Saturday') },
      { value: 'sunday', label: t('Sunday') },
    ];

    return (
      <>
        <div
          className="rounded-lg border border-xibo-blue-200 bg-xibo-blue-50 p-3 text-sm text-xibo-blue-700"
          dangerouslySetInnerHTML={{
            __html: t(
              `Use the form fields to create On/Off timings for the monitor for specific days of the week as required. <strong>Please note:</strong> When the monitor is 'Off' it will not be able to receive content updates. With the next timed 'On' the monitor will connect to the CMS and get content/schedule updates.`,
            ),
          }}
        />

        {timerRows.length > 0 && (
          <div className="flex gap-2 items-center text-xs font-semibold text-gray-500 uppercase px-1">
            <span className="flex-5">{t('Day')}</span>
            <span className="flex-3">{t('On')}</span>
            <span className="flex-3">{t('Off')}</span>
            <span className="w-17 shrink-0" />
          </div>
        )}

        <div className="space-y-2">
          {timerRows.map((row) => (
            <div key={row.id} className="flex gap-2 items-center">
              <SelectDropdown
                label=""
                className="flex-3"
                value={row.day}
                placeholder={t('Select day')}
                options={dayOptions}
                onSelect={(v) => updateRow(row.id, 'day', v)}
              />
              <TimePickerInput
                label=""
                className="flex-3 min-w-0 gap-0"
                value={row.on}
                onChange={(v) => updateRow(row.id, 'on', v)}
              />
              <TimePickerInput
                label=""
                className="flex-3 min-w-0  gap-0"
                value={row.off}
                onChange={(v) => updateRow(row.id, 'off', v)}
              />
              <div className="shrink-0 flex gap-1 justify-end">
                <Button
                  className={ROW_BTN_CLASS}
                  variant="secondary"
                  onClick={() => removeRow(row.id)}
                  title={t('Remove')}
                >
                  <Minus size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full" onClick={addRow} title={t('Add')}>
          <Plus size={14} />
        </Button>
      </>
    );
  }

  if (tab === 'pictureOptions') {
    const addRow = () => {
      if (!onPictureOptionRowsChange) return;
      const nextId =
        pictureOptionRows.length > 0 ? Math.max(...pictureOptionRows.map((r) => r.id)) + 1 : 1;
      onPictureOptionRowsChange([...pictureOptionRows, { id: nextId, property: '', value: 0 }]);
    };

    const removeRow = (id: number) => {
      if (!onPictureOptionRowsChange) return;
      onPictureOptionRowsChange(pictureOptionRows.filter((r) => r.id !== id));
    };

    const updateRowProperty = (id: number, property: string) => {
      if (!onPictureOptionRowsChange) return;
      onPictureOptionRowsChange(
        pictureOptionRows.map((r) => (r.id === id ? { ...r, property, value: 0 } : r)),
      );
    };

    const updateRowValue = (id: number, value: number) => {
      if (!onPictureOptionRowsChange) return;
      onPictureOptionRowsChange(pictureOptionRows.map((r) => (r.id === id ? { ...r, value } : r)));
    };

    const propertyOptions = Object.entries(PICTURE_PROPERTY_DEFS).map(([key, def]) => ({
      value: key,
      label: def.name,
    }));

    const getSliderLabels = (property: string): { left: string; right: string } => {
      if (property === 'tint') return { left: t('Red'), right: t('Green') };
      if (property === 'colorTemperature') return { left: t('Warm'), right: t('Cool') };
      const def = PICTURE_PROPERTY_DEFS[property];
      if (!def) return { left: '0', right: '0' };
      if (def.labels) {
        return {
          left: def.labels[def.min] ?? String(def.min),
          right: def.labels[def.max] ?? String(def.max),
        };
      }
      return { left: String(def.min), right: String(def.max) };
    };

    const getDisplayValue = (property: string, value: number): string => {
      const def = PICTURE_PROPERTY_DEFS[property];
      if (!def) return String(value);
      if (def.labels) return def.labels[value] ?? String(value);
      return String(value);
    };

    return (
      <>
        <div className="rounded-lg border border-xibo-blue-200 bg-xibo-blue-50 p-3 text-sm text-xibo-blue-700">
          {t(
            'Control picture settings using the fields below. Use the sliders to set the required range for each setting.',
          )}
        </div>

        <div className="space-y-3">
          <>
            {pictureOptionRows.map((row) => {
              const def = row.property ? PICTURE_PROPERTY_DEFS[row.property] : null;
              const sliderLabels = row.property ? getSliderLabels(row.property) : null;

              return (
                <div key={row.id} className="flex gap-3 items-center">
                  <SelectDropdown
                    label=""
                    className="flex-4"
                    value={row.property}
                    placeholder={t('Select property')}
                    options={propertyOptions}
                    onSelect={(v) => updateRowProperty(row.id, v)}
                  />

                  <div className="flex-6 h-11.25 flex items-center">
                    {def && sliderLabels ? (
                      <Slider
                        min={def.min}
                        max={def.max}
                        value={row.value}
                        onChange={(v) => updateRowValue(row.id, v)}
                        leftLabel={sliderLabels.left}
                        rightLabel={sliderLabels.right}
                        displayValue={getDisplayValue(row.property, row.value)}
                      />
                    ) : (
                      <p className="text-sm text-gray-400 pt-2">
                        {t('Select a property to display inputs')}
                      </p>
                    )}
                  </div>

                  <Button
                    className={ROW_BTN_CLASS}
                    variant="secondary"
                    onClick={() => removeRow(row.id)}
                    title={t('Remove')}
                  >
                    <Minus size={14} />
                  </Button>
                </div>
              );
            })}

            <Button className="w-full" onClick={addRow} title={t('Add')}>
              <Plus size={14} />
            </Button>
          </>
        </div>
      </>
    );
  }

  if (tab === 'lockSettings') {
    const boolOptions = [
      { value: 'empty', label: t('Not set') },
      { value: 'true', label: t('True') },
      { value: 'false', label: t('False') },
    ];

    const keylockBaseOptions = [
      { value: '', label: t('Not set') },
      { value: 'allowall', label: t('Allow All') },
      { value: 'blockall', label: t('Block All') },
    ];

    const keylockOptions =
      playerType === 'lg'
        ? [...keylockBaseOptions, { value: 'poweronly', label: t('Power Only') }]
        : keylockBaseOptions;

    const updateLock = (field: keyof LockOptionsState, value: string) => {
      if (!onLockOptionsStateChange) return;
      onLockOptionsStateChange({ ...lockOptionsState, [field]: value });
    };

    return (
      <>
        {playerType === 'lg' && (
          <SelectDropdown
            label={t('USB Lock (usblock)')}
            helper={t(
              "Set access to any device that uses the monitors USB port. Set to 'False' the monitor will not accept input or read from USB ports.",
            )}
            value={lockOptionsState.usblock}
            options={boolOptions}
            onSelect={(v) => updateLock('usblock', v)}
          />
        )}
        <SelectDropdown
          label={t('OSD Lock (osdlock)')}
          helper={t(
            "Set access to the monitor settings via the remote control. Set to 'False' the remote control will not change the volume, brightness etc of the monitor.",
          )}
          value={lockOptionsState.osdlock}
          options={boolOptions}
          onSelect={(v) => updateLock('osdlock', v)}
        />
        <SelectDropdown
          label={t('Keylock (local)')}
          helper={t('Set the allowed key input for the monitor.')}
          value={lockOptionsState.keylockLocal}
          options={keylockOptions}
          onSelect={(v) => updateLock('keylockLocal', v)}
        />
        <SelectDropdown
          label={t('Keylock (remote)')}
          helper={t('Set the allowed key input for the monitor.')}
          value={lockOptionsState.keylockRemote}
          options={keylockOptions}
          onSelect={(v) => updateLock('keylockRemote', v)}
        />
      </>
    );
  }

  if (tab === 'advanced') {
    const screenShotSizeOptions =
      playerType === 'lg'
        ? [
            { value: '1', label: t('Thumbnail') },
            { value: '2', label: t('HD') },
            { value: '3', label: t('FHD') },
          ]
        : [
            { value: '1', label: t('Thumbnail') },
            { value: '2', label: t('Standard') },
          ];

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
        <SelectDropdown
          label={t('Action Bar Mode')}
          helper={t('How should the action bar behave?')}
          value={str('actionBarMode')}
          options={[
            { value: '0', label: t('Hide') },
            { value: '1', label: t('Timed') },
          ]}
          onSelect={setStr('actionBarMode')}
        />
        <NumberInput
          name="actionBarDisplayDuration"
          label={t('Action Bar Display Duration')}
          helpText={t('How long should the Action Bar be shown for, in seconds?')}
          value={num('actionBarDisplayDuration')}
          onChange={setNum('actionBarDisplayDuration')}
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
          options={screenShotSizeOptions}
          onSelect={setStr('screenShotSize')}
        />
        <NumberInput
          name="mediaInventoryTimer"
          label={t('Send progress while downloading')}
          helpText={t(
            'How often, in minutes, should the Display send its download progress while it is downloading new content?',
          )}
          value={num('mediaInventoryTimer')}
          onChange={setNum('mediaInventoryTimer')}
        />
        <NumberInput
          name="serverPort"
          label={t('Embedded Web Server Port')}
          helpText={t(
            'The port number to use for the embedded web server on the Player. Only change this if there is a port conflict reported on the status screen.',
          )}
          value={num('serverPort')}
          onChange={setNum('serverPort')}
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
        <SelectDropdown
          label={t('Use Multiple Video Decoders')}
          helper={t(
            'Should the Player try to use Multiple Video Decoders when preparing and showing Video content.',
          )}
          value={str('isUseMultipleVideoDecoders')}
          options={[
            { value: 'on', label: t('On') },
            { value: 'off', label: t('Off') },
          ]}
          onSelect={setStr('isUseMultipleVideoDecoders')}
        />
      </>
    );
  }

  return null;
}
