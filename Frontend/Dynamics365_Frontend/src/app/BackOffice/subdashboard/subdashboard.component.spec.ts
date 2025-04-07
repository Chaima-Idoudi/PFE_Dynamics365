import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubdashboardComponent } from './subdashboard.component';

describe('SubdashboardComponent', () => {
  let component: SubdashboardComponent;
  let fixture: ComponentFixture<SubdashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubdashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubdashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
