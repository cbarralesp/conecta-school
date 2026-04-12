import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-administration-shell-redirect',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationShellRedirectComponent {
  constructor(router: Router) {
    void router.navigate(['/dashboard/administracion/usuarios']);
  }
}
