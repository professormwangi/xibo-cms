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

import { ArrowLeft, ArrowRight, CalendarClock, Minus, Plus } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { useTranslation } from 'react-i18next';

import InfoBanner from '../InfoBanner';
import { notify } from '../Notification';
import Stepper, { type StepDefinition } from '../Stepper';
import Checkbox from '../forms/Checkbox';
import DatePickerInput from '../forms/DatePickerInput';
import MultiSelectDropdown from '../forms/MultiSelectDropdown';
import NumberInput from '../forms/NumberInput';
import SelectDropdown from '../forms/SelectDropdown';
import TextInput from '../forms/TextInput';

import Modal, { type ModalAction } from './Modal';

import { getScheduleEventSchema } from '@/schema/scheduleEvent';
import { fetchCampaigns } from '@/services/campaignApi';
import { fetchCommands } from '@/services/commandApi';
import { fetchDaypart } from '@/services/daypartApi';
import { fetchDisplayGroups } from '@/services/displayGroupApi';
import { createEvent } from '@/services/eventApi';
import { fetchLayouts } from '@/services/layoutsApi';
import { fetchMedia } from '@/services/mediaApi';
import { fetchPlaylist } from '@/services/playlistApi';
import { fetchResolution } from '@/services/resolutionApi';
import { EventTypeId, ReminderType, ReminderOption, type CriteriaCondition } from '@/types/event';

type ScheduleModalMode = 'add' | 'schedule';

interface ScheduleEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: ScheduleModalMode;
  eventTypeId?: EventTypeId;
  contentId?: number;
  contentName?: string;
}

interface DraftCriterion {
  type: string;
  metric: string;
  condition: CriteriaCondition | string;
  value: string;
}

interface DraftReminder {
  value: number;
  type: ReminderType;
  option: ReminderOption;
  isEmail: boolean;
}

interface ScheduleEventDraft {
  eventTypeId: EventTypeId | null;
  mediaId: number | null;
  campaignId: number | null;
  commandId: number | null;
  playlistId: number | null;
  displayGroupIds: string[];
  dayPartId: string;
  fromDt: string;
  toDt: string;
  useRelativeTime: boolean;
  relativeHours: number;
  relativeMinutes: number;
  relativeSeconds: number;
  name: string;
  layoutDuration: number;
  resolutionId: string;
  backgroundColor: string;
  displayOrder: number;
  isPriority: number;
  maxPlaysPerHour: number;
  syncTimezone: boolean;
  recurrenceType: string;
  recurrenceDetail: number;
  recurrenceRepeatsOn: string[];
  recurrenceMonthlyRepeatsOn: number;
  recurrenceRange: string;
  reminders: DraftReminder[];
  isGeoAware: boolean;
  criteria: DraftCriterion[];
}

type OptionalTab = 'general' | 'repeats' | 'reminder' | 'geoLocation' | 'criteria';

type ScheduleFormErrors = Partial<Record<keyof ScheduleEventDraft, string>>;

interface SelectOption {
  label: string;
  value: string;
}

// Constants
const STEP_LABELS = ['Content', 'Displays', 'Time', 'Optional'] as const;

const EVENT_TYPE_OPTIONS: SelectOption[] = [
  { value: String(EventTypeId.Layout), label: 'Layout' },
  { value: String(EventTypeId.Command), label: 'Command' },
  { value: String(EventTypeId.Overlay), label: 'Overlay Layout' },
  { value: String(EventTypeId.Interrupt), label: 'Interrupt Layout' },
  { value: String(EventTypeId.Campaign), label: 'Campaign' },
  { value: String(EventTypeId.Action), label: 'Action' },
  { value: String(EventTypeId.Media), label: 'Media' },
  { value: String(EventTypeId.Playlist), label: 'Playlist' },
];

