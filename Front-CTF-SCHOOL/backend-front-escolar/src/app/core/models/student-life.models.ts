export type StudentLifeStatus = 'Activo' | 'Seguimiento' | 'Inactivo';
export type StudentLifeAlert = 'Alergia' | 'PIE' | 'Vision' | 'Asistencia' | 'Conductual';

export interface StudentLifeSummary {
  totalEstudiantes: number;
  conHojaActiva: number;
  enSeguimiento: number;
  conAlertas: number;
  entrevistasPendientes: number;
  documentosPorRevisar: number;
}

export interface StudentLifeCourseOption {
  id: number;
  name: string;
  schoolYear: number;
}

export interface StudentLifeListItem {
  id: number;
  studentId: number;
  nombre: string;
  run: string;
  curso: string;
  courseId: number;
  courseSchoolYear: number | null;
  apoderado: string;
  estado: StudentLifeStatus;
  alertas: StudentLifeAlert[];
  foto?: string;
  avatarTone: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';
}

export interface StudentLifePagination {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface StudentLifeOverview {
  summary: StudentLifeSummary;
  courses: StudentLifeCourseOption[];
  students: StudentLifeListItem[];
  pagination: StudentLifePagination;
}

export interface StudentLifeInterview {
  id: number;
  studentId: number;
  enrollmentId: number | null;
  date: string;
  time: string | null;
  type: 'Apoderado' | 'Estudiante' | 'Equipo';
  participants: string[];
  reason: string;
  responsible: string;
  responsibleRole: string;
  status: 'Realizada' | 'Programada' | 'Pendiente';
  summary: string;
  agreements: string;
}

export interface StudentLifeRecord {
  id: number;
  studentId: number;
  enrollmentId: number | null;
  date: string;
  time: string | null;
  type: 'Positiva' | 'Negativa' | 'Acuerdo';
  category: string;
  area: string;
  responsible: string;
  status: string;
  deadline: string;
  description: string;
}

export interface CreateStudentLifeInterviewPayload {
  studentId: number;
  enrollmentId?: number | null;
  date: string;
  time?: string | null;
  type: StudentLifeInterview['type'];
  participants: string[];
  reason: string;
  responsible: string;
  responsibleRole?: string;
  status?: StudentLifeInterview['status'];
  summary: string;
  agreements: string;
}

export interface CreateStudentLifeRecordPayload {
  studentId: number;
  enrollmentId?: number | null;
  date: string;
  time?: string | null;
  type: StudentLifeRecord['type'];
  category: string;
  area?: string;
  responsible?: string;
  status?: string;
  deadline?: string;
  description?: string;
}
