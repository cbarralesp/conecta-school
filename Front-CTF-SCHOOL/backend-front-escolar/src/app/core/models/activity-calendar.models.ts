export interface ActivityType {
  id: number;
  code: string;
  name: string;
  description: string;
  backgroundColor: string;
  textColor: string;
  icon: string;
}

export interface SchoolActivity {
  id: number;
  activityTypeId: number;
  activityTypeCode: string;
  activityTypeName: string;
  title: string;
  description: string;
  date: string;
  endDate: string | null;
  time: string | null;
  location: string | null;
  backgroundColor: string;
  textColor: string;
  icon: string;
}

export interface ActivityCalendar {
  year: number;
  month: number;
  monthLabel: string;
  monthlyActivities: SchoolActivity[];
  upcomingActivities: SchoolActivity[];
  activityTypes: ActivityType[];
}

export interface CreateSchoolActivityRequest {
  activityTypeId: number;
  title: string;
  description: string;
  date: string;
  endDate: string | null;
  time: string | null;
  location: string | null;
}
