import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultarAsistenciaComponent } from './consultar-asistencia.component';

describe('ConsultarAsistenciaComponent', () => {
  let component: ConsultarAsistenciaComponent;
  let fixture: ComponentFixture<ConsultarAsistenciaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConsultarAsistenciaComponent]
    });
    fixture = TestBed.createComponent(ConsultarAsistenciaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
