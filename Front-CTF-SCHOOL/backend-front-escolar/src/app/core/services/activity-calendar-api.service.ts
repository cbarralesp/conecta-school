import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_CONFIG } from '../constants/api.config';
import {
  ActivityCalendar,
  CreateSchoolActivityRequest,
  SchoolActivity
} from '../models/activity-calendar.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class ActivityCalendarApiService {
  private readonly http = inject(HttpClient);

  getCalendar(year: number, month: number): Observable<ActivityCalendar> {
    return this.http
      .get<ActivityCalendar>(`${API_CONFIG.baseUrl}/activities/calendar`, {
        params: { year, month }
      })
      .pipe(map((calendar) => this.normalizeCalendar(calendar)));
  }

  createActivity(payload: CreateSchoolActivityRequest): Observable<SchoolActivity> {
    return this.http
      .post<SchoolActivity>(`${API_CONFIG.baseUrl}/activities`, payload)
      .pipe(map((activity) => this.normalizeActivity(activity)));
  }

  updateActivity(activityId: number, payload: CreateSchoolActivityRequest): Observable<SchoolActivity> {
    return this.http
      .put<SchoolActivity>(`${API_CONFIG.baseUrl}/activities/${activityId}`, payload)
      .pipe(map((activity) => this.normalizeActivity(activity)));
  }

  deleteActivity(activityId: number): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/activities/${activityId}`);
  }

  private normalizeCalendar(calendar: ActivityCalendar): ActivityCalendar {
    return {
      ...calendar,
      monthLabel: normalizeDashboardText(calendar.monthLabel),
      summary: {
        total: calendar.summary?.total ?? calendar.monthlyActivities.length,
        thisMonth: calendar.summary?.thisMonth ?? calendar.monthlyActivities.length,
        upcoming: calendar.summary?.upcoming ?? calendar.upcomingActivities.length,
        completed: calendar.summary?.completed ?? 0
      },
      days: (calendar.days ?? []).map((day) => ({
        ...day,
        activities: day.activities.map((activity) => this.normalizeActivity(activity))
      })),
      monthlyActivities: calendar.monthlyActivities.map((activity) => this.normalizeActivity(activity)),
      upcomingActivities: calendar.upcomingActivities.map((activity) => this.normalizeActivity(activity)),
      activityTypes: calendar.activityTypes.map((type) => ({
        ...type,
        code: normalizeDashboardText(type.code),
        name: normalizeDashboardText(type.name),
        description: normalizeDashboardText(type.description),
        icon: normalizeDashboardText(type.icon)
      }))
    };
  }

  private normalizeActivity(activity: SchoolActivity): SchoolActivity {
    return {
      ...activity,
      activityTypeCode: normalizeDashboardText(activity.activityTypeCode),
      activityTypeName: normalizeDashboardText(activity.activityTypeName),
      title: normalizeDashboardText(activity.title),
      description: normalizeDashboardText(activity.description),
      location: normalizeDashboardText(activity.location),
      icon: normalizeDashboardText(activity.icon)
    };
  }
}
