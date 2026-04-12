import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionAsignaturasComponent } from './gestion-asignaturas.component';

describe('GestionAsignaturasComponent', () => {
  let component: GestionAsignaturasComponent;
  let fixture: ComponentFixture<GestionAsignaturasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GestionAsignaturasComponent]
    });
    fixture = TestBed.createComponent(GestionAsignaturasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
