import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { EnrollmentCourseOption, EnrollmentDetail, EnrollmentDocument } from '../../../core/models/enrollment.models';
import { normalizeCourseDisplayName } from '../../../core/constants/course-levels';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

interface DocumentPreviewState {
  document: EnrollmentDocument;
  url: string;
  kind: 'image' | 'pdf' | 'download';
}

@Component({
  selector: 'app-enrollment-detail-page',
  imports: [
    RouterLink,
    MatIconModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './enrollment-detail-page.component.html',
  styleUrl: './enrollment-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly enrollmentApiService = inject(EnrollmentApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authStateService.user;
  readonly enrollmentId = Number(this.route.snapshot.paramMap.get('id'));
  readonly detail = signal<EnrollmentDetail | null>(null);
  readonly courses = signal<EnrollmentCourseOption[]>([]);
  readonly isLoading = signal(true);
  readonly documentPreview = signal<DocumentPreviewState | null>(null);
  readonly isPreviewLoading = signal(false);

  readonly fullName = computed(() => {
    const student = this.detail();
    return student ? `${student.studentName} ${student.studentLastName}`.trim() : '';
  });

  readonly avatar = computed(() => {
    const student = this.detail();
    if (!student) {
      return '--';
    }
    return `${student.studentName.charAt(0)}${student.studentLastName.charAt(0)}`.toUpperCase();
  });

  readonly ageLabel = computed(() => {
    const student = this.detail();
    if (!student?.birthDate) {
      return '-';
    }
    const birth = new Date(`${student.birthDate}T00:00:00`);
    if (Number.isNaN(birth.getTime())) {
      return '-';
    }
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return `${age} ${age === 1 ? 'Año' : 'Años'}`;
  });

  readonly formattedBirthDate = computed(() => {
    const student = this.detail();
    if (!student?.birthDate) {
      return '-';
    }
    const birth = new Date(`${student.birthDate}T00:00:00`);
    if (Number.isNaN(birth.getTime())) {
      return student.birthDate;
    }
    return `${birth.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })} (${this.ageLabel()})`;
  });

  readonly statusBadgeLabel = computed(() => {
    const student = this.detail();
    const status = `${student?.status ?? 'ACTIVO'}`.trim().toUpperCase();
    if (status === 'PENDIENTE') {
      return 'Pendiente';
    }
    if (this.isInactiveStatus(status)) {
      return 'Inactiva';
    }
    return 'Activa';
  });
  readonly statusBadgeClass = computed(() => {
    const status = `${this.detail()?.status ?? 'ACTIVO'}`.trim().toUpperCase();
    if (status === 'PENDIENTE') {
      return 'status-badge-large status-badge-large--pending';
    }
    if (this.isInactiveStatus(status)) {
      return 'status-badge-large status-badge-large--inactive';
    }
    return 'status-badge-large';
  });

  readonly documents = computed(() => this.detail()?.documents ?? []);
  readonly selectedDocumentSectionKey = signal('identity');
  readonly documentSections = [
    {
      key: 'identity',
      title: 'Identidad',
      icon: 'badge',
      documents: [
        { key: 'birth-certificate', title: 'Certificado de nacimiento', description: 'Copia reciente o digitalizada.' },
        { key: 'student-id', title: 'Cedula de identidad del alumno', description: 'Ambos lados, vigente.' },
        { key: 'guardian-id', title: 'Cedula del apoderado', description: 'Documento de identidad del apoderado principal.' },
        { key: 'legal-custody', title: 'Tutela o resolucion judicial', description: 'Solo si existe tutela legal o condicion especial.' }
      ]
    },
    {
      key: 'academic',
      title: 'Academico',
      icon: 'workspace_premium',
      documents: [
        { key: 'study-certificate', title: 'Certificado de estudios', description: 'Documento del año anterior o último curso aprobado.' },
        { key: 'behavior-report', title: 'Informe de personalidad o conducta', description: 'Emitido por el establecimiento anterior, si aplica.' },
        { key: 'report-card', title: 'Boletín de notas', description: 'Apoya la asignación de curso.' },
        { key: 'pie-certificate', title: 'Certificado PIE o NEE', description: 'Diagnostico de necesidades educativas especiales.' }
      ]
    },
    {
      key: 'medical',
      title: 'Medicos',
      icon: 'health_and_safety',
      documents: [
        { key: 'vaccination-card', title: 'Carne de vacunacion', description: 'Registro de vacunas del estudiante.' },
        { key: 'health-record', title: 'Ficha de salud escolar', description: 'Antecedentes medicos relevantes.' },
        { key: 'medical-report', title: 'Informe medico o diagnostico', description: 'Alergias, tratamientos o condicion cronica.' },
        { key: 'medical-authorization', title: 'Autorización de atención médica', description: 'Permiso para actuar ante emergencias.' }
      ]
    },
    {
      key: 'other',
      title: 'Otros',
      icon: 'folder_special',
      documents: [
        { key: 'contract', title: 'Contrato', description: 'Documento contractual de matricula, si corresponde.' },
        { key: 'commitment-letter', title: 'Carta compromiso', description: 'Acuerdos o compromisos firmados por el apoderado.' },
        { key: 'image-consent', title: 'Consentimiento imagenes', description: 'Autorizacion para uso de imagenes en actividades o material institucional.' },
        { key: 'interview', title: 'Entrevista', description: 'Registro de entrevista de admision, convivencia o seguimiento.' },
        { key: 'simple-power', title: 'Poder simple', description: 'Autorizacion simple para representacion o tramites especificos.' },
        { key: 'payment-receipt', title: 'Boleta', description: 'Comprobante de pago o respaldo administrativo.' },
        { key: 'other', title: 'Otros', description: 'Cualquier otro documento complementario de la matrícula.' }
      ]
    }
  ] as const;
  readonly documentsByKey = computed(() => new Map(this.documents().map((document) => [document.documentKey, document])));
  readonly selectedDocumentSection = computed(
    () => this.documentSections.find((section) => section.key === this.selectedDocumentSectionKey()) ?? this.documentSections[0]
  );
  readonly selectedCourseOption = computed(() => {
    const detail = this.detail();
    if (!detail) {
      return null;
    }

    return this.courses().find((course) => course.id === detail.courseId) ?? null;
  });
  readonly selectedCourseName = computed(() => {
    const course = this.selectedCourseOption();
    if (course) {
      return normalizeCourseDisplayName(course.name, course.letter);
    }

    return this.detail()?.courseName ?? 'Curso sin asignar';
  });
  readonly courseSnapshot = computed(() => {
    const detail = this.detail();
    const selectedCourse = this.selectedCourseOption();

    if (!detail) {
      return null;
    }

    const rawCourseName = (selectedCourse?.name || detail.courseName || '').trim();
    const normalizedCourseName = selectedCourse
      ? normalizeCourseDisplayName(selectedCourse.name, selectedCourse.letter)
      : rawCourseName || 'Curso sin asignar';

    return {
      displayName: normalizedCourseName,
      level: selectedCourse?.level || this.inferCourseLevel(rawCourseName),
      letter: selectedCourse?.letter || this.inferCourseLetter(rawCourseName),
      schoolYear: selectedCourse?.schoolYear ? `${selectedCourse.schoolYear}` : this.extractSchoolYear(detail.enrollmentDate),
      scheduleType: selectedCourse?.scheduleType || 'Sin jornada'
    };
  });

  constructor() {
    this.loadDetail();
  }

  goToEdit(): void {
    void this.router.navigate(['/dashboard/matriculas', this.enrollmentId, 'editar']);
  }

  reactivateEnrollment(): void {
    this.enrollmentApiService.reactivate(this.enrollmentId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.snackBar.open('Matricula reactivada correctamente', 'Cerrar', {
          duration: 2500
        });
      },
      error: (error: HttpErrorResponse) => {
        this.showError(error, 'No fue posible reactivar la matricula');
      }
    });
  }

  printProfile(): void {
    window.print();
  }

  openSchedule(): void {
    void this.router.navigate(['/dashboard/horario']);
  }

  downloadPdf(): void {
    this.snackBar.open('La descarga PDF quedo preparada para la siguiente iteracion', 'Cerrar', {
      duration: 2500
    });
  }

  shareData(): void {
    const student = this.detail();
    if (!student) {
      return;
    }

    const body = [
      `Estudiante: ${student.studentName} ${student.studentLastName}`,
      `RUN: ${student.studentRun}`,
      `Curso: ${student.courseName}`,
      `Apoderado: ${student.guardian.name} ${student.guardian.lastName}`,
      `Teléfono: ${student.guardian.phone}`
    ].join('%0D%0A');

    window.location.href = `mailto:${student.guardian.email}?subject=Ficha%20del%20estudiante&body=${body}`;
  }

  selectDocumentSection(sectionKey: string): void {
    this.selectedDocumentSectionKey.set(sectionKey);
  }

  documentForKey(documentKey: string): EnrollmentDocument | null {
    const documentsByKey = this.documentsByKey();
    return documentsByKey.get(documentKey)
      ?? this.legacyDocumentAliases(documentKey)
        .map((legacyKey) => documentsByKey.get(legacyKey))
        .find((document): document is EnrollmentDocument => !!document)
      ?? null;
  }

  openDocument(document: EnrollmentDocument | null): void {
    if (!document?.id || !this.detail()) {
      return;
    }
    this.closeDocumentPreview();
    this.isPreviewLoading.set(true);
    this.enrollmentApiService.downloadDocumentBlob(this.enrollmentId, document.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.documentPreview.set({
          document,
          url,
          kind: this.resolvePreviewKind(document, blob)
        });
        this.isPreviewLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isPreviewLoading.set(false);
        this.showError(error, 'No fue posible abrir el documento');
      }
    });
  }

  closeDocumentPreview(): void {
    const preview = this.documentPreview();
    if (preview?.url) {
      URL.revokeObjectURL(preview.url);
    }
    this.documentPreview.set(null);
  }

  openPreviewInNewTab(): void {
    const preview = this.documentPreview();
    if (!preview?.document.id) {
      return;
    }
    window.open(
      this.enrollmentApiService.documentPreviewUrl(this.enrollmentId, preview.document.id),
      '_blank',
      'noopener'
    );
  }

  downloadPreviewDocument(): void {
    const preview = this.documentPreview();
    if (!preview) {
      return;
    }
    const link = window.document.createElement('a');
    link.href = preview.url;
    link.download = preview.document.fileName || 'documento';
    link.click();
  }

  downloadDocument(document: EnrollmentDocument | null): void {
    if (!document?.id || !this.detail()) {
      return;
    }
    this.enrollmentApiService.downloadDocumentBlob(this.enrollmentId, document.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.fileName || 'documento';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (error: HttpErrorResponse) => {
        this.showError(error, 'No fue posible descargar el documento');
      }
    });
  }

  sectionReceivedCount(section: typeof this.documentSections[number]): number {
    return section.documents.filter((item) => this.documentForKey(item.key)?.fileName?.trim()).length;
  }

  documentMeta(document: EnrollmentDocument | null): string {
    if (!document?.fileName) {
      return 'Pendiente de carga';
    }
    const parts = [
      document.mimeType ? this.readableMimeType(document.mimeType) : '',
      this.formatBytes(document.sizeBytes ?? null)
    ].filter(Boolean);
    return parts.join(' · ') || 'Archivo recibido';
  }

  documentLabel(document: EnrollmentDocument): string {
    return this.humanizeDocumentKey(document.documentKey) || document.fileName || 'Documento';
  }

  documentStatus(document: EnrollmentDocument): string {
    return document.fileName?.trim() ? 'Recibido' : 'Pendiente';
  }

  documentStatusClass(document: EnrollmentDocument): string {
    return document.fileName?.trim() ? 'doc-status doc-status--received' : 'doc-status doc-status--pending';
  }

  documentIcon(document: EnrollmentDocument): string {
    return document.fileName?.trim() ? 'check_circle' : 'error';
  }

  documentIconClass(document: EnrollmentDocument): string {
    return document.fileName?.trim() ? 'doc-icon doc-icon--received' : 'doc-icon doc-icon--pending';
  }

  slotStatusClass(document: EnrollmentDocument | null): string {
    return document?.fileName?.trim() ? 'doc-status doc-status--received' : 'doc-status doc-status--optional';
  }

  slotStatus(document: EnrollmentDocument | null): string {
    return document?.fileName?.trim() ? 'Recibido' : 'Opcional';
  }

  private loadDetail(): void {
    this.enrollmentApiService.getOverview().subscribe({
      next: (overview) => {
        this.courses.set(overview.courses);
        this.enrollmentApiService.getById(this.enrollmentId).subscribe({
          next: (detail) => {
            this.detail.set(detail);
            this.isLoading.set(false);
          },
          error: (error: HttpErrorResponse) => {
            this.isLoading.set(false);
            this.showError(error, 'No fue posible cargar la ficha del estudiante');
          }
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar la ficha del estudiante');
      }
    });
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }

  private humanizeDocumentKey(key: string): string {
    return (key || '')
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private legacyDocumentAliases(documentKey: string): string[] {
    const aliases: Record<string, string[]> = {
      'image-consent': ['image-permission'],
      other: ['junaeb-sep', 'migratory-docs', 'priority-certificate']
    };

    return aliases[documentKey] ?? [];
  }

  private readableMimeType(mimeType: string): string {
    const normalized = mimeType.toLowerCase();
    if (normalized.includes('pdf')) {
      return 'PDF';
    }
    if (normalized.includes('image')) {
      return 'Imagen';
    }
    if (normalized.includes('word') || normalized.includes('document')) {
      return 'Word';
    }
    return mimeType;
  }

  private resolvePreviewKind(document: EnrollmentDocument, blob: Blob): DocumentPreviewState['kind'] {
    const mimeType = (document.mimeType || blob.type || '').toLowerCase();
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    if (mimeType.includes('pdf')) {
      return 'pdf';
    }
    return 'download';
  }

  private formatBytes(sizeBytes: number | null): string {
    if (!sizeBytes || sizeBytes <= 0) {
      return '';
    }
    if (sizeBytes < 1024 * 1024) {
      return `${Math.ceil(sizeBytes / 1024)} KB`;
    }
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private inferCourseLevel(courseName: string): string {
    const normalized = (courseName || '').toUpperCase();
    if (normalized.includes('PREK')) {
      return 'Inicial';
    }
    if (normalized.includes('KIND')) {
      return 'Inicial';
    }
    if (normalized.includes('MEDIO')) {
      return 'Medio';
    }
    if (normalized.includes('BASICO') || normalized.includes('BÁSICO')) {
      return 'Básico';
    }
    return 'Sin nivel';
  }

  private inferCourseLetter(courseName: string): string {
    const parts = (courseName || '').trim().split(/\s+/);
    const lastPart = parts.at(-1) ?? '';
    return /^[A-F]$/i.test(lastPart) ? lastPart.toUpperCase() : '-';
  }

  private extractSchoolYear(enrollmentDate: string): string {
    const match = /^(\d{4})-/.exec(enrollmentDate || '');
    return match?.[1] ?? '-';
  }

  private isInactiveStatus(status: string): boolean {
    return ['INACTIVA', 'INACTIVO'].includes((status || '').trim().toUpperCase());
  }
}
