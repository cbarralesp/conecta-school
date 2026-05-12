import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
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
  imports: [MatIconModule, MatTooltipModule],
  template: `
    <div class="actions-group">
      @for (action of actions; track action.key) {
        <button
          type="button"
          class="action-button"
          [class.action-button--warn]="action.color === 'warn'"
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
      justify-content: flex-end;
      gap: 0.25rem;
    }

    .action-button {
      width: 32px;
      height: 32px;
      min-width: 32px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #64748b;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .action-button:hover:not(:disabled) {
      border-color: #6366f1;
      background: #f8fafc;
      color: #6366f1;
    }

    .action-button--warn:hover:not(:disabled) {
      border-color: #ef4444;
      background: #fef2f2;
      color: #ef4444;
    }

    .action-button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .action-button .mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      display: block;
      line-height: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationActionButtonsComponent {
  @Input() actions: AdministrationIconAction[] = [];
  @Output() readonly actionSelected = new EventEmitter<string>();
}
