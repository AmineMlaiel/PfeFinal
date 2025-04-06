import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PropertyApprovalComponent } from './property-approval.component';

describe('PropertyApprovalComponent', () => {
  let component: PropertyApprovalComponent;
  let fixture: ComponentFixture<PropertyApprovalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PropertyApprovalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PropertyApprovalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
