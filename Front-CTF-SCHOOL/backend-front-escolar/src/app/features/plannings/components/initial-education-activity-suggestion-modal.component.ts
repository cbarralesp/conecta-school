import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface InitialEducationActivitySuggestion {
  id: string;
  title: string;
  objectiveCodes: string[];
  summary: string;
  materials: string[];
  highlightedIndicators: string[];
  startActivity: string;
  developmentActivity: string;
  closingActivity: string;
}

@Component({
  selector: 'app-initial-education-activity-suggestion-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './initial-education-activity-suggestion-modal.component.html',
  styleUrl: './initial-education-activity-suggestion-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InitialEducationActivitySuggestionModalComponent {
  @Input() open = false;
  @Input() courseLabel = '';
  @Input() subjectLabel = '';
  @Input() ambitLabel = '';
  @Input() nucleusLabel = '';
  @Input() suggestions: InitialEducationActivitySuggestion[] = [];

  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly applySuggestion = new EventEmitter<InitialEducationActivitySuggestion>();

  closeModal(): void {
    this.close.emit();
  }

  apply(suggestion: InitialEducationActivitySuggestion): void {
    this.applySuggestion.emit(suggestion);
  }
}
