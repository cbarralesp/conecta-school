import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, debounceTime, merge, of, startWith, switchMap } from 'rxjs';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import {
  EnrollmentAccessPreview,
  EnrollmentCourseOption,
  EnrollmentDetail,
  EnrollmentGuardianAccess,
  EnrollmentPayload,
  EnrollmentStudentAccess
} from '../../../core/models/enrollment.models';
import { normalizeCourseDisplayName } from '../../../core/constants/course-levels';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';
import { LocationApiService } from '../../../core/services/location-api.service';
import { ChileCommune, ChileRegion } from '../../../core/models/location.models';

@Component({
  selector: 'app-enrollment-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './enrollment-form-page.component.html',
  styleUrl: './enrollment-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentFormPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly enrollmentApiService = inject(EnrollmentApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly locationApiService = inject(LocationApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  private readonly routeEnrollmentId = this.route.snapshot.paramMap.get('id');

  readonly user = this.authStateService.user;
  readonly enrollmentId = this.routeEnrollmentId ? Number(this.routeEnrollmentId) : null;
  readonly isEditMode = this.enrollmentId !== null && Number.isFinite(this.enrollmentId);
  readonly isCreateMode = !this.isEditMode;
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly currentStep = signal(1);
  readonly enrollmentStatus = signal('ACTIVO');
  readonly courses = signal<EnrollmentCourseOption[]>([]);
  readonly chileRegions = signal<ChileRegion[]>([]);
  readonly academicYearOptions = Array.from({ length: 4 }, (_, index) => `${new Date().getFullYear() + index}`);
  readonly createCourseBase = signal('');
  readonly createCourseLevel = signal('');
  readonly createCourseLetter = signal('');
  readonly createCourseSchedule = signal('');
  readonly studentUsernamePreview = signal('');
  readonly guardianUsernamePreview = signal('');
  readonly wizardSteps = [
    { id: 1, label: 'Estudiante', icon: 'badge' },
    { id: 2, label: 'Apoderado', icon: 'supervisor_account' },
    { id: 3, label: 'Retiro', icon: 'directions_car' },
    { id: 4, label: 'Establec.', icon: 'school' },
    { id: 5, label: 'Documentos', icon: 'folder_open' }
  ] as const;
  readonly pageTitle = computed(() => this.isEditMode ? 'Editar Matrícula' : 'Nueva Matrícula');
  readonly subtitle = computed(() =>
    this.isEditMode
      ? 'Actualizando información del estudiante'
      : 'Registrando información del estudiante'
  );
  readonly statusBadgeLabel = computed(() => {
    const status = this.enrollmentStatus();
    if (status === 'PENDIENTE') {
      return 'Pendiente';
    }
    if (this.isInactiveStatus(status)) {
      return 'Inactiva';
    }
    return 'Activa';
  });
  readonly statusBadgeClass = computed(() => {
    const status = this.enrollmentStatus();
    if (status === 'PENDIENTE') {
      return 'status-badge status-badge--pending';
    }
    if (this.isInactiveStatus(status)) {
      return 'status-badge status-badge--inactive';
    }
    return 'status-badge';
  });
  readonly selectedCourseOption = computed(() =>
    this.courses().find((course) => course.id === Number(this.form.controls.courseId.value)) ?? null
  );
  readonly selectedCourseName = computed(() =>
    this.selectedCourseOption()
      ? normalizeCourseDisplayName(this.selectedCourseOption()!.name, this.selectedCourseOption()!.letter)
      : 'Curso sin asignar'
  );
  readonly selectedCourseBaseName = computed(() => {
    const course = this.selectedCourseOption();
    return course ? this.baseCourseName(course) : '';
  });
  readonly selectedCourseLevel = computed(() => this.selectedCourseOption()?.level ?? '');
  readonly selectedCourseLetter = computed(() => this.selectedCourseOption()?.letter ?? '');
  readonly selectedCourseSchoolYear = computed(() => {
    const course = this.selectedCourseOption();
    return course ? `${course.schoolYear}` : '';
  });
  readonly selectedCourseScheduleType = computed(() => this.selectedCourseOption()?.scheduleType ?? '');
  readonly availableCourseBaseOptions = computed(() => {
    const unique = new Map<string, string>();
    for (const course of this.courses()) {
      const baseName = this.baseCourseName(course);
      if (!unique.has(baseName.toUpperCase())) {
        unique.set(baseName.toUpperCase(), baseName);
      }
    }
    return this.withSelectedCourseOption(Array.from(unique.values()), this.createCourseBase());
  });
  readonly availableLevelOptions = computed(() => {
    const selectedBase = this.createCourseBase().trim().toUpperCase();
    const source = this.courses().filter((course) =>
      !selectedBase || this.baseCourseName(course).trim().toUpperCase() === selectedBase
    );
    return this.withSelectedCourseOption(
      Array.from(new Map(source.map((course) => [course.level.toUpperCase(), course.level])).values()),
      this.createCourseLevel()
    );
  });
  readonly availableLetterOptions = computed(() => {
    const selectedBase = this.createCourseBase().trim().toUpperCase();
    const selectedLevel = this.createCourseLevel().trim().toUpperCase();
    const source = this.courses().filter((course) =>
      (!selectedBase || this.baseCourseName(course).trim().toUpperCase() === selectedBase) &&
      (!selectedLevel || course.level.trim().toUpperCase() === selectedLevel)
    );
    return this.withSelectedCourseOption(
      Array.from(new Map(source.map((course) => [course.letter.toUpperCase(), course.letter])).values()),
      this.createCourseLetter()
    );
  });
  readonly availableScheduleOptions = computed(() => {
    const selectedBase = this.createCourseBase().trim().toUpperCase();
    const selectedLevel = this.createCourseLevel().trim().toUpperCase();
    const selectedLetter = this.createCourseLetter().trim().toUpperCase();
    const source = this.courses().filter((course) =>
      (!selectedBase || this.baseCourseName(course).trim().toUpperCase() === selectedBase) &&
      (!selectedLevel || course.level.trim().toUpperCase() === selectedLevel) &&
      (!selectedLetter || course.letter.trim().toUpperCase() === selectedLetter)
    );
    return this.withSelectedCourseOption(
      Array.from(new Map(source.map((course) => [course.scheduleType.toUpperCase(), course.scheduleType])).values()),
      this.createCourseSchedule()
    );
  });
  readonly pickupRelationOptions = [
    'Madre',
    'Padre',
    'Tutor(a)',
    'Hermano(a) mayor',
    'Abuelo(a)',
    'Tio(a)',
    'Madrina / Padrino',
    'Vecino(a)',
    'Transportista escolar',
    'Otro'
  ] as const;
  readonly establishmentDependencyOptions = [
    'Municipal',
    'Particular Subvencionado',
    'Particular Pagado',
    'DAEM'
  ] as const;
  readonly uploadedDocuments = signal<Record<string, string>>({});
  readonly documentSections = [
    {
      title: 'Identidad y Registro Civil',
      documents: [
        { key: 'birth-certificate', icon: 'child_care', title: 'Certificado de nacimiento', description: 'Copia reciente o digitalizada.' },
        { key: 'student-id', icon: 'badge', title: 'Cédula de identidad del alumno', description: 'Ambos lados, vigente.' },
        { key: 'guardian-id', icon: 'contact_page', title: 'Cédula del apoderado', description: 'Documento de identidad del apoderado principal.' },
        { key: 'legal-custody', icon: 'gavel', title: 'Tutela o resolución judicial', description: 'Solo si existe tutela legal o condición especial.' }
      ]
    },
    {
      title: 'Historial Académico',
      documents: [
        { key: 'study-certificate', icon: 'workspace_premium', title: 'Certificado de estudios', description: 'Documento del año anterior o del último curso aprobado.' },
        { key: 'behavior-report', icon: 'fact_check', title: 'Informe de personalidad o conducta', description: 'Emitido por el establecimiento anterior, si aplica.' },
        { key: 'report-card', icon: 'bar_chart', title: 'Boletín de notas', description: 'Opcional para apoyar la asignación de curso.' },
        { key: 'pie-certificate', icon: 'extension', title: 'Certificado PIE o NEE', description: 'Diagnóstico de necesidades educativas especiales, si existe.' }
      ]
    },
    {
      title: 'Documentos Médicos',
      documents: [
        { key: 'vaccination-card', icon: 'vaccines', title: 'Carné de vacunación', description: 'Registro de vacunas del estudiante.' },
        { key: 'health-record', icon: 'health_and_safety', title: 'Ficha de salud escolar', description: 'Antecedentes médicos relevantes y cuidados generales.' },
        { key: 'medical-report', icon: 'clinical_notes', title: 'Informe médico o diagnóstico', description: 'Solo si presenta alergias, tratamiento o condición crónica.' },
        { key: 'medical-authorization', icon: 'description', title: 'Autorización de atención médica', description: 'Permiso para actuar ante emergencias.' }
      ]
    },
    {
      title: 'Otros Documentos',
      documents: [
        { key: 'junaeb-sep', icon: 'volunteer_activism', title: 'Comprobante JUNAEB o SEP', description: 'Si postula a beneficios o prioridad.' },
        { key: 'migratory-docs', icon: 'travel_explore', title: 'Visa o documentos migratorios', description: 'Solo si corresponde a estudiante extranjero.' },
        { key: 'image-permission', icon: 'photo_camera', title: 'Autorización de uso de imagen', description: 'Para actividades o material institucional.' },
        { key: 'priority-certificate', icon: 'military_tech', title: 'Certificado Prioridad o PIE MINEDUC', description: 'Documento oficial si existe beneficio o condición asociada.' }
      ]
    }
  ] as const;

  readonly form = this.formBuilder.nonNullable.group({
    studentRun: [''],
    studentFirstName: [''],
    studentMiddleName: [''],
    studentLastNameFather: [''],
    studentLastNameMother: [''],
    birthDate: [''],
    courseId: [0],
    courseBase: this.formBuilder.nonNullable.group({
      baseName: [{ value: '', disabled: true }],
      level: [{ value: '', disabled: true }],
      letter: [{ value: '', disabled: true }],
      schoolYear: [`${new Date().getFullYear()}`],
      scheduleType: [{ value: '', disabled: true }]
    }),
    gender: ['Femenino'],
    regionId: [0],
    communeId: [0],
    address: [''],
    livesWith: [''],
    allergies: [''],
    specialistDiagnoses: [''],
    emergencyContact: [''],
    specialNeeds: ['Regular'],
    status: ['ACTIVO'],
    enrollmentDate: [new Date().toISOString().slice(0, 10)],
    guardian: this.formBuilder.nonNullable.group({
      run: [''],
      fullName: [''],
      birthDate: [''],
      address: [''],
      phone: [''],
      email: ['', [Validators.email]],
      education: [''],
      relation: ['Madre'],
      authorizedPickup: [true]
    }),
    father: this.formBuilder.nonNullable.group({
      run: [''],
      fullName: [''],
      birthDate: [''],
      address: [''],
      phone: [''],
      email: ['', [Validators.email]],
      education: ['']
    }),
    mother: this.formBuilder.nonNullable.group({
      run: [''],
      fullName: [''],
      birthDate: [''],
      address: [''],
      phone: [''],
      email: ['', [Validators.email]],
      education: ['']
    }),
    studentAccess: this.formBuilder.nonNullable.group({
      configureAccess: [false],
      createStudentAccount: [false],
      username: [''],
      temporaryPassword: [''],
      notifyByEmail: [true],
      contactEmail: [''],
      status: ['Sin cuenta']
    }),
    guardianAccess: this.formBuilder.nonNullable.group({
      configureAccess: [false],
      createGuardianAccount: [false],
      username: [''],
      temporaryPassword: [''],
      notifyByEmail: [true],
      contactEmail: [''],
      status: ['Sin cuenta']
    }),
    pickupContacts: this.formBuilder.array([]),
    establishment: this.formBuilder.nonNullable.group({
      regionId: [0],
      communeId: [0],
      name: [''],
      academicYear: [`${new Date().getFullYear()}`],
      dependency: [''],
      region: [''],
      commune: [''],
      address: ['']
    })
  });

  constructor() {
    this.observeEnrollmentStatus();
    this.observeLocationSelection();
    this.observeCourseSelection();
    this.observeAccessPreview();
    this.loadCoursesAndData();
  }

  get pickupContacts(): FormArray {
    return this.form.controls.pickupContacts;
  }

  get guardianGroup() {
    return this.form.controls.guardian;
  }

  get courseBaseGroup() {
    return this.form.controls.courseBase;
  }

  get fatherGroup() {
    return this.form.controls.father;
  }

  get motherGroup() {
    return this.form.controls.mother;
  }

  get establishmentGroup() {
    return this.form.controls.establishment;
  }

  get studentAccessGroup() {
    return this.form.controls.studentAccess;
  }

  get guardianAccessGroup() {
    return this.form.controls.guardianAccess;
  }

  studentCommunes(): ChileCommune[] {
    return this.findCommunesByRegionId(this.form.controls.regionId.value);
  }

  establishmentCommunes(): ChileCommune[] {
    return this.findCommunesByRegionId(this.establishmentGroup.controls.regionId.value);
  }

  isControlInvalid(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  isArrayControlInvalid(index: number, controlName: string): boolean {
    const control = this.pickupContacts.at(index)?.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getControlError(path: string): string {
    const control = this.form.get(path);
    return this.resolveControlError(control);
  }

  getArrayControlError(index: number, controlName: string): string {
    const control = this.pickupContacts.at(index)?.get(controlName) ?? null;
    return this.resolveControlError(control);
  }

  addPickupContact(): void {
    if (this.pickupContacts.length >= 5) {
      this.snackBar.open('Puedes agregar hasta 5 responsables de retiro', 'Cerrar', { duration: 2500 });
      return;
    }
    this.pickupContacts.push(this.createPickupContactGroup());
  }

  hasGuardianPickupContact(): boolean {
    const guardianRun = this.normalizeComparableRun(this.guardianGroup.controls.run.value);
    if (!guardianRun) {
      return false;
    }

    return this.pickupContacts.controls.some(
      (control) => this.normalizeComparableRun(`${control.get('run')?.value ?? ''}`) === guardianRun
    );
  }

  toggleGuardianPickupContact(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.addGuardianAsPickupContact();
      return;
    }

    const guardianRun = this.normalizeComparableRun(this.guardianGroup.controls.run.value);
    if (!guardianRun) {
      return;
    }

    for (let index = this.pickupContacts.length - 1; index >= 0; index -= 1) {
      const currentRun = this.normalizeComparableRun(`${this.pickupContacts.at(index)?.get('run')?.value ?? ''}`);
      if (currentRun === guardianRun) {
        this.pickupContacts.removeAt(index);
      }
    }
  }

  private addGuardianAsPickupContact(): void {
    const guardian = this.guardianGroup.getRawValue();
    if (!guardian.run.trim() || !guardian.fullName.trim() || !guardian.phone.trim() || !guardian.relation.trim()) {
      this.guardianGroup.markAllAsTouched();
      this.snackBar.open('Completa primero los datos del apoderado principal', 'Cerrar', {
        duration: 2800
      });
      return;
    }

    if (this.hasGuardianPickupContact()) {
      this.snackBar.open('El apoderado principal ya esta agregado como responsable de retiro', 'Cerrar', {
        duration: 2500
      });
      return;
    }

    const guardianName = this.splitGuardianName(guardian.fullName);

    if (this.pickupContacts.length >= 5) {
      this.snackBar.open('Ya alcanzaste el maximo de responsables de retiro', 'Cerrar', {
        duration: 2500
      });
      return;
    }

    this.pickupContacts.push(
      this.createPickupContactGroup({
        run: guardian.run.trim(),
        name: guardianName.name,
        lastName: guardianName.lastName,
        phone: this.formatChileanMobile(guardian.phone.trim()),
        relation: guardian.relation.trim(),
        authorizedPickup: true
      })
    );
    this.snackBar.open('Apoderado principal agregado como responsable de retiro', 'Cerrar', {
      duration: 2500
    });
  }

  removePickupContact(index: number): void {
    this.pickupContacts.removeAt(index);
  }

  removeAuthorized(index: number): void {
    this.removePickupContact(index);
  }

  onDocumentSelected(documentKey: string, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    this.uploadedDocuments.update((current) => ({
      ...current,
      [documentKey]: file.name
    }));
  }

  uploadedDocumentName(documentKey: string): string {
    return this.uploadedDocuments()[documentKey] ?? '';
  }

  hasUploadedDocument(documentKey: string): boolean {
    return !!this.uploadedDocumentName(documentKey);
  }

  isWizardStepVisible(step: number): boolean {
    return this.isEditMode || this.currentStep() === step;
  }

  isWizardStepActive(step: number): boolean {
    return this.currentStep() === step;
  }

  isWizardStepCompleted(step: number): boolean {
    return this.currentStep() > step;
  }

  goToStep(step: number): void {
    if (this.isEditMode) {
      return;
    }
    this.currentStep.set(Math.min(Math.max(step, 1), this.wizardSteps.length));
    this.scrollWizardToTop();
  }

  nextStep(): void {
    if (this.isEditMode) {
      return;
    }
    this.currentStep.set(Math.min(this.currentStep() + 1, this.wizardSteps.length));
    this.scrollWizardToTop();
  }

  previousStep(): void {
    if (this.isEditMode) {
      return;
    }
    this.currentStep.set(Math.max(this.currentStep() - 1, 1));
    this.scrollWizardToTop();
  }

  saveWithStatus(status: 'PENDIENTE' | 'ACTIVO'): void {
    this.form.controls.status.setValue(status);
    this.save();
  }

  reactivateEnrollment(): void {
    if (!this.isEditMode || !this.enrollmentId || this.isSaving()) {
      return;
    }

    const confirmed = window.confirm('Deseas reactivar esta matricula? El estudiante volvera a quedar activo en el curso.');
    if (!confirmed) {
      return;
    }

    this.isSaving.set(true);
    this.enrollmentApiService.reactivate(this.enrollmentId).subscribe({
      next: (detail) => {
        this.isSaving.set(false);
        this.patchForm(detail);
        this.snackBar.open('Matricula reactivada correctamente', 'Cerrar', {
          duration: 2500
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showError(error, 'No fue posible reactivar la matricula');
      }
    });
  }

  cancelCreate(): void {
    if (this.isSaving()) {
      return;
    }
    const hasChanges = this.form.dirty || Object.keys(this.uploadedDocuments()).length > 0;
    if (hasChanges && !window.confirm('¿Cancelar esta nueva matrícula y volver al listado?')) {
      return;
    }
    void this.router.navigate(['/dashboard/matriculas']);
  }

  studentSummaryName(): string {
    const firstName = this.form.controls.studentFirstName.value.trim();
    const middleName = this.form.controls.studentMiddleName.value.trim();
    const fatherLastName = this.form.controls.studentLastNameFather.value.trim();
    const motherLastName = this.form.controls.studentLastNameMother.value.trim();
    return [firstName, middleName, fatherLastName, motherLastName].filter(Boolean).join(' ') || 'Sin nombre';
  }

  studentSummaryInitials(): string {
    const firstName = this.form.controls.studentFirstName.value.trim();
    const lastName = this.form.controls.studentLastNameFather.value.trim();
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.trim().toUpperCase() || 'ST';
  }

  shouldShowStudentAccessConfig(): boolean {
    return this.studentAccessGroup.controls.configureAccess.value;
  }

  shouldShowStudentAccountBlock(): boolean {
    return this.shouldShowStudentAccessConfig() && this.studentAccessGroup.controls.createStudentAccount.value;
  }

  shouldShowGuardianAccountBlock(): boolean {
    return this.shouldShowStudentAccessConfig() && this.guardianAccessGroup.controls.createGuardianAccount.value;
  }

  studentAccessUsernamePreview(): string {
    const existingUsername = this.studentAccessGroup.controls.username.value.trim();
    if (existingUsername) {
      return existingUsername;
    }
    return this.studentUsernamePreview() || this.buildBaseStudentUsernamePreview();
  }

  studentAccessPasswordPreview(): string {
    const currentValue = this.studentAccessGroup.controls.temporaryPassword.value.trim();
    if (currentValue) {
      return currentValue;
    }
    return this.buildDefaultStudentPassword();
  }

  studentAccessStatusPreview(): string {
    const currentValue = this.studentAccessGroup.controls.status.value.trim();
    if (this.shouldShowStudentAccountBlock()) {
      return currentValue && currentValue !== 'Sin cuenta' ? currentValue : 'Pendiente';
    }
    return currentValue || 'Sin cuenta';
  }

  guardianAccessUsernamePreview(): string {
    const existingUsername = this.guardianAccessGroup.controls.username.value.trim();
    if (existingUsername) {
      return existingUsername;
    }
    return this.guardianUsernamePreview() || this.buildBaseGuardianUsernamePreview();
  }

  guardianAccessPasswordPreview(): string {
    const currentValue = this.guardianAccessGroup.controls.temporaryPassword.value.trim();
    if (currentValue) {
      return currentValue;
    }
    return this.buildDefaultGuardianPassword();
  }

  guardianAccessStatusPreview(): string {
    const currentValue = this.guardianAccessGroup.controls.status.value.trim();
    if (this.shouldShowGuardianAccountBlock()) {
      return currentValue && currentValue !== 'Sin cuenta' ? currentValue : 'Pendiente';
    }
    return currentValue || 'Sin cuenta';
  }

  copyStudentAccessValue(value: string, label: string): void {
    if (!value.trim()) {
      return;
    }

    navigator.clipboard?.writeText(value.trim())
      .then(() => {
        this.snackBar.open(`${label} copiado`, 'Cerrar', { duration: 2200 });
      })
      .catch(() => {
        this.snackBar.open(`No fue posible copiar ${label.toLowerCase()}`, 'Cerrar', { duration: 2200 });
      });
  }

  copyGuardianAccessValue(value: string, label: string): void {
    this.copyStudentAccessValue(value, label);
  }

  guardianSummaryName(): string {
    return this.guardianGroup.controls.fullName.value.trim() || '-';
  }

  documentIconClass(documentKey: string): string {
    if (['birth-certificate', 'student-id', 'guardian-id', 'legal-custody'].includes(documentKey)) {
      return 'doc-icon doc-icon--blue';
    }
    if (['study-certificate', 'behavior-report', 'report-card', 'pie-certificate'].includes(documentKey)) {
      return 'doc-icon doc-icon--amber';
    }
    if (['vaccination-card', 'health-record', 'medical-report', 'medical-authorization'].includes(documentKey)) {
      return 'doc-icon doc-icon--green';
    }
    return 'doc-icon doc-icon--violet';
  }

  baseCourseName(course: EnrollmentCourseOption): string {
    const fullName = normalizeCourseDisplayName(course.name, course.letter);
    const suffix = course.letter?.trim() ? ` ${course.letter.trim()}` : '';
    return suffix && fullName.endsWith(suffix) ? fullName.slice(0, -suffix.length) : fullName;
  }

  onCreateCourseBaseChange(value: string): void {
    this.createCourseBase.set(value);
    this.createCourseLevel.set('');
    this.createCourseLetter.set('');
    this.createCourseSchedule.set('');
    this.courseBaseGroup.patchValue({
      baseName: value,
      level: '',
      letter: '',
      scheduleType: ''
    }, { emitEvent: false });
    this.syncSelectedCourseFromComposer();
  }

  onCreateCourseLevelChange(value: string): void {
    this.createCourseLevel.set(value);
    this.createCourseLetter.set('');
    this.createCourseSchedule.set('');
    this.courseBaseGroup.patchValue({
      level: value,
      letter: '',
      scheduleType: ''
    }, { emitEvent: false });
    this.syncSelectedCourseFromComposer();
  }

  onCreateCourseLetterChange(value: string): void {
    this.createCourseLetter.set(value);
    this.createCourseSchedule.set('');
    this.courseBaseGroup.patchValue({
      letter: value,
      scheduleType: ''
    }, { emitEvent: false });
    this.syncSelectedCourseFromComposer();
  }

  onCreateCourseScheduleChange(value: string): void {
    this.createCourseSchedule.set(value);
    this.courseBaseGroup.patchValue({
      scheduleType: value
    }, { emitEvent: false });
    this.syncSelectedCourseFromComposer();
  }

  onCreateCourseSchoolYearChange(value: string): void {
    const normalizedValue = value.replace(/\D/g, '').slice(0, 4);
    this.courseBaseGroup.controls.schoolYear.setValue(normalizedValue, { emitEvent: false });
    this.syncSelectedCourseFromComposer();
  }

  save(): void {
    if (this.isSaving()) {
      return;
    }

    const payload = this.toPayload();
    if (!this.hasMinimumRequiredData(payload)) {
      this.form.markAllAsTouched();
      this.snackBar.open('Completa los datos minimos requeridos para guardar la matricula', 'Cerrar', {
        duration: 2800
      });
      return;
    }
    if (!payload.courseId && !this.hasCompleteCourseSelection(payload)) {
      this.snackBar.open('Selecciona un curso valido para matricular al estudiante', 'Cerrar', {
        duration: 2800
      });
      return;
    }
    if (!payload.pickupContacts.length) {
      this.snackBar.open('Agrega al menos un responsable de retiro completo', 'Cerrar', {
        duration: 2800
      });
      return;
    }
    this.isSaving.set(true);
    const request$ = this.isEditMode
      ? this.enrollmentApiService.update(this.enrollmentId!, payload)
      : this.enrollmentApiService.create(payload);

    request$.subscribe({
      next: (detail) => {
        this.isSaving.set(false);
        this.snackBar.open(
          this.isEditMode ? 'Matricula actualizada correctamente' : 'Matricula creada correctamente',
          'Cerrar',
          { duration: 2500 }
        );
        void this.router.navigate(['/dashboard/matriculas', detail.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showError(error, 'No fue posible guardar la matricula');
      }
    });
  }

  anularMatricula(): void {
    if (!this.isEditMode || !this.enrollmentId || this.isSaving()) {
      return;
    }

    const isAlreadyInactive = this.isInactiveStatus(`${this.form.controls.status.value ?? ''}`);
    const confirmed = window.confirm(
      isAlreadyInactive
        ? 'Esta matricula ya esta inactiva. Si continuas, se eliminara completamente de la base de datos junto con el alumno si no tiene otras matriculas. Deseas continuar?'
        : 'Deseas inactivar esta matricula? Esta accion dejara al estudiante fuera de la matricula activa.'
    );
    if (!confirmed) {
      return;
    }

    this.isSaving.set(true);
    this.enrollmentApiService.delete(this.enrollmentId).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.snackBar.open(
          isAlreadyInactive ? 'Matricula eliminada correctamente' : 'Matricula inactivada correctamente',
          'Cerrar',
          { duration: 2500 }
        );
        void this.router.navigate(['/dashboard/matriculas']);
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showError(error, isAlreadyInactive ? 'No fue posible eliminar la matricula' : 'No fue posible inactivar la matricula');
      }
    });
  }

  authLabel(index: number): string {
    const group = this.pickupContacts.at(index);
    const name = `${group.get('name')?.value ?? ''} ${group.get('lastName')?.value ?? ''}`.trim();
    const relation = `${group.get('relation')?.value ?? ''}`.trim();

    if (!name && !relation) {
      return 'Nuevo Responsable';
    }
    if (!name) {
      return relation;
    }
    if (!relation) {
      return name;
    }
    return `${name} (${relation})`;
  }

  formatRunValue(path: string): void {
    const control = this.form.get(path);
    if (!control) {
      return;
    }

    control.setValue(this.formatRun(`${control.value ?? ''}`));
  }

  formatPhoneValue(path: string): void {
    const control = this.form.get(path);
    if (!control) {
      return;
    }

    control.setValue(this.formatChileanMobile(`${control.value ?? ''}`));
  }

  private loadCoursesAndData(): void {
    this.enrollmentApiService.getOverview().subscribe({
      next: (overview) => {
        this.courses.set(overview.courses);
        this.syncCourseBaseFields(this.form.controls.courseId.value);
        if (this.isEditMode) {
          this.loadEnrollment();
        } else {
          this.isLoading.set(false);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el catalogo de cursos');
      }
    });

    this.locationApiService.getChileRegions().subscribe({
      next: (regions) => this.chileRegions.set(regions),
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar regiones y comunas')
    });
  }

  private loadEnrollment(): void {
    this.enrollmentApiService.getById(this.enrollmentId!).subscribe({
      next: (detail) => {
        this.patchForm(detail);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar la matricula');
      }
    });
  }

  private patchForm(detail: EnrollmentDetail): void {
    const normalizedStatus = this.normalizeEnrollmentStatus(detail.status);
    const studentNames = this.splitFullName(detail.studentName);
    const studentLastNames = this.splitLastNames(detail.studentLastName);
    const guardianFullName = [detail.guardian.name, detail.guardian.lastName].filter(Boolean).join(' ').trim();

    this.form.patchValue({
      studentRun: detail.studentRun,
      studentFirstName: studentNames.firstName,
      studentMiddleName: studentNames.middleName,
      studentLastNameFather: studentLastNames.fatherLastName,
      studentLastNameMother: studentLastNames.motherLastName,
      birthDate: detail.birthDate,
      courseId: detail.courseId,
      gender: this.normalizeBinaryGender(detail.gender, 'Femenino'),
      regionId: detail.regionId ?? 0,
      communeId: detail.communeId ?? 0,
      address: detail.address,
      livesWith: detail.livesWith,
      allergies: detail.allergies,
      specialistDiagnoses: detail.specialistDiagnoses,
      emergencyContact: detail.emergencyContact,
      specialNeeds: detail.specialNeeds,
      status: normalizedStatus,
      enrollmentDate: detail.enrollmentDate,
      guardian: {
        run: detail.guardian.run,
        fullName: guardianFullName,
        birthDate: detail.guardian.birthDate,
        address: detail.guardian.address,
        phone: this.formatChileanMobile(detail.guardian.phone),
        email: detail.guardian.email,
        education: detail.guardian.education,
        relation: detail.guardian.relation,
        authorizedPickup: detail.guardian.authorizedPickup
      },
      father: {
        run: detail.father.run,
        fullName: [detail.father.name, detail.father.lastName].filter(Boolean).join(' ').trim(),
        birthDate: detail.father.birthDate,
        address: detail.father.address,
        phone: this.formatChileanMobile(detail.father.phone),
        email: detail.father.email,
        education: detail.father.education
      },
      mother: {
        run: detail.mother.run,
        fullName: [detail.mother.name, detail.mother.lastName].filter(Boolean).join(' ').trim(),
        birthDate: detail.mother.birthDate,
        address: detail.mother.address,
        phone: this.formatChileanMobile(detail.mother.phone),
        email: detail.mother.email,
        education: detail.mother.education
      },
      studentAccess: {
        configureAccess: detail.studentAccess.configureAccess || detail.guardianAccess.configureAccess,
        createStudentAccount: detail.studentAccess.createStudentAccount,
        username: detail.studentAccess.username,
        temporaryPassword: '',
        notifyByEmail: detail.studentAccess.notifyByEmail,
        contactEmail: detail.studentAccess.contactEmail,
        status: detail.studentAccess.status || 'Sin cuenta'
      },
      guardianAccess: {
        configureAccess: detail.studentAccess.configureAccess || detail.guardianAccess.configureAccess,
        createGuardianAccount: detail.guardianAccess.createGuardianAccount,
        username: detail.guardianAccess.username,
        temporaryPassword: '',
        notifyByEmail: detail.guardianAccess.notifyByEmail,
        contactEmail: detail.guardianAccess.contactEmail,
        status: detail.guardianAccess.status || 'Sin cuenta'
      },
      establishment: {
        regionId: detail.establishment.regionId ?? 0,
        communeId: detail.establishment.communeId ?? 0,
        name: detail.establishment.name || '',
        academicYear: detail.establishment.academicYear || `${new Date(detail.enrollmentDate).getFullYear() || new Date().getFullYear()}`,
        dependency: detail.establishment.dependency || '',
        region: detail.establishment.region || '',
        commune: detail.establishment.commune || '',
        address: detail.establishment.address || ''
      }
    });

    this.hydrateCourseComposer(detail);

    this.uploadedDocuments.set(
      Object.fromEntries(
        (detail.documents ?? [])
          .filter((document) => document.documentKey && document.fileName)
          .map((document) => [document.documentKey, document.fileName])
      )
    );

    while (this.pickupContacts.length > 0) {
      this.pickupContacts.removeAt(0);
    }

    const contacts = detail.pickupContacts.length > 0 ? detail.pickupContacts : [this.emptyPickupContact()];
    contacts.forEach((contact) => {
      this.pickupContacts.push(this.formBuilder.nonNullable.group({
        run: [contact.run],
        name: [contact.name],
        lastName: [contact.lastName],
        phone: [this.formatChileanMobile(contact.phone)],
        relation: [contact.relation],
        authorizedPickup: [contact.authorizedPickup]
      }));
    });
  }

  private createPickupContactGroup(contact?: Partial<ReturnType<EnrollmentFormPageComponent['emptyPickupContact']>>) {
    const initialContact = { ...this.emptyPickupContact(), ...(contact ?? {}) };
    return this.formBuilder.nonNullable.group({
      run: [initialContact.run],
      name: [initialContact.name],
      lastName: [initialContact.lastName],
      phone: [this.formatChileanMobile(initialContact.phone)],
      relation: [initialContact.relation],
      authorizedPickup: [initialContact.authorizedPickup]
    });
  }

  private toPayload(): EnrollmentPayload {
    const value = this.form.getRawValue();
    const guardianName = this.splitGuardianName(value.guardian.fullName);
    const fatherName = this.splitGuardianName(value.father.fullName);
    const motherName = this.splitGuardianName(value.mother.fullName);
    const establishmentRegionId = value.establishment.regionId > 0 ? Number(value.establishment.regionId) : null;
    const establishmentCommuneId = value.establishment.communeId > 0 ? Number(value.establishment.communeId) : null;
    const pickupContacts = (value.pickupContacts as Array<{
      run: string;
      name: string;
      lastName: string;
      phone: string;
      relation: string;
      authorizedPickup: boolean;
    }>)
      .map((contact) => ({
        id: null,
        run: contact.run.trim(),
        name: contact.name.trim(),
        lastName: contact.lastName.trim(),
        phone: contact.phone.trim(),
        relation: contact.relation.trim(),
        authorizedPickup: contact.authorizedPickup
      }))
      .filter((contact) =>
        contact.run || contact.name || contact.lastName || contact.phone || contact.relation
      );

    return {
      studentRun: value.studentRun.trim(),
      studentName: [value.studentFirstName, value.studentMiddleName].filter(Boolean).join(' ').trim(),
      studentLastName: [value.studentLastNameFather, value.studentLastNameMother].filter(Boolean).join(' ').trim(),
      birthDate: value.birthDate,
      gender: this.normalizeBinaryGender(value.gender, 'Femenino'),
      courseId: Number(value.courseId),
      courseSelection: {
        baseName: value.courseBase.baseName.trim(),
        level: value.courseBase.level.trim(),
        letter: value.courseBase.letter.trim(),
        schoolYear: value.courseBase.schoolYear.trim(),
        scheduleType: value.courseBase.scheduleType.trim()
      },
      regionId: value.regionId > 0 ? Number(value.regionId) : null,
      communeId: value.communeId > 0 ? Number(value.communeId) : null,
      address: value.address.trim(),
      livesWith: value.livesWith.trim(),
      allergies: value.allergies.trim(),
      specialistDiagnoses: value.specialistDiagnoses.trim(),
      emergencyContact: value.emergencyContact.trim(),
      specialNeeds: value.specialNeeds.trim(),
      status: value.status,
      enrollmentDate: value.enrollmentDate,
      establishment: {
        regionId: establishmentRegionId,
        communeId: establishmentCommuneId,
        name: value.establishment.name.trim(),
        academicYear: value.establishment.academicYear.trim(),
        dependency: value.establishment.dependency.trim(),
        region: this.findRegionNameById(establishmentRegionId) || value.establishment.region.trim(),
        commune: this.findCommuneNameById(establishmentRegionId, establishmentCommuneId) || value.establishment.commune.trim(),
        address: value.establishment.address.trim()
      },
      guardian: {
        id: null,
        run: value.guardian.run.trim(),
        name: guardianName.name,
        lastName: guardianName.lastName,
        birthDate: value.guardian.birthDate.trim(),
        address: value.guardian.address.trim(),
        phone: value.guardian.phone.trim(),
        email: this.normalizeOptionalEmail(value.guardian.email),
        education: value.guardian.education.trim(),
        relation: value.guardian.relation.trim(),
        authorizedPickup: value.guardian.authorizedPickup
      },
      father: {
        id: null,
        run: value.father.run.trim(),
        name: fatherName.name,
        lastName: fatherName.lastName,
        birthDate: value.father.birthDate.trim(),
        address: value.father.address.trim(),
        phone: value.father.phone.trim(),
        email: this.normalizeOptionalEmail(value.father.email),
        education: value.father.education.trim()
      },
      mother: {
        id: null,
        run: value.mother.run.trim(),
        name: motherName.name,
        lastName: motherName.lastName,
        birthDate: value.mother.birthDate.trim(),
        address: value.mother.address.trim(),
        phone: value.mother.phone.trim(),
        email: this.normalizeOptionalEmail(value.mother.email),
        education: value.mother.education.trim()
      },
      pickupContacts,
      documents: Object.entries(this.uploadedDocuments()).map(([documentKey, fileName]) => ({
        id: null,
        documentKey,
        fileName,
        driveFileId: null,
        driveUrl: null
      })),
      studentAccess: this.toStudentAccessPayload(),
      guardianAccess: this.toGuardianAccessPayload()
    };
  }

  private splitFullName(fullName: string): { firstName: string; middleName: string } {
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] ?? '',
      middleName: parts.slice(1).join(' ')
    };
  }

  private splitLastNames(lastNames: string): { fatherLastName: string; motherLastName: string } {
    const parts = (lastNames || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 2) {
      return {
        fatherLastName: parts[0] ?? '',
        motherLastName: parts.slice(1).join(' ')
      };
    }

    const compoundParticles = new Set([
      'da', 'das', 'de', 'del', 'della', 'delle', 'dello', 'di', 'do', 'dos',
      'la', 'las', 'le', 'les', 'los', 'mac', 'mc', 'san', 'santa', 'santo',
      'st', 'van', 'vander', 'von', 'y'
    ]);

    if (compoundParticles.has(parts[0]!.toLowerCase())) {
      let paternalEndIndex = 0;
      while (paternalEndIndex + 1 < parts.length) {
        paternalEndIndex += 1;
        const nextPart = parts[paternalEndIndex]!.toLowerCase();
        if (!compoundParticles.has(nextPart)) {
          break;
        }
      }

      if (paternalEndIndex < parts.length - 1) {
        return {
          fatherLastName: parts.slice(0, paternalEndIndex + 1).join(' '),
          motherLastName: parts.slice(paternalEndIndex + 1).join(' ')
        };
      }
    }

    return {
      fatherLastName: parts[0] ?? '',
      motherLastName: parts.slice(1).join(' ')
    };
  }

  private splitGuardianName(fullName: string): { name: string; lastName: string } {
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      return { name: parts[0] ?? '', lastName: '' };
    }

    const half = Math.ceil(parts.length / 2);
    return {
      name: parts.slice(0, half).join(' '),
      lastName: parts.slice(half).join(' ')
    };
  }

  private formatRun(value: string): string {
    const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
    if (!clean) {
      return '';
    }

    const body = clean.slice(0, -1);
    const verifier = clean.slice(-1);
    const reversed = body.split('').reverse();
    const parts: string[] = [];

    for (let index = 0; index < reversed.length; index += 1) {
      if (index > 0 && index % 3 === 0) {
        parts.push('.');
      }
      parts.push(reversed[index]!);
    }

    return `${parts.reverse().join('')}-${verifier}`;
  }

  private normalizeComparableRun(value: string): string {
    return `${value ?? ''}`.replace(/[^0-9kK]/g, '').toUpperCase().trim();
  }

  private formatChileanMobile(rawValue: string): string {
    const digits = rawValue.replace(/\D/g, '');
    if (!digits) {
      return '';
    }

    let normalized = digits;
    if (normalized.startsWith('56')) {
      normalized = normalized.slice(2);
    }
    if (normalized.startsWith('9')) {
      normalized = normalized.slice(1);
    }

    normalized = normalized.slice(0, 8);

    const first = normalized.slice(0, 4);
    const second = normalized.slice(4, 8);

    if (!first) {
      return '+56 9';
    }
    if (!second) {
      return `+56 9 ${first}`;
    }
    return `+56 9 ${first} ${second}`;
  }

  private emptyPickupContact() {
    return {
      id: null,
      run: '',
      name: '',
      lastName: '',
      phone: '',
      relation: 'Tutor(a)',
      authorizedPickup: true
    };
  }

  private normalizeBinaryGender(value: string, fallback: 'Femenino' | 'Masculino'): 'Femenino' | 'Masculino' {
    return value === 'Masculino' ? 'Masculino' : fallback;
  }

  private toStudentAccessPayload(): EnrollmentStudentAccess {
    const value = this.studentAccessGroup.getRawValue();
    const configureAccess = value.configureAccess;
    const createStudentAccount = configureAccess && value.createStudentAccount;
    const username = createStudentAccount ? this.studentAccessUsernamePreview() : '';
    const temporaryPassword = createStudentAccount ? this.studentAccessPasswordPreview() : '';

    return {
      configureAccess,
      createStudentAccount,
      username,
      temporaryPassword,
      notifyByEmail: createStudentAccount ? value.notifyByEmail : false,
      contactEmail: createStudentAccount ? this.guardianGroup.controls.email.value.trim() : '',
      status: createStudentAccount ? 'Pendiente' : 'Sin cuenta'
    };
  }

  private toGuardianAccessPayload(): EnrollmentGuardianAccess {
    const value = this.guardianAccessGroup.getRawValue();
    const configureAccess = this.studentAccessGroup.controls.configureAccess.value;
    const createGuardianAccount = configureAccess && value.createGuardianAccount;
    const username = createGuardianAccount ? this.guardianAccessUsernamePreview() : '';
    const temporaryPassword = createGuardianAccount ? this.guardianAccessPasswordPreview() : '';

    return {
      configureAccess,
      createGuardianAccount,
      username,
      temporaryPassword,
      notifyByEmail: createGuardianAccount ? value.notifyByEmail : false,
      contactEmail: createGuardianAccount ? this.guardianGroup.controls.email.value.trim() : '',
      status: createGuardianAccount ? 'Pendiente' : 'Sin cuenta'
    };
  }

  private buildDefaultStudentPassword(): string {
    const normalizedRun = `${this.form.controls.studentRun.value ?? ''}`.replace(/[^0-9kK]/g, '').toUpperCase();
    const verifier = normalizedRun.slice(-4) || '2024';
    const nameInitial = this.normalizeAccessPart(this.form.controls.studentFirstName.value).charAt(0) || 'A';
    return `Tfs${nameInitial}${verifier}!`;
  }

  private buildDefaultGuardianPassword(): string {
    const normalizedRun = `${this.guardianGroup.controls.run.value ?? ''}`.replace(/[^0-9kK]/g, '').toUpperCase();
    const suffix = normalizedRun.slice(-4) || '2024';
    const splitName = this.splitGuardianName(this.guardianGroup.controls.fullName.value);
    const nameInitial = this.normalizeAccessPart(splitName.name).charAt(0) || 'A';
    return `Apo${nameInitial}${suffix}!`;
  }

  private buildBaseStudentUsernamePreview(): string {
    const firstName = this.normalizeAccessPart(this.form.controls.studentFirstName.value).charAt(0);
    const paternalLastName = this.normalizeAccessPart(this.form.controls.studentLastNameFather.value);
    return `${firstName}${paternalLastName}`.toLowerCase();
  }

  private buildBaseGuardianUsernamePreview(): string {
    const splitName = this.splitGuardianName(this.guardianGroup.controls.fullName.value);
    const firstName = this.normalizeAccessPart(splitName.name).charAt(0);
    const paternalLastName = this.normalizeAccessPart(splitName.lastName.split(/\s+/).filter(Boolean)[0] ?? '');
    return `${firstName}${paternalLastName}`.toLowerCase();
  }

  private normalizeAccessPart(value: string): string {
    return `${value ?? ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .trim()
      .toLowerCase();
  }

  private hasMinimumRequiredData(payload: EnrollmentPayload): boolean {
    return !!payload.studentRun
      && !!payload.studentName
      && !!payload.studentLastName
      && !!payload.birthDate
      && !!payload.gender
      && !!payload.address
      && !!payload.status
      && !!payload.enrollmentDate
      && !!payload.guardian.run
      && !!payload.guardian.name
      && !!payload.guardian.lastName
      && !!payload.guardian.phone
      && !!payload.guardian.relation;
  }

  private normalizeOptionalEmail(value: string): string {
    const normalized = `${value ?? ''}`.trim();
    if (!normalized) {
      return '';
    }
    return this.isValidEmail(normalized) ? normalized : '';
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private observeLocationSelection(): void {
    this.form.controls.regionId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((regionId) => {
        this.resetCommuneIfMissing(this.form.controls.communeId, Number(regionId ?? 0));
      });

    this.establishmentGroup.controls.regionId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((regionId) => {
        this.resetCommuneIfMissing(this.establishmentGroup.controls.communeId, Number(regionId ?? 0));
      });
  }

  private observeEnrollmentStatus(): void {
    this.form.controls.status.valueChanges
      .pipe(
        startWith(this.form.controls.status.value),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((status) => {
        this.enrollmentStatus.set(this.normalizeEnrollmentStatus(`${status ?? ''}`));
      });
  }

  private observeCourseSelection(): void {
    this.form.controls.courseId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((courseId) => {
        this.syncCourseBaseFields(courseId);
      });
  }

  private observeAccessPreview(): void {
    merge(
      this.form.controls.studentRun.valueChanges,
      this.form.controls.studentFirstName.valueChanges,
      this.form.controls.studentMiddleName.valueChanges,
      this.form.controls.studentLastNameFather.valueChanges,
      this.form.controls.studentLastNameMother.valueChanges,
      this.guardianGroup.controls.run.valueChanges,
      this.guardianGroup.controls.fullName.valueChanges,
      this.studentAccessGroup.controls.configureAccess.valueChanges,
      this.studentAccessGroup.controls.createStudentAccount.valueChanges,
      this.guardianAccessGroup.controls.createGuardianAccount.valueChanges,
      this.studentAccessGroup.controls.username.valueChanges,
      this.guardianAccessGroup.controls.username.valueChanges
    ).pipe(
      startWith(null),
      debounceTime(120),
      switchMap(() => {
        if (!this.shouldShowStudentAccessConfig()) {
          return of<EnrollmentAccessPreview>({ studentUsername: '', guardianUsername: '' });
        }

        const studentFirstName = this.form.controls.studentFirstName.value.trim();
        const studentMiddleName = this.form.controls.studentMiddleName.value.trim();
        const studentLastNameFather = this.form.controls.studentLastNameFather.value.trim();
        const studentLastNameMother = this.form.controls.studentLastNameMother.value.trim();
        const guardianFullName = this.guardianGroup.controls.fullName.value.trim();
        const guardianRun = this.guardianGroup.controls.run.value.trim();
        const guardianSplitName = this.splitGuardianName(guardianFullName);

        const hasStudentData = !!studentFirstName || !!studentLastNameFather;
        const hasGuardianData = !!guardianSplitName.name || !!guardianSplitName.lastName;
        if (!hasStudentData && !hasGuardianData) {
          return of<EnrollmentAccessPreview>({ studentUsername: '', guardianUsername: '' });
        }

        return this.enrollmentApiService.previewAccess({
          studentRun: this.form.controls.studentRun.value.trim(),
          studentName: [studentFirstName, studentMiddleName].filter(Boolean).join(' ').trim(),
          studentLastName: [studentLastNameFather, studentLastNameMother].filter(Boolean).join(' ').trim(),
          guardianRun,
          guardianName: guardianSplitName.name,
          guardianLastName: guardianSplitName.lastName
        }).pipe(
          catchError(() => of<EnrollmentAccessPreview>({
            studentUsername: this.buildBaseStudentUsernamePreview(),
            guardianUsername: this.buildBaseGuardianUsernamePreview()
          }))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((preview) => {
      this.studentUsernamePreview.set(preview.studentUsername ?? '');
      this.guardianUsernamePreview.set(preview.guardianUsername ?? '');
    });
  }

  private syncCourseBaseFields(courseId: number): void {
    const course = this.courses().find((item) => item.id === Number(courseId)) ?? null;
    if (!course) {
      this.courseBaseGroup.patchValue({
        baseName: this.createCourseBase(),
        level: this.createCourseLevel(),
        letter: this.createCourseLetter(),
        schoolYear: this.courseBaseGroup.controls.schoolYear.value,
        scheduleType: this.createCourseSchedule()
      }, { emitEvent: false });
      return;
    }

    this.createCourseBase.set(this.baseCourseName(course));
    this.createCourseLevel.set(course.level ?? '');
    this.createCourseLetter.set(course.letter ?? '');
    this.createCourseSchedule.set(course.scheduleType ?? '');
    this.courseBaseGroup.patchValue({
      baseName: this.baseCourseName(course),
      level: course?.level ?? '',
      letter: course?.letter ?? '',
      schoolYear: `${course.schoolYear}`,
      scheduleType: course?.scheduleType ?? ''
    }, { emitEvent: false });
  }

  private hydrateCourseComposer(detail: EnrollmentDetail): void {
    const matchedCourseById = this.courses().find((item) => item.id === Number(detail.courseId)) ?? null;
    if (matchedCourseById) {
      this.syncCourseBaseFields(matchedCourseById.id);
      return;
    }

    const parsedCourse = this.buildCourseComposerSnapshot(detail);
    this.createCourseBase.set(parsedCourse.baseName);
    this.createCourseLevel.set(parsedCourse.level);
    this.createCourseLetter.set(parsedCourse.letter);
    this.createCourseSchedule.set(parsedCourse.scheduleType);
    this.courseBaseGroup.patchValue({
      baseName: parsedCourse.baseName,
      level: parsedCourse.level,
      letter: parsedCourse.letter,
      schoolYear: parsedCourse.schoolYear,
      scheduleType: parsedCourse.scheduleType
    }, { emitEvent: false });

    const matchedCourseByAttributes = this.findCourseMatchByComposer(parsedCourse);
    if (matchedCourseByAttributes) {
      this.form.controls.courseId.setValue(matchedCourseByAttributes.id, { emitEvent: false });
      this.syncCourseBaseFields(matchedCourseByAttributes.id);
    }
  }

  private buildCourseComposerSnapshot(detail: EnrollmentDetail): {
    baseName: string;
    level: string;
    letter: string;
    schoolYear: string;
    scheduleType: string;
  } {
    const parsedName = this.parseCourseName(detail.courseName, detail.courseLetter);
    const schoolYear = `${detail.courseSchoolYear ?? this.courseBaseGroup.controls.schoolYear.value ?? new Date().getFullYear()}`;
    const matchedCourse = this.courses().find((course) =>
      this.baseCourseName(course).trim().toUpperCase() === parsedName.baseName.trim().toUpperCase()
      && (!parsedName.letter || course.letter.trim().toUpperCase() === parsedName.letter.trim().toUpperCase())
      && `${course.schoolYear}` === schoolYear
    ) ?? null;

    return {
      baseName: parsedName.baseName,
      level: detail.courseLevel || matchedCourse?.level || '',
      letter: parsedName.letter,
      schoolYear,
      scheduleType: detail.courseScheduleType || matchedCourse?.scheduleType || ''
    };
  }

  private findCourseMatchByComposer(courseComposer: {
    baseName: string;
    level: string;
    letter: string;
    schoolYear: string;
    scheduleType: string;
  }): EnrollmentCourseOption | null {
    return this.courses().find((course) =>
      this.baseCourseName(course).trim().toUpperCase() === courseComposer.baseName.trim().toUpperCase()
      && (!courseComposer.level || course.level.trim().toUpperCase() === courseComposer.level.trim().toUpperCase())
      && (!courseComposer.letter || course.letter.trim().toUpperCase() === courseComposer.letter.trim().toUpperCase())
      && (!courseComposer.scheduleType || course.scheduleType.trim().toUpperCase() === courseComposer.scheduleType.trim().toUpperCase())
      && `${course.schoolYear}` === `${courseComposer.schoolYear}`
    ) ?? null;
  }

  private parseCourseName(courseName: string, explicitLetter: string): { baseName: string; letter: string } {
    const normalizedCourseName = `${courseName ?? ''}`.trim();
    const normalizedExplicitLetter = `${explicitLetter ?? ''}`.trim().toUpperCase();
    if (!normalizedCourseName) {
      return { baseName: '', letter: normalizedExplicitLetter };
    }

    if (normalizedExplicitLetter) {
      const suffix = ` ${normalizedExplicitLetter}`;
      if (normalizedCourseName.toUpperCase().endsWith(suffix)) {
        return {
          baseName: normalizedCourseName.slice(0, -suffix.length).trim(),
          letter: normalizedExplicitLetter
        };
      }
      return {
        baseName: normalizedCourseName,
        letter: normalizedExplicitLetter
      };
    }

    const parts = normalizedCourseName.split(/\s+/).filter(Boolean);
    const lastPart = parts.at(-1)?.trim().toUpperCase() ?? '';
    if (/^[A-Z]$/.test(lastPart) && parts.length > 1) {
      return {
        baseName: parts.slice(0, -1).join(' ').trim(),
        letter: lastPart
      };
    }

    return {
      baseName: normalizedCourseName,
      letter: ''
    };
  }

  private syncSelectedCourseFromComposer(): void {
    const schoolYear = Number(this.courseBaseGroup.controls.schoolYear.value);
    const match = this.courses().find((course) =>
      this.baseCourseName(course).trim().toUpperCase() === this.createCourseBase().trim().toUpperCase()
      && course.level.trim().toUpperCase() === this.createCourseLevel().trim().toUpperCase()
      && course.letter.trim().toUpperCase() === this.createCourseLetter().trim().toUpperCase()
      && course.scheduleType.trim().toUpperCase() === this.createCourseSchedule().trim().toUpperCase()
      && course.schoolYear === schoolYear
    );
    this.form.controls.courseId.setValue(match?.id ?? 0);
  }

  private withSelectedCourseOption(options: string[], selectedValue: string): string[] {
    const normalizedSelectedValue = `${selectedValue ?? ''}`.trim();
    if (!normalizedSelectedValue) {
      return options;
    }

    const alreadyIncluded = options.some((option) => option.trim().toUpperCase() === normalizedSelectedValue.toUpperCase());
    if (alreadyIncluded) {
      return options;
    }

    return [normalizedSelectedValue, ...options];
  }

  private hasCompleteCourseSelection(payload: EnrollmentPayload): boolean {
    return !!payload.courseSelection.baseName
      && !!payload.courseSelection.level
      && !!payload.courseSelection.letter
      && !!payload.courseSelection.scheduleType
      && /^\d{4}$/.test(payload.courseSelection.schoolYear);
  }

  private resetCommuneIfMissing(control: FormControl<number>, regionId: number): void {
    const communes = this.findCommunesByRegionId(regionId);
    const currentCommuneId = Number(control.value ?? 0);
    if (!communes.some((commune) => commune.id === currentCommuneId)) {
      control.setValue(0);
    }
  }

  private findCommunesByRegionId(regionId: number): ChileCommune[] {
    if (!regionId || regionId <= 0) {
      return [];
    }
    return this.chileRegions().find((region) => region.id === Number(regionId))?.communes ?? [];
  }

  private findRegionNameById(regionId: number | null): string {
    if (!regionId) {
      return '';
    }
    return this.chileRegions().find((region) => region.id === regionId)?.name ?? '';
  }

  private findCommuneNameById(regionId: number | null, communeId: number | null): string {
    if (!regionId || !communeId) {
      return '';
    }
    return this.findCommunesByRegionId(regionId).find((commune) => commune.id === communeId)?.name ?? '';
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }

  private normalizeEnrollmentStatus(status: string): string {
    const normalized = `${status ?? ''}`.trim().toUpperCase();
    if (normalized === 'INACTIVO') {
      return 'INACTIVA';
    }
    return normalized || 'ACTIVO';
  }

  private isInactiveStatus(status: string): boolean {
    return ['INACTIVA', 'INACTIVO'].includes((status || '').trim().toUpperCase());
  }

  private resolveControlError(control: import('@angular/forms').AbstractControl | null): string {
    if (!control || !control.invalid || (!control.touched && !control.dirty)) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (control.hasError('email')) {
      return 'Ingresa un correo valido.';
    }
    if (control.hasError('min')) {
      return 'Selecciona una opcion valida.';
    }
    return 'Revisa este campo.';
  }

  private scrollWizardToTop(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const anchor = this.document.getElementById('enrollment-form-top');
        if (!anchor) {
          this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        let current: HTMLElement | null = anchor;
        while (current) {
          const { overflowY } = getComputedStyle(current);
          const isScrollable = ['auto', 'scroll', 'overlay'].includes(overflowY) && current.scrollHeight > current.clientHeight;
          if (isScrollable) {
            current.scrollTo({ top: 0, behavior: 'smooth' });
          }
          current = current.parentElement;
        }

        this.document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
        this.document.body.scrollTo({ top: 0, behavior: 'smooth' });
        this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  private validateStep(step: number): boolean {
    return true;
  }
}
