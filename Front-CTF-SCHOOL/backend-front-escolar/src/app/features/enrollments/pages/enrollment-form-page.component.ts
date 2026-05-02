import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { EnrollmentCourseOption, EnrollmentDetail, EnrollmentPayload } from '../../../core/models/enrollment.models';
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

  private readonly routeEnrollmentId = this.route.snapshot.paramMap.get('id');

  readonly user = this.authStateService.user;
  readonly enrollmentId = this.routeEnrollmentId ? Number(this.routeEnrollmentId) : null;
  readonly isEditMode = this.enrollmentId !== null && Number.isFinite(this.enrollmentId);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly courses = signal<EnrollmentCourseOption[]>([]);
  readonly chileRegions = signal<ChileRegion[]>([]);
  readonly pageTitle = computed(() => this.isEditMode ? 'Editar Matricula' : 'Nueva Matricula');
  readonly subtitle = computed(() =>
    this.isEditMode
      ? 'Actualizando informacion del estudiante'
      : 'Registrando informacion del estudiante'
  );
  readonly statusBadgeLabel = computed(() => {
    const status = (this.form.controls.status.value || 'ACTIVO').toUpperCase();
    return status === 'PENDIENTE' ? 'Pendiente' : 'Activo';
  });
  readonly statusBadgeClass = computed(() => {
    const status = (this.form.controls.status.value || 'ACTIVO').toUpperCase();
    return status === 'PENDIENTE' ? 'status-badge status-badge--pending' : 'status-badge';
  });
  readonly selectedCourseName = computed(() =>
    this.courses().find((course) => course.id === Number(this.form.controls.courseId.value))?.name ?? 'Curso sin asignar'
  );
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
        { key: 'student-id', icon: 'badge', title: 'Cedula de identidad del alumno', description: 'Ambos lados, vigente.' },
        { key: 'guardian-id', icon: 'contact_page', title: 'Cedula del apoderado', description: 'Documento de identidad del apoderado principal.' },
        { key: 'legal-custody', icon: 'gavel', title: 'Tutela o resolucion judicial', description: 'Solo si existe tutela legal o condicion especial.' }
      ]
    },
    {
      title: 'Historial Academico',
      documents: [
        { key: 'study-certificate', icon: 'workspace_premium', title: 'Certificado de estudios', description: 'Documento del ano anterior o del ultimo curso aprobado.' },
        { key: 'behavior-report', icon: 'fact_check', title: 'Informe de personalidad o conducta', description: 'Emitido por el establecimiento anterior, si aplica.' },
        { key: 'report-card', icon: 'bar_chart', title: 'Boletin de notas', description: 'Opcional para apoyar la asignacion de curso.' },
        { key: 'pie-certificate', icon: 'extension', title: 'Certificado PIE o NEE', description: 'Diagnostico de necesidades educativas especiales, si existe.' }
      ]
    },
    {
      title: 'Documentos Medicos',
      documents: [
        { key: 'vaccination-card', icon: 'vaccines', title: 'Carne de vacunacion', description: 'Registro de vacunas del estudiante.' },
        { key: 'health-record', icon: 'health_and_safety', title: 'Ficha de salud escolar', description: 'Antecedentes medicos relevantes y cuidados generales.' },
        { key: 'medical-report', icon: 'clinical_notes', title: 'Informe medico o diagnostico', description: 'Solo si presenta alergias, tratamiento o condicion cronica.' },
        { key: 'medical-authorization', icon: 'description', title: 'Autorizacion de atencion medica', description: 'Permiso para actuar ante emergencias.' }
      ]
    },
    {
      title: 'Otros Documentos',
      documents: [
        { key: 'junaeb-sep', icon: 'volunteer_activism', title: 'Comprobante JUNAEB o SEP', description: 'Si postula a beneficios o prioridad.' },
        { key: 'migratory-docs', icon: 'travel_explore', title: 'Visa o documentos migratorios', description: 'Solo si corresponde a estudiante extranjero.' },
        { key: 'image-permission', icon: 'photo_camera', title: 'Autorizacion uso de imagen', description: 'Para actividades o material institucional.' },
        { key: 'priority-certificate', icon: 'military_tech', title: 'Certificado Prioridad o PIE MINEDUC', description: 'Documento oficial si existe beneficio o condicion asociada.' }
      ]
    }
  ] as const;

  readonly form = this.formBuilder.nonNullable.group({
    studentRun: ['', [Validators.required]],
    studentFirstName: ['', [Validators.required]],
    studentMiddleName: [''],
    studentLastNameFather: ['', [Validators.required]],
    studentLastNameMother: ['', [Validators.required]],
    birthDate: ['', [Validators.required]],
    courseId: [0, [Validators.required, Validators.min(1)]],
    gender: ['Femenino', [Validators.required]],
    regionId: [0],
    communeId: [0],
    address: ['', [Validators.required]],
    specialNeeds: ['Regular'],
    status: ['ACTIVO', [Validators.required]],
    enrollmentDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
    guardian: this.formBuilder.nonNullable.group({
      run: ['', [Validators.required]],
      fullName: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      relation: ['Madre', [Validators.required]],
      authorizedPickup: [true]
    }),
    pickupContacts: this.formBuilder.array([this.createPickupContactGroup()]),
    establishment: this.formBuilder.nonNullable.group({
      regionId: [0],
      communeId: [0],
      name: ['Escuela Basica Acade Fuerte'],
      academicYear: [`${new Date().getFullYear()}`],
      dependency: ['Municipal'],
      region: ['Metropolitana de Santiago'],
      commune: ['Santiago'],
      address: ['Av. Libertador 1234, Local 5']
    })
  });

  constructor() {
    this.observeLocationSelection();
    this.loadCoursesAndData();
  }

  get pickupContacts(): FormArray {
    return this.form.controls.pickupContacts;
  }

  get guardianGroup() {
    return this.form.controls.guardian;
  }

  get establishmentGroup() {
    return this.form.controls.establishment;
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

  useGuardianAsPickupContact(): void {
    const guardian = this.guardianGroup.getRawValue();
    if (!guardian.run.trim() || !guardian.fullName.trim() || !guardian.phone.trim() || !guardian.relation.trim()) {
      this.guardianGroup.markAllAsTouched();
      this.snackBar.open('Completa primero los datos del apoderado principal', 'Cerrar', {
        duration: 2800
      });
      return;
    }

    const guardianName = this.splitGuardianName(guardian.fullName);
    const existingIndex = this.pickupContacts.controls.findIndex(
      (control) => `${control.get('run')?.value ?? ''}`.trim().toUpperCase() === guardian.run.trim().toUpperCase()
    );

    if (existingIndex >= 0) {
      this.pickupContacts.at(existingIndex).patchValue({
        run: guardian.run.trim(),
        name: guardianName.name,
        lastName: guardianName.lastName,
        phone: guardian.phone.trim(),
        relation: guardian.relation.trim(),
        authorizedPickup: true
      });
      this.pickupContacts.at(existingIndex).markAsDirty();
      this.snackBar.open('Se actualizaron los datos del apoderado en responsables de retiro', 'Cerrar', {
        duration: 2500
      });
      return;
    }

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
        phone: guardian.phone.trim(),
        relation: guardian.relation.trim(),
        authorizedPickup: true
      })
    );
    this.snackBar.open('Apoderado principal agregado como responsable de retiro', 'Cerrar', {
      duration: 2500
    });
  }

  removePickupContact(index: number): void {
    if (this.pickupContacts.length === 1) {
      return;
    }
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

  save(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      if (!this.isSaving()) {
        this.snackBar.open('Completa los campos obligatorios para guardar la matricula', 'Cerrar', {
          duration: 2800
        });
      }
      return;
    }

    const payload = this.toPayload();
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

    const confirmed = window.confirm('Deseas anular esta matricula? Esta accion no se puede deshacer.');
    if (!confirmed) {
      return;
    }

    this.isSaving.set(true);
    this.enrollmentApiService.delete(this.enrollmentId).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.snackBar.open('Matricula anulada correctamente', 'Cerrar', { duration: 2500 });
        void this.router.navigate(['/dashboard/matriculas']);
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showError(error, 'No fue posible anular la matricula');
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

  private loadCoursesAndData(): void {
    this.enrollmentApiService.getOverview().subscribe({
      next: (overview) => {
        this.courses.set(overview.courses);
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
      specialNeeds: detail.specialNeeds,
      status: detail.status,
      enrollmentDate: detail.enrollmentDate,
      guardian: {
        run: detail.guardian.run,
        fullName: guardianFullName,
        phone: detail.guardian.phone,
        email: detail.guardian.email,
        relation: detail.guardian.relation,
        authorizedPickup: detail.guardian.authorizedPickup
      },
      establishment: {
        regionId: detail.establishment.regionId ?? 0,
        communeId: detail.establishment.communeId ?? 0,
        name: detail.establishment.name || 'Escuela Basica Acade Fuerte',
        academicYear: detail.establishment.academicYear || `${new Date(detail.enrollmentDate).getFullYear() || new Date().getFullYear()}`,
        dependency: detail.establishment.dependency || 'Municipal',
        region: detail.establishment.region || '',
        commune: detail.establishment.commune || '',
        address: detail.establishment.address || 'Av. Libertador 1234, Local 5'
      }
    });

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
        run: [contact.run, [Validators.required]],
        name: [contact.name, [Validators.required]],
        lastName: [contact.lastName, [Validators.required]],
        phone: [contact.phone, [Validators.required]],
        relation: [contact.relation, [Validators.required]],
        authorizedPickup: [contact.authorizedPickup]
      }));
    });
  }

  private createPickupContactGroup(contact?: Partial<ReturnType<EnrollmentFormPageComponent['emptyPickupContact']>>) {
    const initialContact = { ...this.emptyPickupContact(), ...(contact ?? {}) };
    return this.formBuilder.nonNullable.group({
      run: [initialContact.run, [Validators.required]],
      name: [initialContact.name, [Validators.required]],
      lastName: [initialContact.lastName, [Validators.required]],
      phone: [initialContact.phone, [Validators.required]],
      relation: [initialContact.relation, [Validators.required]],
      authorizedPickup: [initialContact.authorizedPickup]
    });
  }

  private toPayload(): EnrollmentPayload {
    const value = this.form.getRawValue();
    const guardianName = this.splitGuardianName(value.guardian.fullName);
    const establishmentRegionId = value.establishment.regionId > 0 ? Number(value.establishment.regionId) : null;
    const establishmentCommuneId = value.establishment.communeId > 0 ? Number(value.establishment.communeId) : null;

    return {
      studentRun: value.studentRun.trim(),
      studentName: [value.studentFirstName, value.studentMiddleName].filter(Boolean).join(' ').trim(),
      studentLastName: [value.studentLastNameFather, value.studentLastNameMother].filter(Boolean).join(' ').trim(),
      birthDate: value.birthDate,
      gender: this.normalizeBinaryGender(value.gender, 'Femenino'),
      courseId: Number(value.courseId),
      regionId: value.regionId > 0 ? Number(value.regionId) : null,
      communeId: value.communeId > 0 ? Number(value.communeId) : null,
      address: value.address.trim(),
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
        phone: value.guardian.phone.trim(),
        email: value.guardian.email.trim(),
        relation: value.guardian.relation.trim(),
        authorizedPickup: value.guardian.authorizedPickup
      },
      pickupContacts: value.pickupContacts.map((contact) => ({
        id: null,
        run: contact.run.trim(),
        name: contact.name.trim(),
        lastName: contact.lastName.trim(),
        phone: contact.phone.trim(),
        relation: contact.relation.trim(),
        authorizedPickup: contact.authorizedPickup
      })),
      documents: Object.entries(this.uploadedDocuments()).map(([documentKey, fileName]) => ({
        id: null,
        documentKey,
        fileName,
        driveFileId: null,
        driveUrl: null
      }))
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
}