const CONDITION_OPTIONS: SelectOption[] = [
  { value: 'set', label: 'Is set' },
  { value: 'not_set', label: 'Is not set' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
];

const CRITERIA_TYPE_OPTIONS: SelectOption[] = [
  { value: 'display', label: 'Display' },
  { value: 'geoLocation', label: 'Geo Location' },
  { value: 'time', label: 'Time' },
];

const RECURRENCE_TYPE_OPTIONS: SelectOption[] = [
  { value: '', label: 'None' },
  { value: 'Minute', label: 'Minute' },
  { value: 'Hour', label: 'Hour' },
  { value: 'Day', label: 'Day' },
  { value: 'Week', label: 'Week' },
  { value: 'Month', label: 'Month' },
  { value: 'Year', label: 'Year' },
];

const REMINDER_TYPE_OPTIONS: SelectOption[] = [
  { value: String(ReminderType.Minute), label: 'Minute' },
  { value: String(ReminderType.Hour), label: 'Hour' },
  { value: String(ReminderType.Day), label: 'Day' },
  { value: String(ReminderType.Week), label: 'Week' },
  { value: String(ReminderType.Month), label: 'Month' },
];

const REMINDER_OPTION_OPTIONS: SelectOption[] = [
  { value: String(ReminderOption.BeforeStart), label: 'Before schedule starts' },
  { value: String(ReminderOption.AfterStart), label: 'After schedule starts' },
  { value: String(ReminderOption.BeforeEnd), label: 'Before schedule ends' },
  { value: String(ReminderOption.AfterEnd), label: 'After schedule ends' },
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const EMPTY_CRITERION: DraftCriterion = {
  type: '',
  metric: '',
  condition: 'set',
  value: '',
};

const EMPTY_REMINDER: DraftReminder = {
  value: 0,
  type: ReminderType.Minute,
  option: ReminderOption.BeforeStart,
  isEmail: false,
};

function createInitialDraft(eventTypeId?: EventTypeId, contentId?: number): ScheduleEventDraft {
  return {
    eventTypeId: eventTypeId ?? EventTypeId.Layout,
    mediaId: eventTypeId === EventTypeId.Media ? (contentId ?? null) : null,
    campaignId:
      eventTypeId &&
      [
        EventTypeId.Layout,
        EventTypeId.Overlay,
        EventTypeId.Interrupt,
        EventTypeId.Campaign,
      ].includes(eventTypeId)
        ? (contentId ?? null)
        : null,
    commandId: eventTypeId === EventTypeId.Command ? (contentId ?? null) : null,
    playlistId: eventTypeId === EventTypeId.Playlist ? (contentId ?? null) : null,
    displayGroupIds: [],
    dayPartId: '',
    fromDt: '',
    toDt: '',
    useRelativeTime: true,
    relativeHours: 0,
    relativeMinutes: 0,
    relativeSeconds: 0,
    name: '',
    layoutDuration: 0,
    resolutionId: '',
    backgroundColor: '#000000',
    displayOrder: 0,
    isPriority: 0,
    maxPlaysPerHour: 0,
    syncTimezone: false,
    recurrenceType: '',
    recurrenceDetail: 1,
    recurrenceRepeatsOn: [],
    recurrenceMonthlyRepeatsOn: 0,
    recurrenceRange: '',
    reminders: [{ ...EMPTY_REMINDER }],
    isGeoAware: false,
    criteria: [{ ...EMPTY_CRITERION }],
  };
}

function buildSteps(currentStep: number, t: (key: string) => string): StepDefinition[] {
  const isLastStep = currentStep === STEP_LABELS.length - 1;

  return STEP_LABELS.map((label, index) => ({
    label: t(label),
    status:
      isLastStep || index < currentStep
        ? 'completed'
        : index === currentStep
          ? 'active'
          : 'inactive',
  }));
}

function getContentFieldConfig(eventTypeId: EventTypeId | null, t: (key: string) => string) {
  switch (eventTypeId) {
    case EventTypeId.Layout:
    case EventTypeId.Overlay:
    case EventTypeId.Interrupt:
      return { label: t('Layout'), placeholder: t('Select Layout') };
    case EventTypeId.Command:
      return { label: t('Command'), placeholder: t('Select Command') };
    case EventTypeId.Campaign:
      return { label: t('Campaign'), placeholder: t('Select Campaign') };
    case EventTypeId.Media:
      return { label: t('Media'), placeholder: t('Select Media') };
    case EventTypeId.Playlist:
      return { label: t('Playlist'), placeholder: t('Select Playlist') };
    default:
      return null;
  }
}

function getContentHelpText(eventTypeId: EventTypeId | null, t: (key: string) => string): string {
  switch (eventTypeId) {
    case EventTypeId.Layout:
      return t('Select a Layout to schedule.');
    case EventTypeId.Overlay:
      return t('Select an Overlay Layout to schedule.');
    case EventTypeId.Interrupt:
      return t('Select an Interrupt Layout to schedule.');
    case EventTypeId.Command:
      return t('Select a Command to execute on the selected Displays.');
    case EventTypeId.Campaign:
      return t('Select a Campaign to schedule.');
    case EventTypeId.Media:
      return t(
        'Select a Media item to use. The selected media will be shown full screen for this event.',
      );
    case EventTypeId.Playlist:
      return t(
        'Select a Playlist to use. The selected playlist will be shown full screen for this event.',
      );
    default:
      return '';
  }
}

function getContentValue(draft: ScheduleEventDraft): string {
  switch (draft.eventTypeId) {
    case EventTypeId.Media:
      return draft.mediaId ? String(draft.mediaId) : '';
    case EventTypeId.Playlist:
      return draft.playlistId ? String(draft.playlistId) : '';
    case EventTypeId.Command:
      return draft.commandId ? String(draft.commandId) : '';
    case EventTypeId.Layout:
    case EventTypeId.Overlay:
    case EventTypeId.Interrupt:
    case EventTypeId.Campaign:
      return draft.campaignId ? String(draft.campaignId) : '';
    default:
      return '';
  }
}

function getPrefilledOption(contentId?: number, contentName?: string): SelectOption | null {
  if (contentId) {
    return { value: String(contentId), label: contentName || `#${contentId}` };
  }
  return null;
}

export default function ScheduleEventModal({
  isOpen,
  onClose,
  mode = 'add',
  eventTypeId: prefilledEventTypeId,
  contentId,
  contentName,
}: ScheduleEventModalProps) {
  const { t } = useTranslation();

  const initialStep = contentId ? 1 : 0;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [draft, setDraft] = useState<ScheduleEventDraft>(() =>
    createInitialDraft(prefilledEventTypeId, contentId),
  );
  const [optionalTab, setOptionalTab] = useState<OptionalTab>('general');

  const [contentOptions, setContentOptions] = useState<SelectOption[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [showDisplayBanner, setShowDisplayBanner] = useState(false);
  const [displayGroupOptions, setDisplayGroupOptions] = useState<SelectOption[]>([]);
  const [daypartOptions, setDaypartOptions] = useState<SelectOption[]>([]);
  const [resolutionOptions, setResolutionOptions] = useState<SelectOption[]>([]);

  const [alwaysDayPartId, setAlwaysDayPartId] = useState<string>('');
  const [customDayPartId, setCustomDayPartId] = useState<string>('');

  const [isPending, startTransition] = useTransition();
  const [apiError, setApiError] = useState<string | undefined>();
  const [formErrors, setFormErrors] = useState<ScheduleFormErrors>({});

  const steps = buildSteps(currentStep, t);
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEP_LABELS.length - 1;
  const hasDisplays = draft.displayGroupIds.length > 0;
  const hasContent = (() => {
    if (!draft.eventTypeId) return false;
    if (
      [
        EventTypeId.Layout,
        EventTypeId.Overlay,
        EventTypeId.Interrupt,
        EventTypeId.Campaign,
      ].includes(draft.eventTypeId)
    )
      return !!draft.campaignId;
    if (draft.eventTypeId === EventTypeId.Command) return !!draft.commandId;
    if (draft.eventTypeId === EventTypeId.Media) return !!draft.mediaId;
    if (draft.eventTypeId === EventTypeId.Playlist) return !!draft.playlistId;
    return true;
  })();
  const canFinish = currentStep >= 1 && hasDisplays;

  const isAlwaysDaypart = draft.dayPartId === alwaysDayPartId;
  const isCustomDaypart = draft.dayPartId === customDayPartId;
  const isNamedDaypart = draft.dayPartId !== '' && !isAlwaysDaypart && !isCustomDaypart;
  const showRepeatReminder = !isAlwaysDaypart && draft.dayPartId !== '';
  const isScheduleMode = mode === 'schedule';

  const isStep3Valid = (() => {
    if (isCustomDaypart && draft.useRelativeTime) {
      return draft.relativeHours > 0 || draft.relativeMinutes > 0 || draft.relativeSeconds > 0;
    }
    if (isCustomDaypart && !draft.useRelativeTime) {
      return !!draft.fromDt && !!draft.toDt;
    }
    return true;
  })();
  const isStepValid =
    currentStep === 0
      ? hasContent
      : currentStep === 1
        ? hasDisplays
        : currentStep === 2
          ? isStep3Valid
          : true;

  useEffect(() => {
    if (!isOpen) return;

    fetchDisplayGroups({ start: 0, length: 100 }).then(({ rows }) => {
      setDisplayGroupOptions(
        rows.map((dg) => ({ value: String(dg.displayGroupId), label: dg.displayGroup })),
      );
    });

    fetchDaypart({ start: 0, length: 100 }).then(({ rows }) => {
      setDaypartOptions(rows.map((dp) => ({ value: String(dp.dayPartId), label: dp.name })));

      const always = rows.find((dp) => dp.isAlways === 1);
      const custom = rows.find((dp) => dp.isCustom === 1);
      if (always) {
        setAlwaysDayPartId(String(always.dayPartId));
        setDraft((prev) =>
          prev.dayPartId === '' ? { ...prev, dayPartId: String(always.dayPartId) } : prev,
        );
      }
      if (custom) setCustomDayPartId(String(custom.dayPartId));
    });

    fetchResolution({ start: 0, length: 100 }).then(({ rows }) => {
      setResolutionOptions(
        rows.map((r) => ({ value: String(r.resolutionId), label: r.resolution })),
      );
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !draft.eventTypeId) {
      setContentOptions([]);
      setIsLoadingContent(false);
      return;
    }

    setIsLoadingContent(true);
    setContentOptions([]);

    const load = async () => {
      try {
        switch (draft.eventTypeId) {
          case EventTypeId.Layout:
          case EventTypeId.Overlay:
          case EventTypeId.Interrupt: {
            const { rows } = await fetchLayouts({ start: 0, length: 100 });
            setContentOptions(rows.map((l) => ({ value: String(l.campaignId), label: l.layout })));
            break;
          }
          case EventTypeId.Command: {
            const { rows } = await fetchCommands({ start: 0, length: 100 });
            setContentOptions(rows.map((c) => ({ value: String(c.commandId), label: c.command })));
            break;
          }
          case EventTypeId.Campaign: {
            const { rows } = await fetchCampaigns({});
            setContentOptions(
              rows.map((c) => ({ value: String(c.campaignId), label: c.campaign })),
            );
            break;
          }
          case EventTypeId.Media: {
            const { rows } = await fetchMedia({ start: 0, length: 100 });
            setContentOptions(rows.map((m) => ({ value: String(m.mediaId), label: m.name })));
            break;
          }
          case EventTypeId.Playlist: {
            const { rows } = await fetchPlaylist({ start: 0, length: 100 });
            setContentOptions(rows.map((p) => ({ value: String(p.playlistId), label: p.name })));
            break;
          }
          default:
            setContentOptions([]);
        }
      } finally {
        setIsLoadingContent(false);
      }
    };

    load();
  }, [isOpen, draft.eventTypeId]);

  const updateDraft = <K extends keyof ScheduleEventDraft>(
    key: K,
    value: ScheduleEventDraft[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateCriterion = (index: number, field: keyof DraftCriterion, value: string) => {
    setDraft((prev) => {
      const criteria = prev.criteria.map((c, i) =>
        i === index ? ({ ...c, [field]: value } as DraftCriterion) : c,
      );
      return { ...prev, criteria };
    });
  };

  const addCriterion = () => {
    setDraft((prev) => ({ ...prev, criteria: [...prev.criteria, { ...EMPTY_CRITERION }] }));
  };

  const removeCriterion = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      criteria:
        prev.criteria.length > 1 ? prev.criteria.filter((_, i) => i !== index) : prev.criteria,
    }));
  };

  const updateReminder = (
    index: number,
    field: keyof DraftReminder,
    value: string | number | boolean,
  ) => {
    setDraft((prev) => {
      const reminders = prev.reminders.map((r, i) =>
        i === index ? ({ ...r, [field]: value } as DraftReminder) : r,
      );
      return { ...prev, reminders };
    });
  };

  const addReminder = () => {
    setDraft((prev) => ({ ...prev, reminders: [...prev.reminders, { ...EMPTY_REMINDER }] }));
  };

  const removeReminder = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      reminders:
        prev.reminders.length > 1 ? prev.reminders.filter((_, i) => i !== index) : prev.reminders,
    }));
  };

  const toggleWeekday = (day: string) => {
    setDraft((prev) => {
      const current = prev.recurrenceRepeatsOn;
      const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
      return { ...prev, recurrenceRepeatsOn: updated };
    });
  };

  const goNext = () => {
    if (!isLastStep) setCurrentStep((prev) => prev + 1);
  };

  const goBack = () => {
    if (!isFirstStep) setCurrentStep((prev) => prev - 1);
  };

  const handleFinish = () => {
    setApiError(undefined);
    setFormErrors({});

    const schema = getScheduleEventSchema(t);
    const result = schema.safeParse(draft);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors as Partial<
        Record<keyof ScheduleEventDraft, string[]>
      >;
      const mapped: ScheduleFormErrors = {};

      Object.entries(fieldErrors).forEach(([key, errors]) => {
        if (errors?.[0]) {
          mapped[key as keyof ScheduleFormErrors] = errors[0];
        }
      });

      setFormErrors(mapped);

      if (
        mapped.eventTypeId ||
        mapped.campaignId ||
        mapped.commandId ||
        mapped.mediaId ||
        mapped.playlistId
      ) {
        setCurrentStep(0);
      } else if (mapped.displayGroupIds) {
        setCurrentStep(1);
      } else if (mapped.dayPartId || mapped.relativeHours || mapped.toDt || mapped.fromDt) {
        setCurrentStep(2);
      }
      return;
    }

    const eventTypeId = draft.eventTypeId!;
    const displayGroupIds = draft.displayGroupIds.map(Number);

    startTransition(async () => {
      try {
        const filteredCriteria = draft.criteria.filter((c) => c.type && c.metric);
        const filteredReminders = draft.reminders.filter((r) => r.value > 0);

        await createEvent({
          eventTypeId,
          displayGroupIds,
          dayPartId: Number(draft.dayPartId),

          ...(eventTypeId === EventTypeId.Media && draft.mediaId ? { mediaId: draft.mediaId } : {}),
          ...(eventTypeId === EventTypeId.Playlist && draft.playlistId
            ? { playlistId: draft.playlistId }
            : {}),
          ...([
            EventTypeId.Layout,
            EventTypeId.Overlay,
            EventTypeId.Interrupt,
            EventTypeId.Campaign,
          ].includes(eventTypeId) && draft.campaignId
            ? { campaignId: draft.campaignId }
            : {}),
          ...(eventTypeId === EventTypeId.Command && draft.commandId
            ? { commandId: draft.commandId }
            : {}),

          ...(isCustomDaypart && draft.useRelativeTime
            ? (() => {
                const now = new Date();
                const end = new Date(now);
                end.setHours(end.getHours() + draft.relativeHours);
                end.setMinutes(end.getMinutes() + draft.relativeMinutes);
                end.setSeconds(end.getSeconds() + draft.relativeSeconds);
                return { fromDt: now.toISOString(), toDt: end.toISOString() };
              })()
            : {
                ...(isCustomDaypart && draft.fromDt ? { fromDt: draft.fromDt } : {}),
                ...(isCustomDaypart && draft.toDt ? { toDt: draft.toDt } : {}),
              }),

          ...(!isCustomDaypart && !isAlwaysDaypart && draft.fromDt ? { fromDt: draft.fromDt } : {}),

          ...(draft.name ? { name: draft.name } : {}),
          ...(draft.resolutionId ? { resolutionId: Number(draft.resolutionId) } : {}),
          ...(draft.layoutDuration ? { layoutDuration: draft.layoutDuration } : {}),
          ...(draft.backgroundColor ? { backgroundColor: draft.backgroundColor } : {}),
          displayOrder: draft.displayOrder,
          isPriority: draft.isPriority,
          maxPlaysPerHour: draft.maxPlaysPerHour,
          syncTimezone: draft.syncTimezone ? 1 : 0,

          ...(draft.recurrenceType ? { recurrenceType: draft.recurrenceType } : {}),
          ...(draft.recurrenceType ? { recurrenceDetail: draft.recurrenceDetail } : {}),
          ...(draft.recurrenceType === 'Week' && draft.recurrenceRepeatsOn.length > 0
            ? { recurrenceRepeatsOn: draft.recurrenceRepeatsOn.map(Number) }
            : {}),
          ...(draft.recurrenceType === 'Month'
            ? { recurrenceMonthlyRepeatsOn: draft.recurrenceMonthlyRepeatsOn }
            : {}),
          ...(draft.recurrenceType && draft.recurrenceRange
            ? { recurrenceRange: draft.recurrenceRange }
            : {}),

          ...(filteredReminders.length > 0
            ? {
                scheduleReminders: filteredReminders.map((r) => ({
                  reminder_value: r.value,
                  reminder_type: r.type,
                  reminder_option: r.option,
                  reminder_isEmailHidden: r.isEmail ? 1 : 0,
                })),
              }
            : {}),

          isGeoAware: draft.isGeoAware ? 1 : 0,

          ...(filteredCriteria.length > 0 ? { criteria: filteredCriteria } : {}),
        });

        notify.success(t('Added Event'));
        onClose();
      } catch (error) {
        setApiError(
          error instanceof Error ? error.message : t('An error occurred while saving the event.'),
        );
      }
    });
  };

  const handleClose = () => {
    setCurrentStep(initialStep);
    setDraft(createInitialDraft(prefilledEventTypeId, contentId));
    setOptionalTab('general');
    setShowDisplayBanner(false);
    setFormErrors({});
    onClose();
  };

  const actions: ModalAction[] = (() => {
    const result: ModalAction[] = [
      {
        label: t('Cancel'),
        onClick: handleClose,
        variant: 'secondary',
        className: 'mr-auto',
      },
    ];

    if (!isFirstStep) {
      result.push({
        label: t('Back'),
        onClick: goBack,
        variant: 'link',
        leftIcon: ArrowLeft,
      });
    }

    if (!isLastStep) {
      result.push({
        label: t('Next'),
        onClick: goNext,
        variant: canFinish ? 'link' : 'primary',
        rightIcon: canFinish ? ArrowRight : undefined,
        disabled: !isStepValid,
      });
    }

    if (canFinish) {
      result.push({
        label: isPending ? t('Saving...') : t('Finish'),
        onClick: handleFinish,
        variant: 'primary',
        disabled: isPending || !isStepValid,
      });
    }

    return result;
  })();

  const getTabClass = (tab: OptionalTab) =>
    `px-4 py-2 text-sm font-medium border-b-2 ${
      optionalTab === tab
        ? 'border-xibo-blue-600 text-xibo-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  const contentField = getContentFieldConfig(draft.eventTypeId, t);
  const contentHelpText = getContentHelpText(draft.eventTypeId, t);

  const prefilledOption = getPrefilledOption(contentId, contentName);
  const mergedContentOptions =
    prefilledOption && !contentOptions.some((o) => o.value === prefilledOption.value)
      ? [prefilledOption, ...contentOptions]
      : contentOptions;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('Schedule Event')}
      size="lg"
      scrollable={false}
      actions={actions}
      isPending={isPending}
      error={apiError}
      className="min-h-[90vh]"
    >
      <div className="flex flex-col flex-1 min-h-0 max-h-full">
        {/* Stepper */}
        <div className="shrink-0 px-8">
          <Stepper steps={steps} activeIndex={currentStep} />
        </div>

        {/* Info Banners */}
        {currentStep === 1 && hasDisplays && showDisplayBanner && (
          <div className="shrink-0 mx-8 mt-4">
            <InfoBanner type="success">
              {t("You're all set! Click")} <strong>{t('Finish')}</strong>{' '}
              {t("to create an 'Always Schedule', or")} <strong>{t('Next')}</strong>{' '}
              {t('to choose times.')}
            </InfoBanner>
          </div>
        )}
        {currentStep === 2 && (
          <div className="shrink-0 mx-8 mt-4">
            <InfoBanner type="success">
              {t('Click')} <strong>{t('Finish')}</strong> {t('to complete schedule or click')}{' '}
              <strong>{t('Next')}</strong> {t('to customized settings.')}
            </InfoBanner>
          </div>
        )}
        {currentStep === 3 && (
          <div className="shrink-0 mx-8 mt-4">
            <InfoBanner type="success">
              {t("You're all set! Simply click")} <strong>{t('Finish')}</strong>{' '}
              {t('to complete schedule or optional criteria.')}
            </InfoBanner>
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-8 py-4">
          {/* ── Step 1: Content ── */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <SelectDropdown
                label={t('Event Type')}
                value={draft.eventTypeId ? String(draft.eventTypeId) : ''}
                options={EVENT_TYPE_OPTIONS}
                onSelect={(value) => updateDraft('eventTypeId', Number(value) as EventTypeId)}
                placeholder={t('Select Event Type')}
                error={formErrors.eventTypeId}
              />

              {contentField && (
                <SelectDropdown
                  label={contentField.label}
                  value={getContentValue(draft)}
                  options={mergedContentOptions}
                  onSelect={(value) => {
                    const typeId = draft.eventTypeId;
                    if (typeId === EventTypeId.Media) updateDraft('mediaId', Number(value));
                    else if (typeId === EventTypeId.Playlist)
                      updateDraft('playlistId', Number(value));
                    else if (typeId === EventTypeId.Command)
                      updateDraft('commandId', Number(value));
                    else updateDraft('campaignId', Number(value));
                  }}
                  placeholder={contentField.placeholder}
                  helpText={contentHelpText}
                  searchable
                  isLoading={isLoadingContent}
                  error={
                    formErrors.campaignId ||
                    formErrors.commandId ||
                    formErrors.mediaId ||
                    formErrors.playlistId
                  }
                />
              )}
            </div>
          )}

          {/* ── Step 2: Displays ── */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <MultiSelectDropdown
                label={t('Display')}
                value={draft.displayGroupIds}
                options={displayGroupOptions}
                onChange={(values) => updateDraft('displayGroupIds', values)}
                placeholder={t('Select Displays/Groups')}
                helpText={t(
                  'Please select one or more Displays/Groups for this event to be shown on.',
                )}
                showTags
                onDropdownClose={() => setShowDisplayBanner(draft.displayGroupIds.length > 0)}
                error={formErrors.displayGroupIds}
              />
            </div>
          )}

          {/* ── Step 3: Time ── */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <SelectDropdown
                label={t('Dayparting')}
                value={draft.dayPartId}
                options={daypartOptions}
                onSelect={(value) => updateDraft('dayPartId', value)}
                placeholder={t('Select Daypart')}
                helpText={t(
                  'Select how this event recurs. Choose Always for continuous playback or Custom to define specific times.',
                )}
                error={formErrors.dayPartId}
              />

              {/* Named daypart: Start Time only (date, no time picker) */}
              {isNamedDaypart && (
                <DatePickerInput
                  label={t('Start Time')}
                  value={draft.fromDt}
                  onChange={(value) => updateDraft('fromDt', value)}
                  helpText={t('Select the start time for this event.')}
                  showTimePicker={false}
                />
              )}

              {/* Custom daypart: Start + End Time (or relative time) */}
              {isCustomDaypart && !draft.useRelativeTime && (
                <div className="grid grid-cols-2 gap-4">
                  <DatePickerInput
                    label={t('Start Time')}
                    value={draft.fromDt}
                    onChange={(value) => updateDraft('fromDt', value)}
                  />
                  <DatePickerInput
                    label={t('End Time')}
                    value={draft.toDt}
                    onChange={(value) => updateDraft('toDt', value)}
                  />
                </div>
              )}

              {/* Use Relative Time — only for Custom daypart */}
              {isCustomDaypart && (
                <div className="bg-gray-50 py-3">
                  <Checkbox
                    id="useRelativeTime"
                    checked={draft.useRelativeTime}
                    onChange={(e) => updateDraft('useRelativeTime', e.target.checked)}
                    title={t('Use Relative Time')}
                    label={t('Duration-based offsets')}
                    className="px-3 py-2.5"
                  />

                  {/* Relative time fields */}
                  {draft.useRelativeTime && (
                    <div className="flex flex-col px-3 gap-2.5">
                      {(draft.relativeHours > 0 ||
                        draft.relativeMinutes > 0 ||
                        draft.relativeSeconds > 0) && (
                        <div className="flex items-center gap-2 text-sm  bg-gray-100 rounded-lg p-3">
                          <CalendarClock className="h-3.5 w-3.5 text-gray-500" />
                          <span className="font-medium text-sm text-gray-500">
                            {t('Event Schedule:')}
                          </span>
                          <span className="text-gray-800">
                            {(() => {
                              const now = new Date();
                              const end = new Date(now);
                              end.setHours(end.getHours() + draft.relativeHours);
                              end.setMinutes(end.getMinutes() + draft.relativeMinutes);
                              end.setSeconds(end.getSeconds() + draft.relativeSeconds);
                              return `${now.toLocaleString()} - ${end.toLocaleString()}`;
                            })()}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400">
                        {t("Total duration for this event in each Display's local time zone.")}
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <NumberInput
                          name="relativeHours"
                          label={t('Hours')}
                          value={draft.relativeHours}
                          onChange={(num) => updateDraft('relativeHours', num)}
                          error={formErrors.relativeHours}
                        />
                        <NumberInput
                          name="relativeMinutes"
                          label={t('Minutes')}
                          value={draft.relativeMinutes}
                          onChange={(num) => updateDraft('relativeMinutes', num)}
                        />
                        <NumberInput
                          name="relativeSeconds"
                          label={t('Seconds')}
                          value={draft.relativeSeconds}
                          onChange={(num) => updateDraft('relativeSeconds', num)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Optional ── */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Sub-tabs */}
              <nav className="flex border-b border-gray-200">
                <button
                  type="button"
                  className={getTabClass('general')}
                  onClick={() => setOptionalTab('general')}
                >
                  {t('General')}
                </button>
                {showRepeatReminder && (
                  <>
                    <button
                      type="button"
                      className={getTabClass('repeats')}
                      onClick={() => setOptionalTab('repeats')}
                    >
                      {t('Repeats')}
                    </button>
                    <button
                      type="button"
                      className={getTabClass('reminder')}
                      onClick={() => setOptionalTab('reminder')}
                    >
                      {t('Reminder')}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className={getTabClass('geoLocation')}
                  onClick={() => setOptionalTab('geoLocation')}
                >
                  {t('Geo Location')}
                </button>
                <button
                  type="button"
                  className={getTabClass('criteria')}
                  onClick={() => setOptionalTab('criteria')}
                >
                  {t('Criteria')}
                </button>
              </nav>

              {/* General tab */}
              {optionalTab === 'general' && (
                <div className="space-y-4">
                  <TextInput
                    name="name"
                    label={t('Name')}
                    value={draft.name}
                    placeholder={t('Enter Name')}
                    onChange={(value) => updateDraft('name', value)}
                    helpText={t('Optional Name for this Event (1-50 characters)')}
                  />
                  {isScheduleMode && (
                    <>
                      <NumberInput
                        name="layoutDuration"
                        label={t('Duration in loop')}
                        value={draft.layoutDuration}
                        onChange={(num) => updateDraft('layoutDuration', num)}
                        helpText={t(
                          'Set how long this item should be shown each time it appears in the schedule. Leave blank to use the Media Duration set in the Library.',
                        )}
                      />
                      <SelectDropdown
                        label={t('Resolution')}
                        value={draft.resolutionId}
                        options={resolutionOptions}
                        onSelect={(value) => updateDraft('resolutionId', value)}
                        placeholder={t('Select Resolution')}
                        helpText={t(
                          'Optionally select a Resolution to use for the selected Media. Leave blank to match with an existing Resolution closest in size to the selected media.',
                        )}
                        clearable
                      />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-500">
                          {t('Background Colour')}
                        </label>
                        <div className="flex items-center h-11.25 border border-gray-200 rounded-lg overflow-hidden">
                          <input
                            type="color"
                            value={draft.backgroundColor}
                            onChange={(e) => updateDraft('backgroundColor', e.target.value)}
                            className="h-full w-12 border-0 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={draft.backgroundColor}
                            onChange={(e) => updateDraft('backgroundColor', e.target.value)}
                            className="flex-1 py-2 px-3 text-sm outline-none border-none"
                          />
                        </div>
                        <p className="text-xs text-gray-400">
                          {t(
                            'Optionally set a colour to use as a background for if the item selected does not fill the entire screen.',
                          )}
                        </p>
                      </div>
                    </>
                  )}
                  <NumberInput
                    name="displayOrder"
                    label={t('Display Order')}
                    value={draft.displayOrder}
                    onChange={(num) => updateDraft('displayOrder', num)}
                    helpText={t(
                      'Please select the order this event should appear in relation to others when there is more than one event scheduled.',
                    )}
                  />
                  <NumberInput
                    name="isPriority"
                    label={t('Priority')}
                    value={draft.isPriority}
                    placeholder={t('Select')}
                    onChange={(num) => updateDraft('isPriority', num)}
                    helpText={t(
                      'Sets the event priority - events with the highest priority play in preference to lower priority events.',
                    )}
                  />
                  <NumberInput
                    name="maxPlaysPerHour"
                    label={t('Maximum plays/hour')}
                    value={draft.maxPlaysPerHour}
                    placeholder={t('Select')}
                    onChange={(num) => updateDraft('maxPlaysPerHour', num)}
                    helpText={t(
                      'Limit the number of times this event will play per hour on each display. For unlimited plays set to 0.',
                    )}
                  />
                  <Checkbox
                    id="syncTimezone"
                    checked={draft.syncTimezone}
                    onChange={(e) => updateDraft('syncTimezone', e.target.checked)}
                    title={t('Run at CMS Time?')}
                    label={t(
                      'When selected, your event will run according to the timezone set on the CMS, otherwise the event will run at Display local time.',
                    )}
                  />
                </div>
              )}

              {/* Repeats tab */}
              {optionalTab === 'repeats' && (
                <div className="space-y-4">
                  <SelectDropdown
                    label={t('Repeats')}
                    value={draft.recurrenceType}
                    options={RECURRENCE_TYPE_OPTIONS}
                    onSelect={(value) => updateDraft('recurrenceType', value)}
                    placeholder={t('None')}
                    helpText={t('Select the type of Repeat required for this Event.')}
                  />

                  {draft.recurrenceType !== '' && (
                    <>
                      <NumberInput
                        name="recurrenceDetail"
                        label={t('Repeat every')}
                        value={draft.recurrenceDetail}
                        onChange={(num) => updateDraft('recurrenceDetail', num)}
                        helpText={t('How often does this event repeat?')}
                      />

                      {draft.recurrenceType === 'Week' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('Repeat on')}
                          </label>
                          <div className="flex gap-2">
                            {WEEKDAYS.map((day, index) => (
                              <button
                                key={day}
                                type="button"
                                className={`px-3 py-1.5 text-sm rounded-lg border ${
                                  draft.recurrenceRepeatsOn.includes(String(index + 1))
                                    ? 'bg-xibo-blue-600 text-white border-xibo-blue-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={() => toggleWeekday(String(index + 1))}
                              >
                                {t(day)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {draft.recurrenceType === 'Month' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('Repeats on')}
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="monthlyRepeat"
                                checked={draft.recurrenceMonthlyRepeatsOn === 0}
                                onChange={() => updateDraft('recurrenceMonthlyRepeatsOn', 0)}
                                className="text-xibo-blue-600"
                              />
                              <span className="text-sm">{t('Day of month')}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="monthlyRepeat"
                                checked={draft.recurrenceMonthlyRepeatsOn === 1}
                                onChange={() => updateDraft('recurrenceMonthlyRepeatsOn', 1)}
                                className="text-xibo-blue-600"
                              />
                              <span className="text-sm">{t('Day of week')}</span>
                            </label>
                          </div>
                        </div>
                      )}

                      <DatePickerInput
                        label={t('Until')}
                        value={draft.recurrenceRange}
                        onChange={(value) => updateDraft('recurrenceRange', value)}
                        helpText={t('Optionally select the date this event should stop repeating.')}
                      />
                    </>
                  )}
                </div>
              )}

              {/* Reminder tab */}
              {optionalTab === 'reminder' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    {t(
                      'Use the form fields below to create a set of reminders for this event. New fields can be added by clicking on the + icon at the end of the row. Use the tick box to receive a notification by email alternatively reminders will be shown in the message centre.',
                    )}
                  </p>

                  {draft.reminders.map((reminder, index) => (
                    <div
                      key={index}
                      className="grid  grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-2"
                    >
                      <NumberInput
                        name={`reminder-value-${index}`}
                        value={reminder.value}
                        onChange={(num) => updateReminder(index, 'value', num)}
                        className="w-24"
                      />
                      <SelectDropdown
                        value={String(reminder.type)}
                        options={REMINDER_TYPE_OPTIONS}
                        onSelect={(value) => updateReminder(index, 'type', Number(value))}
                      />
                      <SelectDropdown
                        value={String(reminder.option)}
                        options={REMINDER_OPTION_OPTIONS}
                        onSelect={(value) => updateReminder(index, 'option', Number(value))}
                      />
                      <Checkbox
                        id={`reminder-email-${index}`}
                        label={t('Notify by email?')}
                        checked={reminder.isEmail}
                        onChange={(e) => updateReminder(index, 'isEmail', e.target.checked)}
                      />
                      <button
                        type="button"
                        className="flex items-center justify-center size-9 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-100 shrink-0"
                        onClick={() =>
                          index === draft.reminders.length - 1
                            ? addReminder()
                            : removeReminder(index)
                        }
                      >
                        {index === draft.reminders.length - 1 ? (
                          <Plus size={16} />
                        ) : (
                          <Minus size={16} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Geo Location tab */}
              {optionalTab === 'geoLocation' && (
                <div className="space-y-4">
                  <Checkbox
                    id="isGeoAware"
                    checked={draft.isGeoAware}
                    onChange={(e) => updateDraft('isGeoAware', e.target.checked)}
                    title={t('Geo Schedule')}
                    label={t(
                      'Should this event be location aware? Enable this checkbox and select an area by drawing a polygon or rectangle layer on the map below.',
                    )}
                  />
                </div>
              )}

              {/* Criteria tab */}
              {optionalTab === 'criteria' && (
                <div className="space-y-4 p-5 bg-slate-50">
                  <div className="text-sm">
                    <p className="font-semibold  text-gray-800">
                      {t('Set criteria to limit when this event is active.')}
                    </p>
                    <p className=" text-gray-500">
                      {t(
                        '*If you add multiple conditions, all must be true for the event to trigger. Leave blank to play at all times.',
                      )}
                    </p>
                  </div>
                  <div className="">
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-sm font-medium text-gray-700 mb-1">
                      <span>{t('Type')}</span>
                      <span>{t('Metric')}</span>
                      <span>{t('Condition')}</span>
                      <span>{t('Value')}</span>
                      <span className="w-9" />
                    </div>

                    {/* Criteria rows */}
                    {draft.criteria.map((criterion, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center mb-2.5"
                      >
                        <SelectDropdown
                          value={criterion.type}
                          options={CRITERIA_TYPE_OPTIONS}
                          onSelect={(value) => updateCriterion(index, 'type', value)}
                          placeholder={t('Select Type')}
                          className="w-full"
                        />
                        <TextInput
                          name={`metric-${index}`}
                          value={criterion.metric}
                          placeholder={t('Enter Metric')}
                          onChange={(value) => updateCriterion(index, 'metric', value)}
                          className="w-full"
                        />
                        <SelectDropdown
                          value={criterion.condition}
                          options={CONDITION_OPTIONS}
                          onSelect={(value) => updateCriterion(index, 'condition', value)}
                          placeholder={t('Is set')}
                          className="w-full"
                        />
                        <TextInput
                          name={`value-${index}`}
                          value={criterion.value}
                          placeholder={t('Enter Value')}
                          onChange={(value) => updateCriterion(index, 'value', value)}
                          className="w-full"
                        />
                        <button
                          type="button"
                          className="flex items-center justify-center size-9 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-100"
                          onClick={() =>
                            index === draft.criteria.length - 1
                              ? addCriterion()
                              : removeCriterion(index)
                          }
                        >
                          {index === draft.criteria.length - 1 ? (
                            <Plus size={16} />
                          ) : (
                            <Minus size={16} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
