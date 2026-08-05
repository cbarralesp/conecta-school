export interface StatisticsDistributionItem {
  label: string;
  value: number;
  tone: string;
}

export interface StatisticsPlanningSummary {
  completed: number;
  inProgress: number;
  pending: number;
}

export interface StatisticsCourse {
  id: number;
  name: string;
  students: number;
  teacher: string;
  averageAttendance: number;
  averageGrade: number;
  planningProgress: number;
  annotations: number;
  annotationDelta: number;
  attendanceDelta: number;
  gradeDelta: number;
  planningDelta: number;
  attendanceBreakdown: StatisticsDistributionItem[];
  attendanceSeries: number[];
  gradeSeries: Array<number | null>;
  planningSeries: number[];
  planningSummary: StatisticsPlanningSummary;
  annotationSeries: number[];
  evaluationsCount: number;
  publishedActivitiesCount: number;
  sharedResourcesCount: number;
  standoutStudentsCount: number;
}

export interface StatisticsLevel {
  id: string;
  courses: StatisticsCourse[];
}

export interface StatisticsResponse {
  periodLabel: string;
  chartLabels: string[];
  levels: StatisticsLevel[];
}
