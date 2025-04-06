import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeSweethomeComponent } from './home-sweethome.component';

describe('HomeSweethomeComponent', () => {
  let component: HomeSweethomeComponent;
  let fixture: ComponentFixture<HomeSweethomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeSweethomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeSweethomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
