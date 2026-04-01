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
import type { PlayerSoftware } from '@/services/playerSoftwareApi';
import type { Daypart } from '@/types/daypart';

export interface AndroidFieldProps {
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

export function AndroidFields({
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
}: AndroidFieldProps) {
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
        <TextInput
          name="settingsPassword"
          label={t('Password Protect Settings')}
          placeholder=" "
          helpText={t('Provide a Password which will be required to access settings')}
          value={str('settingsPassword')}
          onChange={setStr('settingsPassword')}
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
        <Checkbox
          id="isRecordGeoLocationOnProofOfPlay"
          title={t('Record geolocation on each Proof of Play?')}
          label={t(
            'If the geolocation of the Display is known, enable to record that location against each proof of play record.',
          )}
          checked={bool('isRecordGeoLocationOnProofOfPlay')}
          onChange={setBool('isRecordGeoLocationOnProofOfPlay')}
        />
        <SelectDropdown
          label={t('Player Version')}
          helper={t(
            'Set the Player Version to install, making sure that the selected version is suitable for your device',
          )}
          value={num('versionMediaId') ? String(num('versionMediaId')) : ''}
          options={[
            ...playerVersions.map((v) => ({
              value: String(v.versionId),
              label: v.playerShowVersion,
            })),
          ]}
          placeholder=" "
          onSelect={setStr('versionMediaId')}
          hasMore={playerVersionsHasMore}
          onLoadMore={onLoadMorePlayerVersions}
          isLoadingMore={isLoadingMorePlayerVersions}
        />
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
            'Select a day part that should act as operating hours for this display -  email alerts will not be sent outside of operating hours',
          )}
          value={num('dayPartId') ? String(num('dayPartId')) : ''}
          options={[...dayparts.map((d) => ({ value: String(d.dayPartId), label: d.name }))]}
          placeholder=" "
          onSelect={setStr('dayPartId')}
          hasMore={daypartsHasMore}
          onLoadMore={onLoadMoreDayparts}
          isLoadingMore={isLoadingMoreDayparts}
        />
        <Checkbox
          id="restartWifiOnConnectionFailure"
          title={t('Restart Wifi on connection failure?')}
          label={t(
            'If an attempted connection to the CMS fails 10 times in a row, restart the Wifi adaptor.',
          )}
          checked={bool('restartWifiOnConnectionFailure')}
          onChange={setBool('restartWifiOnConnectionFailure')}
        />
      </>
    );
  }

  if (tab === 'location') {
    return (
      <>
        <SelectDropdown
          label={t('Orientation')}
          helper={t(
            'Set the orientation of the device (portrait mode will only work if supported by the hardware) Application Restart Required.',
          )}
          value={str('orientation')}
          options={[
            { value: '-1', label: t('Device Default') },
            { value: '0', label: t('Landscape') },
            { value: '1', label: t('Portrait') },
            { value: '8', label: t('Reverse Landscape') },
            { value: '9', label: t('Reverse Portrait') },
          ]}
          onSelect={setStr('orientation')}
        />
        {(() => {
          const raw = str('screenDimensions');
          const parts = raw ? raw.split(',') : [];
          const dims: [number, number, number, number] = [
            parseInt(parts[0] ?? '0', 10) || 0,
            parseInt(parts[1] ?? '0', 10) || 0,
            parseInt(parts[2] ?? '0', 10) || 0,
            parseInt(parts[3] ?? '0', 10) || 0,
          ];
          const setDim = (index: number) => (value: number) => {
            const current = str('screenDimensions')
              ? str('screenDimensions').split(',')
              : ['0', '0', '0', '0'];
            while (current.length < 4) current.push('0');
            current[index] = String(value);
            setStr('screenDimensions')(current.join(','));
          };
          return (
            <div>
              <label className="text-sm font-semibold text-gray-500">
                {t('Screen Dimensions')}
              </label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                <NumberInput
                  name="screenDimTop"
                  label={t('Top')}
                  value={dims[0]}
                  onChange={setDim(0)}
                />
                <NumberInput
                  name="screenDimLeft"
                  label={t('Left')}
                  value={dims[1]}
                  onChange={setDim(1)}
                />
                <NumberInput
                  name="screenDimWidth"
                  label={t('Width')}
                  value={dims[2]}
                  onChange={setDim(2)}
                />
                <NumberInput
                  name="screenDimHeight"
                  label={t('Height')}
                  value={dims[3]}
                  onChange={setDim(3)}
                />
              </div>
              <span className="text-xs text-gray-400 leading-snug flex mt-1 whitespace-pre-line">
                {t(
                  'Set dimensions to be used for the Player window ensuring that they do not exceed the actual screen size. Enter the following values representing the pixel sizings for; Top,Left,Width,Height. This requires a Player Restart to action.',
                )}
              </span>
            </div>
          );
        })()}
      </>
    );
  }

  if (tab === 'troubleshooting') {
    return (
      <>
        <Checkbox
          id="blacklistVideo"
          title={t('Blacklist Videos?')}
          label={t('Should Videos we fail to play be blacklisted and no longer attempted?')}
          checked={bool('blacklistVideo')}
          onChange={setBool('blacklistVideo')}
        />
        <Checkbox
          id="storeHtmlOnInternal"
          title={t('Store HTML resources on the Internal Storage?')}
          label={t(
            'Store all HTML resources on the Internal Storage? Should be selected if the device cannot display text, ticker, dataset media.',
          )}
          checked={bool('storeHtmlOnInternal')}
          onChange={setBool('storeHtmlOnInternal')}
        />
        <Checkbox
          id="useSurfaceVideoView"
          title={t('Use a SurfaceView for Video Rendering?')}
          label={t(
            'If the device is having trouble playing video, it may be useful to switch to a Surface View for Video Rendering.',
          )}
          checked={bool('useSurfaceVideoView')}
          onChange={setBool('useSurfaceVideoView')}
        />
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
      </>
    );
  }

  if (tab === 'advanced') {
    return (
      <>
        <Checkbox
          id="startOnBoot"
          title={t('Start during device start up?')}
          label={t(
            'When the device starts and Android finishes loading, should the Player start up and come to the foreground?',
          )}
          checked={bool('startOnBoot')}
          onChange={setBool('startOnBoot')}
        />
        <SelectDropdown
          label={t('Action Bar Mode')}
          helper={t('How should the action bar behave?')}
          value={str('actionBarMode')}
          options={[
            { value: '0', label: t('Hide') },
            { value: '1', label: t('Timed') },
            { value: '2', label: t('Run Intent') },
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
        <TextInput
          name="actionBarIntent"
          label={t('Action Bar Intent')}
          placeholder=" "
          helpText={t(
            'When set to Run Intent, which intent should be run. Format is: Action|ExtraKey,ExtraMsg',
          )}
          value={str('actionBarIntent')}
          onChange={setStr('actionBarIntent')}
        />
        <Checkbox
          id="autoRestart"
          title={t('Automatic Restart')}
          label={t('Automatically Restart the application if we detect it is not visible.')}
          checked={bool('autoRestart')}
          onChange={setBool('autoRestart')}
        />
        <NumberInput
          name="startOnBootDelay"
          label={t('Start delay for device start up')}
          helpText={t(
            'The number of seconds to wait before starting the application after the device has started. Minimum 10.',
          )}
          value={num('startOnBootDelay')}
          onChange={setNum('startOnBootDelay')}
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
          name="screenShotRequestInterval"
          label={t('Screen shot interval')}
          helpText={t(
            'The duration between status screen shots in minutes. 0 to disable. Warning: This is bandwidth intensive.',
          )}
          value={num('screenShotRequestInterval')}
          onChange={setNum('screenShotRequestInterval')}
        />
        <TextInput
          name="screenShotIntent"
          label={t('Action for Screen Shot Intent')}
          placeholder=" "
          helpText={t(
            'The Intent Action to use for requesting a screen shot. Leave empty to natively create an image from the player screen content.',
          )}
          value={str('screenShotIntent')}
          onChange={setStr('screenShotIntent')}
        />
        <NumberInput
          name="screenShotSize"
          label={t('Screen Shot Size')}
          helpText={t('The size of the largest dimension. Empty or 0 means the screen size.')}
          value={num('screenShotSize')}
          onChange={setNum('screenShotSize')}
        />
        <SelectDropdown
          label={t('WebView Plugin State')}
          helper={t('What plugin state should be used when starting a web view.')}
          value={str('webViewPluginState')}
          options={[
            { value: 'OFF', label: t('Off') },
            { value: 'DEMAND', label: t('On Demand') },
            { value: 'ON', label: t('On') },
          ]}
          onSelect={setStr('webViewPluginState')}
        />
        <SelectDropdown
          label={t('Hardware Accelerate Web Content')}
          helper={t('Mode for hardware acceleration of web based content.')}
          value={str('hardwareAccelerateWebViewMode')}
          options={[
            { value: '0', label: t('Off') },
            { value: '2', label: t('Off when transparent') },
            { value: '1', label: t('On') },
          ]}
          onSelect={setStr('hardwareAccelerateWebViewMode')}
        />
        <Checkbox
          id="timeSyncFromCms"
          title={t('Use CMS time?')}
          label={t(
            'Set the device time using the CMS. Only available on rooted devices or system signed players.',
          )}
          checked={bool('timeSyncFromCms')}
          onChange={setBool('timeSyncFromCms')}
        />
        <Checkbox
          id="webCacheEnabled"
          title={t('Enable caching of Web Resources?')}
          label={t(
            'The standard browser cache will be used - we recommend this is switched off unless specifically required. Effects Web Page and Embedded.',
          )}
          checked={bool('webCacheEnabled')}
          onChange={setBool('webCacheEnabled')}
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
        <Checkbox
          id="installWithLoadedLinkLibraries"
          title={t('Load Link Libraries for APK Update')}
          label={t(
            'Should the update command include dynamic link libraries? Only change this if your updates are failing.',
          )}
          checked={bool('installWithLoadedLinkLibraries')}
          onChange={setBool('installWithLoadedLinkLibraries')}
        />
        <SelectDropdown
          label={t('Use Multiple Video Decoders')}
          helper={t(
            'Should the Player try to use Multiple Video Decoders when preparing and showing Video content.',
          )}
          value={str('isUseMultipleVideoDecoders')}
          options={[
            { value: 'default', label: t('Device Default') },
            { value: 'on', label: t('On') },
            { value: 'off', label: t('Off') },
          ]}
          onSelect={setStr('isUseMultipleVideoDecoders')}
        />
        <NumberInput
          name="maxRegionCount"
          label={t('Maximum Region Count')}
          helpText={t(
            'This setting is a memory limit protection setting which will stop rendering regions beyond the limit set. Leave at 0 for no limit.',
          )}
          value={num('maxRegionCount')}
          onChange={setNum('maxRegionCount')}
        />
        <SelectDropdown
          label={t('Video Engine')}
          helper={t(
            'Select which video engine should be used to playback video. ExoPlayer is usually better, but if you experience issues you can revert back to Android Media Player. HLS always uses ExoPlayer. Available from v3 R300.',
          )}
          value={str('videoEngine')}
          options={[
            { value: 'default', label: t('Device Default') },
            { value: 'exoplayer', label: t('ExoPlayer') },
            { value: 'mediaplayer', label: t('Android Media Player') },
          ]}
          onSelect={setStr('videoEngine')}
        />
        <Checkbox
          id="isTouchEnabled"
          title={t('Enable touch capabilities on the device?')}
          label={t(
            'If this device will be used as a touch screen check this option. Checking this option will cause a message to appear on the player which needs to be manually dismissed once. If this option is disabled, touching the screen will show the action bar according to the Action Bar Mode option. Available from v3 R300.',
          )}
          checked={bool('isTouchEnabled')}
          onChange={setBool('isTouchEnabled')}
        />
      </>
    );
  }

  return null;
}
