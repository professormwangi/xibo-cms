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
import { z } from 'zod';

import { EventTypeId } from '@/types/event';

export const getScheduleEventSchema = (t: TFunction) =>
  z
    .object({
      eventTypeId: z.nativeEnum(EventTypeId, {
        required_error: t('Event Type is required'),
      }),

      mediaId: z.number().nullable(),
      campaignId: z.number().nullable(),
      commandId: z.number().nullable(),
      playlistId: z.number().nullable(),

      displayGroupIds: z
        .array(z.string())
        .min(1, t('Please select at least one Display or Display Group')),

      dayPartId: z.string().min(1, t('Dayparting is required')),

      fromDt: z.string().optional(),
      toDt: z.string().optional(),
      useRelativeTime: z.boolean(),
      relativeHours: z.number().min(0),
      relativeMinutes: z.number().min(0),
      relativeSeconds: z.number().min(0),

      name: z.string().max(50, t('Name must be less than 50 characters')).optional(),
      layoutDuration: z.number().min(0).optional(),
      resolutionId: z.string().optional(),
      backgroundColor: z.string().optional(),
      displayOrder: z.number().min(0),
      isPriority: z.number().min(0),
      maxPlaysPerHour: z.number().min(0),
      syncTimezone: z.boolean(),

      recurrenceType: z.string(),
      recurrenceDetail: z.number().min(1),
      recurrenceRepeatsOn: z.array(z.string()),
      recurrenceMonthlyRepeatsOn: z.number(),
      recurrenceRange: z.string(),

      reminders: z.array(
        z.object({
          value: z.number(),
          type: z.number(),
          option: z.number(),
          isEmail: z.boolean(),
        }),
      ),

      isGeoAware: z.boolean(),

      criteria: z.array(
        z.object({
          type: z.string(),
          metric: z.string(),
          condition: z.string(),
          value: z.string(),
        }),
      ),
    })
    .superRefine((data, ctx) => {
      const contentTypes = [
        EventTypeId.Layout,
        EventTypeId.Overlay,
        EventTypeId.Interrupt,
        EventTypeId.Campaign,
      ];

      if (contentTypes.includes(data.eventTypeId) && !data.campaignId) {
        ctx.addIssue({
          path: ['campaignId'],
          code: z.ZodIssueCode.custom,
          message: t('Please select a Layout or Campaign'),
        });
      }

      if (data.eventTypeId === EventTypeId.Command && !data.commandId) {
        ctx.addIssue({
          path: ['commandId'],
          code: z.ZodIssueCode.custom,
          message: t('Please select a Command'),
        });
      }

      if (data.eventTypeId === EventTypeId.Media && !data.mediaId) {
        ctx.addIssue({
          path: ['mediaId'],
          code: z.ZodIssueCode.custom,
          message: t('Please select a Media item'),
        });
      }

      if (data.eventTypeId === EventTypeId.Playlist && !data.playlistId) {
        ctx.addIssue({
          path: ['playlistId'],
          code: z.ZodIssueCode.custom,
          message: t('Please select a Playlist'),
        });
      }

      if (
        data.useRelativeTime &&
        (data.fromDt ||
          data.toDt ||
          data.relativeHours > 0 ||
          data.relativeMinutes > 0 ||
          data.relativeSeconds > 0)
      ) {
        if (data.relativeHours === 0 && data.relativeMinutes === 0 && data.relativeSeconds === 0) {
          ctx.addIssue({
            path: ['relativeHours'],
            code: z.ZodIssueCode.custom,
            message: t('Please set a duration greater than 0'),
          });
        }
      } else if (data.fromDt && data.toDt) {
        if (new Date(data.toDt) <= new Date(data.fromDt)) {
          ctx.addIssue({
            path: ['toDt'],
            code: z.ZodIssueCode.custom,
            message: t('End time must be after start time'),
          });
        }
      }
    });
