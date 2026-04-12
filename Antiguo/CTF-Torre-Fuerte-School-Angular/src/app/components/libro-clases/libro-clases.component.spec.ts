import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LibroClasesComponent } from './libro-clases.component';

describe('LibroClasesComponent', () => {
  let component: LibroClasesComponent;
  let fixture: ComponentFixture<LibroClasesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LibroClasesComponent]
    });
    fixture = TestBed.createComponent(LibroClasesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
