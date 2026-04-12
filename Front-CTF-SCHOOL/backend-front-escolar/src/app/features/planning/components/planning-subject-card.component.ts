import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SubjectGroup, DocumentItem } from '../../../core/models/planning.models';
import { PlanningUnitCardComponent } from './planning-unit-card.component';

@Component({
  selector: 'app-planning-subject-card',
  standalone: true,
  imports: [MatIconModule, PlanningUnitCardComponent],
  templateUrl: './planning-subject-card.component.html',
  styleUrl: './planning-subject-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningSubjectCardComponent {
  @Input({ required: true }) subject!: SubjectGroup;
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Input() deletingDocumentId: number | null = null;

  @Output() downloadDocument = new EventEmitter<DocumentItem>();
  @Output() deleteDocument = new EventEmitter<DocumentItem>();
}
