import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PlanningDocumentFileType } from '../../../core/models/planning.models';

type DocumentTypeFilter = 'ALL' | PlanningDocumentFileType;
type DocumentViewMode = 'grid' | 'list';

@Component({
  selector: 'app-planning-documents-toolbar',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './planning-documents-toolbar.component.html',
  styleUrl: './planning-documents-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningDocumentsToolbarComponent {
  @Input() activeType: DocumentTypeFilter = 'ALL';
  @Input() viewMode: DocumentViewMode = 'grid';
  @Input() selectedSubjectId: number | 'ALL' = 'ALL';
  @Input() selectedSemester = 'ALL';
  @Input() searchTerm = '';
  @Input() typeChips: Array<{ code: DocumentTypeFilter; label: string; count: number }> = [];
  @Input() subjectOptions: Array<{ id: number; name: string }> = [];
  @Input() semesterOptions: string[] = [];

  @Output() activeTypeChange = new EventEmitter<DocumentTypeFilter>();
  @Output() viewModeChange = new EventEmitter<DocumentViewMode>();
  @Output() selectedSubjectIdChange = new EventEmitter<number | 'ALL'>();
  @Output() selectedSemesterChange = new EventEmitter<string>();
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() uploadRequested = new EventEmitter<void>();
}
