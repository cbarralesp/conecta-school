import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-administration-hero',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <section class="hero">
      <div class="hero-head">
        <div class="hero-copy">
          <span class="hero-tag">{{ tag }}</span>
          <h1>{{ title }}</h1>
          <p>{{ description }}</p>
        </div>

        @if (actionLabel) {
          <button
            mat-stroked-button
            type="button"
            class="hero-action"
            [disabled]="actionDisabled"
            (click)="action.emit()"
          >
            @if (actionIcon) {
              <mat-icon>{{ actionIcon }}</mat-icon>
            }
            {{ actionLabel }}
          </button>
        }
      </div>
    </section>
  `,
  styles: `
    .hero {
      border-radius: var(--app-radius-hero);
      padding: var(--app-hero-padding-y) var(--app-hero-padding-x);
      background: var(--app-gradient-hero);
      color: #fff;
      box-shadow: var(--app-shadow-md);
    }

    .hero-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }

    .hero-copy {
      max-width: var(--app-hero-copy-max-width);
    }

    .hero-tag {
      display: inline-flex;
      align-items: center;
      padding: var(--app-hero-tag-padding-y) var(--app-hero-tag-padding-x);
      margin-bottom: 0.9rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.16);
      font-size: var(--app-font-size-overline);
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h1 {
      margin: var(--app-hero-title-margin-top) 0 var(--app-hero-title-margin-bottom);
      font-size: var(--app-hero-title-size);
      line-height: var(--app-line-height-tight);
      font-weight: 700;
    }

    p {
      margin: 0;
      font-size: var(--app-hero-copy-size);
      line-height: var(--app-line-height-body);
      color: rgba(255, 255, 255, 0.9);
    }

    .hero-action {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #fff !important;
      color: var(--app-brand-strong) !important;
      border-color: rgba(255, 255, 255, 0.78) !important;
      box-shadow: 0 14px 28px rgba(5, 36, 74, 0.18);
    }

    @media (max-width: 768px) {
      .hero-head {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationHeroComponent {
  @Input({ required: true }) tag!: string;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) description!: string;
  @Input() actionLabel?: string;
  @Input() actionIcon?: string;
  @Input() actionDisabled = false;

  @Output() readonly action = new EventEmitter<void>();
}

