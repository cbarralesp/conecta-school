import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DocumentItem } from '../../../core/models/planning.models';

@Component({
  selector: 'app-planning-document-card',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatIconModule],
  templateUrl: './planning-document-card.component.html',
  styleUrl: './planning-document-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningDocumentCardComponent {
  @Input({ required: true }) document!: DocumentItem;
  @Input() compact = false;
  @Input() deleting = false;

  @Output() downloadDocument = new EventEmitter<DocumentItem>();
  @Output() deleteDocument = new EventEmitter<DocumentItem>();

  iconName(): string {
    switch (this.document.type) {
      case 'WORD':
        return 'description';
      case 'PDF':
        return 'picture_as_pdf';
      case 'PPT':
        return 'slideshow';
      default:
        return 'insert_drive_file';
    }
  }

  toneClass(): string {
    switch (this.document.type) {
      case 'WORD':
        return 'tone-word';
      case 'PDF':
        return 'tone-pdf';
      case 'PPT':
        return 'tone-ppt';
      default:
        return 'tone-other';
    }
  }

  typeLabel(): string {
    switch (this.document.type) {
      case 'WORD':
        return 'Word';
      case 'PDF':
        return 'PDF';
      case 'PPT':
        return 'PPT';
      default:
        return 'Otro';
    }
  }

  download(): void {
    this.downloadDocument.emit(this.document);
  }

  delete(): void {
    this.deleteDocument.emit(this.document);
  }
}
