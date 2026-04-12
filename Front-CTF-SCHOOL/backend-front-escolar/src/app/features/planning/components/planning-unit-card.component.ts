import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DocumentItem, UnitGroup } from '../../../core/models/planning.models';
import { PlanningDocumentCardComponent } from './planning-document-card.component';

@Component({
  selector: 'app-planning-unit-card',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, PlanningDocumentCardComponent],
  templateUrl: './planning-unit-card.component.html',
  styleUrl: './planning-unit-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningUnitCardComponent {
  @Input({ required: true }) unit!: UnitGroup;
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Input() deletingDocumentId: number | null = null;

  @Output() downloadDocument = new EventEmitter<DocumentItem>();
  @Output() deleteDocument = new EventEmitter<DocumentItem>();

  readonly expanded = signal(false);
  readonly visibleDocuments = computed(() =>
    this.expanded() ? this.unit.documents : this.unit.documents.slice(0, 3)
  );
  readonly remainingDocuments = computed(() => Math.max(this.unit.documents.length - 3, 0));

  toggleExpanded(): void {
    this.expanded.update((value) => !value);
  }
}
