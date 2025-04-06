import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../auth/auth.service';
import { Property } from '../../models/property.model';
import { Booking } from '../../models/booking.model';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.scss',
})
export class BookingFormComponent implements OnInit {
  @Input() property!: Property;

  bookingForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Price calculation
  totalPrice = 0;
  nights = 0;

  // Availability check
  isAvailable = true;
  isCheckingAvailability = false;
  minDate = new Date().toISOString().split('T')[0]; // Today's date as min date

  // Booking processing states
  isProcessing = false;
  isCalculating = false;

  // Make Math available in template
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initBookingForm();
  }

  initBookingForm(): void {
    // Get tomorrow's date for default check-in
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get date after tomorrow for default check-out
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    this.bookingForm = this.fb.group({
      checkIn: [tomorrow.toISOString().split('T')[0], Validators.required],
      checkOut: [
        dayAfterTomorrow.toISOString().split('T')[0],
        Validators.required,
      ],
      guests: this.fb.group({
        adults: [
          1,
          [Validators.required, Validators.min(1), Validators.max(10)],
        ],
        children: [
          0,
          [Validators.required, Validators.min(0), Validators.max(6)],
        ],
      }),
      contactInfo: this.fb.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', Validators.required],
      }),
      specialRequests: [''],
    });

    // Pre-fill contact info if user is logged in
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getUser();
      if (user) {
        this.bookingForm.patchValue({
          contactInfo: {
            name: user.name || '',
            email: user.email || '',
          },
        });
      }
    }

    // Calculate price whenever check-in, check-out, or guests change
    this.bookingForm
      .get('checkIn')
      ?.valueChanges.subscribe(() => this.updatePriceAndAvailability());
    this.bookingForm
      .get('checkOut')
      ?.valueChanges.subscribe(() => this.updatePriceAndAvailability());
    this.bookingForm
      .get('guests.adults')
      ?.valueChanges.subscribe(() => this.calculatePrice());
    this.bookingForm
      .get('guests.children')
      ?.valueChanges.subscribe(() => this.calculatePrice());

    // Initial price calculation
    this.updatePriceAndAvailability();
  }

  updatePriceAndAvailability(): void {
    this.checkAvailability();
    this.calculatePrice();
  }

  calculatePrice(): void {
    const checkIn = this.bookingForm.get('checkIn')?.value;
    const checkOut = this.bookingForm.get('checkOut')?.value;
    const guests = this.bookingForm.get('guests')?.value;

    if (!checkIn || !checkOut || !this.property?._id) return;

    this.isCalculating = true;

    // Format dates to ISO string format for API
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    this.bookingService
      .calculateBookingPrice(
        this.property._id,
        checkInDate.toISOString(),
        checkOutDate.toISOString(),
        guests
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.totalPrice = response.data.breakdown.totalPrice;
            this.nights = response.data.breakdown.nights;
          } else {
            console.error('Failed to calculate price');
          }
          this.isCalculating = false;
        },
        error: (err) => {
          console.error('Error calculating price:', err);
          this.isCalculating = false;
        },
      });
  }

  checkAvailability(): void {
    const checkIn = this.bookingForm.get('checkIn')?.value;
    const checkOut = this.bookingForm.get('checkOut')?.value;

    if (!checkIn || !checkOut || !this.property?._id) return;

    this.isCheckingAvailability = true;

    // Format dates to ISO string format for API
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    this.bookingService
      .checkAvailability(
        this.property._id,
        checkInDate.toISOString(),
        checkOutDate.toISOString()
      )
      .subscribe({
        next: (response) => {
          this.isAvailable = response.isAvailable;
          this.isCheckingAvailability = false;
        },
        error: (err) => {
          console.error('Error checking availability:', err);
          this.isAvailable = false;
          this.isCheckingAvailability = false;
        },
      });
  }

  onSubmit(): void {
    if (this.bookingForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      this.markFormGroupTouched(this.bookingForm);
      return;
    }

    if (!this.isAvailable) {
      this.errorMessage =
        'Selected dates are not available. Please choose different dates.';
      return;
    }

    if (!this.authService.isLoggedIn()) {
      // Redirect to login and store booking intent
      localStorage.setItem(
        'bookingIntent',
        JSON.stringify({
          propertyId: this.property._id,
          formData: this.bookingForm.value,
        })
      );
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/properties/${this.property._id}` },
      });
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';
    this.successMessage = '';

    const bookingData: Booking = {
      propertyId: this.property._id || '',
      checkIn: new Date(this.bookingForm.get('checkIn')?.value).toISOString(),
      checkOut: new Date(this.bookingForm.get('checkOut')?.value).toISOString(),
      totalPrice: this.totalPrice,
      guests: this.bookingForm.get('guests')?.value,
      contactInfo: this.bookingForm.get('contactInfo')?.value,
      specialRequests: this.bookingForm.get('specialRequests')?.value,
      status: 'pending',
    };

    this.bookingService.createBooking(bookingData).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Booking request submitted successfully!';
          // Reset form after successful booking
          this.bookingForm.reset();
          this.initBookingForm();
        } else {
          this.errorMessage =
            response.message || 'Failed to create booking. Please try again.';
        }
        this.isProcessing = false;
      },
      error: (err) => {
        console.error('Error creating booking:', err);
        this.errorMessage =
          err.error?.message ||
          'An error occurred while processing your booking. Please try again.';
        this.isProcessing = false;
      },
    });
  }

  // Helper to mark all form controls as touched
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Get today's date formatted for min input
  get today(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Get tomorrow's date formatted for min input
  getTomorrow(date: string): string {
    const selectedDate = new Date(date);
    selectedDate.setDate(selectedDate.getDate() + 1);
    return selectedDate.toISOString().split('T')[0];
  }
}
