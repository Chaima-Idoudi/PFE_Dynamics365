import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserCaseDetailsComponent } from './user-case-details.component';

describe('UserCaseDetailsComponent', () => {
  let component: UserCaseDetailsComponent;
  let fixture: ComponentFixture<UserCaseDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCaseDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserCaseDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
