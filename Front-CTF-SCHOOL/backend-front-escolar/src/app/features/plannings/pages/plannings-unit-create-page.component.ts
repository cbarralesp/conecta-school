import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type SubjectOption = {
  value: string;
  label: string;
};

type CourseOption = {
  value: string;
  label: string;
};

type ColorOption = {
  value: string;
  label: string;
};

@Component({
  selector: 'app-plannings-unit-create-page',
  standalone: true,
  imports: [FormsModule, RouterLink, MatIconModule, TeacherModernLayoutComponent],
  templateUrl: './plannings-unit-create-page.component.html',
  styleUrl: './plannings-unit-create-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningsUnitCreatePageComponent {
  private readonly authStateService = inject(AuthStateService);

  readonly user = this.authStateService.user;

  readonly subjects: SubjectOption[] = [
    { value: 'matematica', label: 'Matemática' },
    { value: 'lenguaje', label: 'Lenguaje y Comunicación' },
    { value: 'ciencias', label: 'Ciencias' },
    { value: 'historia', label: 'Historia' }
  ];

  readonly courses: CourseOption[] = [
    { value: '3m-a', label: '3° Medio A' },
    { value: '3m-b', label: '3° Medio B' },
    { value: '4m-a', label: '4° Medio A' }
  ];

  readonly colors: ColorOption[] = [
    { value: '#6366f1', label: 'Violeta' },
    { value: '#8b5cf6', label: 'Purpura' },
    { value: '#3b82f6', label: 'Azul' },
    { value: '#10b981', label: 'Esmeralda' },
    { value: '#f59e0b', label: 'Ambar' },
    { value: '#f97316', label: 'Naranja' },
    { value: '#ef4444', label: 'Rojo' },
    { value: '#ec4899', label: 'Rosa' },
    { value: '#94a3b8', label: 'Gris' }
  ];

  readonly unitName = signal('Números enteros y operaciones combinadas');
  readonly unitNumber = signal('Unidad 1');
  readonly description = signal('');
  readonly subject = signal('matematica');
  readonly course = signal('3m-a');
  readonly plannedClasses = signal(12);
  readonly startDate = signal('2024-03-25');
  readonly endDate = signal('2024-05-24');
  readonly keywords = signal('');
  readonly selectedColor = signal('#6366f1');

  readonly subjectLabel = computed(() => this.findLabel(this.subjects, this.subject()));
  readonly courseLabel = computed(() => this.findLabel(this.courses, this.course()));
  readonly unitColor = computed(() => this.selectedColor());
  readonly durationWeeks = computed(() => {
    const start = this.startDate();
    const end = this.endDate();
    if (!start || !end) {
      return 0;
    }

    const startValue = new Date(start);
    const endValue = new Date(end);
    const diff = endValue.getTime() - startValue.getTime();

    if (Number.isNaN(diff) || diff < 0) {
      return 0;
    }

    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24 * 7)));
  });

  selectColor(color: string): void {
    this.selectedColor.set(color);
  }

  private findLabel<T extends { value: string; label: string }>(options: T[], value: string): string {
    return options.find((option) => option.value === value)?.label ?? '';
  }
}
