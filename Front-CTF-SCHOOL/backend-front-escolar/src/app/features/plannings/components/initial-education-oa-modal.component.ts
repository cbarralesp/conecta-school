import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface InitialEducationObjectiveOption {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  eje?: string;
  indicadores: string[];
  activities?: Array<{
    number: number | null;
    description: string;
  }>;
}

export interface InitialEducationSelectedObjective {
  id: string;
  codigo: string;
  descripcion: string;
  eje?: string;
  evaluationIndicators: string[];
}

@Component({
  selector: 'app-initial-education-oa-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './initial-education-oa-modal.component.html',
  styleUrl: './initial-education-oa-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InitialEducationOaModalComponent implements OnChanges {
  @Input() open = false;
  @Input() courseLabel = '';
  @Input() subjectLabel = '';
  @Input() ambitLabel = '';
  @Input() nucleusLabel = '';
  @Input() objectives: InitialEducationObjectiveOption[] = [];
  @Input() preselectedObjectiveIds: string[] = [];
  @Input() preselectedIndicatorKeys: string[] = [];

  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly applySelection = new EventEmitter<InitialEducationSelectedObjective[]>();

  expandedObjectiveId: string | null = null;
  selectedObjectiveIds = new Set<string>();
  selectedIndicatorKeys = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue) {
      this.initializeState();
    }
  }

  get hasSelection(): boolean {
    return this.selectedObjectiveIds.size > 0;
  }

  isExpanded(objectiveId: string): boolean {
    return this.expandedObjectiveId === objectiveId;
  }

  toggleExpanded(objectiveId: string): void {
    this.expandedObjectiveId = this.expandedObjectiveId === objectiveId ? null : objectiveId;
  }

  selectObjectiveCard(objective: InitialEducationObjectiveOption): void {
    this.toggleObjective(objective);
  }

  toggleObjective(objective: InitialEducationObjectiveOption): void {
    if (this.selectedObjectiveIds.has(objective.id)) {
      this.selectedObjectiveIds.delete(objective.id);
      for (const indicator of objective.indicadores) {
        this.selectedIndicatorKeys.delete(this.buildIndicatorKey(objective.id, indicator));
      }
      return;
    }

    this.selectedObjectiveIds.add(objective.id);
    for (const indicator of objective.indicadores) {
      this.selectedIndicatorKeys.add(this.buildIndicatorKey(objective.id, indicator));
    }
  }

  toggleIndicator(objective: InitialEducationObjectiveOption, indicator: string): void {
    const key = this.buildIndicatorKey(objective.id, indicator);

    if (this.selectedIndicatorKeys.has(key)) {
      this.selectedIndicatorKeys.delete(key);
    } else {
      this.selectedIndicatorKeys.add(key);
    }

    const selectedCount = objective.indicadores.filter((item) =>
      this.selectedIndicatorKeys.has(this.buildIndicatorKey(objective.id, item))
    ).length;

    if (selectedCount > 0) {
      this.selectedObjectiveIds.add(objective.id);
    } else {
      this.selectedObjectiveIds.delete(objective.id);
    }
  }

  isObjectiveSelected(objectiveId: string): boolean {
    return this.selectedObjectiveIds.has(objectiveId);
  }

  isIndicatorSelected(objectiveId: string, indicator: string): boolean {
    return this.selectedIndicatorKeys.has(this.buildIndicatorKey(objectiveId, indicator));
  }

  closeModal(): void {
    this.close.emit();
  }

  apply(): void {
    const selected = this.objectives
      .filter((objective) => this.selectedObjectiveIds.has(objective.id))
      .map((objective) => ({
        id: objective.id,
        codigo: objective.codigo,
        descripcion: objective.descripcion,
        eje: objective.eje,
        evaluationIndicators: objective.indicadores.filter((indicator) =>
          this.selectedIndicatorKeys.has(this.buildIndicatorKey(objective.id, indicator))
        )
      }))
      .filter((objective) => objective.evaluationIndicators.length > 0);

    this.applySelection.emit(selected);
  }

  private initializeState(): void {
    this.selectedObjectiveIds = new Set(this.preselectedObjectiveIds);
    this.selectedIndicatorKeys = new Set(this.preselectedIndicatorKeys);

    if (!this.selectedIndicatorKeys.size) {
      for (const objective of this.objectives) {
        if (!this.selectedObjectiveIds.has(objective.id)) {
          continue;
        }

        for (const indicator of objective.indicadores) {
          this.selectedIndicatorKeys.add(this.buildIndicatorKey(objective.id, indicator));
        }
      }
    }

    this.expandedObjectiveId = null;
  }

  private buildIndicatorKey(objectiveId: string, indicator: string): string {
    return `${objectiveId}::${indicator}`;
  }
}
