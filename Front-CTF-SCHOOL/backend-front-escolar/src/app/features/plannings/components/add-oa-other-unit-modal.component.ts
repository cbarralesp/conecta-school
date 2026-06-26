import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface OtherUnitObjectiveOption {
  id: string;
  codigo: string;
  descripcion: string;
  eje?: string;
  unitNumber: number | null;
  unitName: string;
}

export interface OtherUnitOption {
  key: string;
  number: number;
  name: string;
  type?: 'unit' | 'transversal';
  helperText?: string;
  objectives: OtherUnitObjectiveOption[];
}

@Component({
  selector: 'app-add-oa-other-unit-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './add-oa-other-unit-modal.component.html',
  styleUrl: './add-oa-other-unit-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddOaOtherUnitModalComponent implements OnChanges {
  @Input() open = false;
  @Input() subjectLabel = '';
  @Input() courseLabel = '';
  @Input() units: OtherUnitOption[] = [];
  @Input() currentUnitNumber: number | null = null;
  @Input() preselectedObjectiveIds: string[] = [];

  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly applySelection = new EventEmitter<OtherUnitObjectiveOption[]>();

  activeUnitKey: string | null = null;
  selectedObjectiveIds = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue) {
      this.initializeState();
      return;
    }

    if ((changes['units'] || changes['currentUnitNumber'] || changes['preselectedObjectiveIds']) && this.open) {
      this.initializeState();
    }
  }

  get activeUnit(): OtherUnitOption | null {
    return this.units.find((unit) => unit.key === this.activeUnitKey) ?? null;
  }

  get activeObjectives(): OtherUnitObjectiveOption[] {
    return this.activeUnit?.objectives ?? [];
  }

  get hasSelection(): boolean {
    return this.selectedObjectiveIds.size > 0;
  }

  selectUnit(unitKey: string): void {
    this.activeUnitKey = unitKey;
  }

  toggleObjective(objective: OtherUnitObjectiveOption): void {
    if (this.selectedObjectiveIds.has(objective.id)) {
      this.selectedObjectiveIds.delete(objective.id);
      return;
    }

    this.selectedObjectiveIds.add(objective.id);
  }

  isObjectiveSelected(objectiveId: string): boolean {
    return this.selectedObjectiveIds.has(objectiveId);
  }

  getBadgeClass(axis?: string): string {
    const normalizedAxis = (axis ?? '').toLowerCase();
    if (normalizedAxis.includes('escrit')) {
      return 'oa-badge--green';
    }
    if (normalizedAxis.includes('oral')) {
      return 'oa-badge--amber';
    }
    return 'oa-badge--blue';
  }

  closeModal(): void {
    this.close.emit();
  }

  apply(): void {
    const selected = this.units
      .flatMap((unit) => unit.objectives)
      .filter((objective) => this.selectedObjectiveIds.has(objective.id));

    this.applySelection.emit(selected);
  }

  private initializeState(): void {
    this.selectedObjectiveIds = new Set(this.preselectedObjectiveIds);
    const currentUnit = this.units.find((unit) => unit.number === this.currentUnitNumber && unit.type !== 'transversal');
    const defaultUnit = currentUnit
      ?? this.units.find((unit) => unit.type !== 'transversal')
      ?? this.units[0]
      ?? null;
    this.activeUnitKey = defaultUnit?.key ?? null;
  }
}
