import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../auth/auth.service';
import { Property } from '../../models/property.model';
import { Booking } from '../../models/booking.model';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import Swal from 'sweetalert2';
import { faCalendar, faUser, faEnvelope, faPhone, faExclamationTriangle, faExclamationCircle, faCheckCircle, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule
  ],
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.scss',
})
export class BookingFormComponent implements OnInit{ 
  @Input() property!: Property;
  

  // Icons
  icons = {
    calendar: faCalendar,
    user: faUser,
    email: faEnvelope,
    phone: faPhone,
    warning: faExclamationTriangle,
    error: faExclamationCircle,
    success: faCheckCircle,
    minus: faMinus,
    plus: faPlus
  };

  // Form
  bookingForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  isProcessing = false;
  isCalculating = false;
  isCheckingAvailability = false;
  isAvailable = true;

  // View state
  isMonthView = true;

  // Pricing
  totalPrice = 0;
  basePrice = 0;
  serviceFee = 0;
  daysInMonth = 0;

  // Dates
  currentMonth = new Date().toISOString().slice(0, 7);
  selectedDate: string = '';
  canSubmitBooking = false;
  currentUser: any = null;


  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService,
    private authService: AuthService,
    private router: Router
  ) {}

   ngOnInit(): void {
    this.initBookingFormStructure();
    this.subscribeToCurrentUser();
  }


  private subscribeToCurrentUser(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        if (user) {
          this.canSubmitBooking = !!user.isVerified;
          this.prefillFormWithUserData(user);
          if (!user.isVerified) {
            console.log("User is not verified. Verification status:", user.isVerified);
          }
        } else {
          this.canSubmitBooking = false;
          this.prefillFormWithDefaults();
        }
      },
      error: (err) => {
        console.error("Error fetching current user:", err);
        this.currentUser = null;
        this.canSubmitBooking = false;
        this.prefillFormWithDefaults();
      }
    });
  }

  private prefillFormWithUserData(user: any): void {
    if (this.bookingForm) {
      this.bookingForm.patchValue({
        contactInfo: {
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || ''
        }
      });
    }
  }

  private prefillFormWithDefaults(): void {
    if (this.bookingForm) { // Ensure bookingForm is initialized
      this.bookingForm.patchValue({
        contactInfo: {
          name: '',
          email: '',
          phone: ''
        }
      });
    }
  }

  handleBookingClick(): void {
    if (this.bookingForm.invalid || this.isProcessing || !this.isAvailable) {
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.saveBookingIntent();
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    if (!this.canSubmitBooking) {
      this.showVerificationWarning();
      return;
    }

    this.onSubmit();
  }

  private showVerificationWarning(): void {
    Swal.fire({
      icon: 'warning',
      title: 'Account not validated',
      text: 'Please verify your email address to continue booking.',
      confirmButtonText: 'Got it',
      footer: '<a href="/resend-verification">Resend verification email</a>'
    });
  }



  initBookingFormStructure(): void {
    const currentDate = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const nextMonthString = nextMonth.toISOString().slice(0, 7);
    const today = new Date().toISOString().slice(0, 10);

    this.bookingForm = this.fb.group({
      bookingMonth: [nextMonthString, Validators.required],
      bookingDate: [today, Validators.required],
      guests: this.fb.group({
        adults: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
        children: [0, [Validators.required, Validators.min(0), Validators.max(6)]]
      }),
      contactInfo: this.fb.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', Validators.required]
      }),
      specialRequests: ['']
    });

    this.setupFormListeners();
    this.updatePriceAndAvailability();
  }

  private setupFormListeners(): void {
    this.bookingForm.get('bookingMonth')?.valueChanges.subscribe(() => this.updatePriceAndAvailability());
    this.bookingForm.get('bookingDate')?.valueChanges.subscribe(() => {
      if (!this.isMonthView) this.updatePriceAndAvailability();
    });
    this.bookingForm.get('guests')?.valueChanges.subscribe(() => this.calculatePrice());
  }

  onViewChanged(view: 'day' | 'month'): void {
    this.isMonthView = view === 'month';
    this.updateValidators();
    this.updatePriceAndAvailability();
  }

  private updateValidators(): void {
    if (this.isMonthView) {
      this.bookingForm.get('bookingMonth')?.setValidators(Validators.required);
      this.bookingForm.get('bookingDate')?.clearValidators();
    } else {
      this.bookingForm.get('bookingDate')?.setValidators(Validators.required);
      this.bookingForm.get('bookingMonth')?.clearValidators();
    }
    this.bookingForm.get('bookingMonth')?.updateValueAndValidity();
    this.bookingForm.get('bookingDate')?.updateValueAndValidity();
  }

  updatePriceAndAvailability(): void {
    this.checkAvailability();
    this.calculatePrice();
  }

  calculatePrice(): void {
    const bookingMonth = this.getBookingMonth();
    if (!bookingMonth || !this.property?._id) return;

    this.isCalculating = true;
    const guests = this.bookingForm.get('guests')?.value;

    this.bookingService.calculateBookingPrice(this.property._id, bookingMonth, guests).subscribe({
      next: (response) => {
        if (response.success && response.data?.breakdown) {
          this.totalPrice = response.data.breakdown.totalPrice;
          this.basePrice = response.data.breakdown.basePrice;
          this.serviceFee = response.data.breakdown.serviceFee;
          this.daysInMonth = this.isMonthView ? response.data.breakdown.daysInMonth || 0 : 1;
        }
        this.isCalculating = false;
      },
      error: (err) => {
        console.error('Error calculating price:', err);
        this.isCalculating = false;
      }
    });
  }

  checkAvailability(): void {
    const bookingMonth = this.getBookingMonth();
    const bookingDate = this.isMonthView ? null : this.bookingForm.get('bookingDate')?.value;

    if (!this.property?._id || (this.isMonthView && !bookingMonth) || (!this.isMonthView && !bookingDate)) return;

    this.isCheckingAvailability = true;

    this.bookingService.checkAvailability(
      this.property._id,
      bookingMonth,
      bookingDate
    ).subscribe({
      next: (response) => {
        this.isAvailable = response.isAvailable;
        this.isCheckingAvailability = false;
      },
      error: (err) => {
        console.error('Error checking availability:', err);
        this.isAvailable = false;
        this.isCheckingAvailability = false;
      }
    });
  }
  



  onSubmit(): void {
    if (this.bookingForm.invalid) {
      this.markFormGroupTouched(this.bookingForm);
      return;
    }
    if (!this.canSubmitBooking) {
      alert('Your account must be validated before making a booking.');
      return;
    }

    if (!this.isAvailable) {
      this.errorMessage = this.isMonthView
        ? 'Selected month is not available. Please choose a different month.'
        : 'Selected date is not available. Please choose a different date.';
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.saveBookingIntent();
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/properties/${this.property._id}` }
      });
      return;
    }

    this.processBooking();
  }

  private processBooking(): void {
    this.isProcessing = true;
    this.errorMessage = '';
    this.successMessage = '';

    const bookingData = this.buildBookingData();

    this.bookingService.createBooking(bookingData).subscribe({
      next: (response) => {
        if (response.success) {
          this.handleBookingSuccess();
        } else {
          this.errorMessage = response.message || 'Failed to create booking. Please try again.';
        }
        this.isProcessing = false;
      },
      error: (err) => {
        this.handleBookingError(err);
        this.isProcessing = false;
      }
    });
  }

  private handleBookingSuccess(): void {
    this.successMessage = 'Booking request submitted successfully!';
    this.bookingForm.reset();
    this.initBookingFormStructure(); // Corrected from initBookingForm
  }

  private handleBookingError(err: any): void {
    console.error('Error creating booking:', err);
    this.errorMessage = err.error?.message ||
      'An error occurred while processing your booking. Please try again.';
  }

  private saveBookingIntent(): void {
    localStorage.setItem('bookingIntent', JSON.stringify({
      propertyId: this.property._id,
      formData: this.bookingForm.value,
      isMonthView: this.isMonthView
    }));
  }

  private buildBookingData(): Booking {
    return {
      propertyId: this.property._id ?? '',
      bookingMonth: this.isMonthView ? this.bookingForm.get('bookingMonth')?.value : null,
      bookingDate: this.isMonthView ? null : this.bookingForm.get('bookingDate')?.value,
      isMonthlyBooking: this.isMonthView,
      totalPrice: this.totalPrice,
      guests: this.bookingForm.get('guests')?.value,
      contactInfo: this.bookingForm.get('contactInfo')?.value,
      specialRequests: this.bookingForm.get('specialRequests')?.value,
      status: 'pending'
    };
  }

 private getBookingMonth(): string {
  if (this.isMonthView) {
    return this.bookingForm.get('bookingMonth')?.value || '';
  } else {
    const dateValue = this.bookingForm.get('bookingDate')?.value;
    let dateString = '';

    if (dateValue instanceof Date) {
      dateString = dateValue.toISOString().slice(0, 10);
    } else if (typeof dateValue === 'string') {
      dateString = dateValue.slice(0, 10);
    }

    return dateString.slice(0, 7); // YYYY-MM
  }
}

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  adjustGuests(field: 'adults' | 'children', amount: number): void {
    const control = this.bookingForm.get(`guests.${field}`);
    if (control) {
      const newValue = control.value + amount;
      if (
        (field === 'adults' && newValue >= 1 && newValue <= 10) ||
        (field === 'children' && newValue >= 0 && newValue <= 6)
      ) {
        control.setValue(newValue);
      }
    }
  }
}

