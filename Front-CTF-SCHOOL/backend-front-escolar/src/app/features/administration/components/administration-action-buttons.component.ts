import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface AdministrationIconAction {
  key: string;
  icon: string;
  tooltip: string;
  ariaLabel: string;
  color?: 'primary' | 'warn';
  disabled?: boolean;
}

@Component({
  selector: 'app-administration-action-buttons',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="actions-group">
      @for (action of actions; track action.key) {
        <button
          mat-icon-button
          type="button"
          [color]="action.color"
          [disabled]="action.disabled"
          [matTooltip]="action.tooltip"
          [attr.aria-label]="action.ariaLabel"
          (click)="actionSelected.emit(action.key)"
        >
          <mat-icon>{{ action.icon }}</mat-icon>
        </button>
      }
    </div>
  `,
  styles: `
    .actions-group {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin: 0 auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationActionButtonsComponent {
  @Input() actions: AdministrationIconAction[] = [];
  @Output() readonly actionSelected = new EventEmitter<string>();
}

