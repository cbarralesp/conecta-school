import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type AdministrationTab = 'users' | 'roles' | 'matrix' | 'new-user' | 'audit';

@Component({
  selector: 'app-administration-shell',
  standalone: true,
  imports: [TeacherModernLayoutComponent],
  template: `
    <app-teacher-modern-layout
      [title]="toolbarTitle"
      activeItem="users"
      dashboardRoute="/dashboard"
      [userName]="userName()"
      [userRole]="userRole()"
    >
      <main class="administration-content">
        <section class="administration-page-shell">
          <ng-content></ng-content>
        </section>
      </main>
    </app-teacher-modern-layout>
  `,
  styles: `
    .administration-content {
      display: grid;
      min-width: 0;
    }

    .administration-page-shell {
      display: grid;
      gap: 1rem;
      min-width: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationShellComponent {
  private readonly authStateService = inject(AuthStateService);

  @Input() activeTab: AdministrationTab = 'users';
  @Input() toolbarTitle = 'Administracion';

  protected readonly userName = computed(() => this.authStateService.user()?.nombre ?? 'Administrador');
  protected readonly userRole = computed(() => {
    const roleCode = this.authStateService.user()?.roleCode ?? this.authStateService.user()?.rol ?? 'ADMIN';
    return roleCode === 'SUPERADMIN' ? 'Superadmin' : 'Administrador';
  });
}
