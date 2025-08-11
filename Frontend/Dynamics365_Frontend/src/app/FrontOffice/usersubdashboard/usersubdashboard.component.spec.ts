import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsersubdashboardComponent } from './usersubdashboard.component';

describe('UsersubdashboardComponent', () => {
  let component: UsersubdashboardComponent;
  let fixture: ComponentFixture<UsersubdashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersubdashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsersubdashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
