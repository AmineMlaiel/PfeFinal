import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../auth/auth.service';
import { Booking } from '../../models/booking.model';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-bookings.component.html',
  styleUrl: './my-bookings.component.scss',
})
export class MyBookingsComponent implements OnInit {
  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  loading = true;
  error: string | null = null;
  activeFilter: 'all' | 'upcoming' | 'past' | 'cancelled' = 'all';
  isUserLoggedIn = false;

  constructor(
    private bookingService: BookingService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check if user is logged in using the Observable
    this.authService.isLoggedIn().subscribe((loggedIn) => {
      this.isUserLoggedIn = loggedIn;

      if (!loggedIn) {
        this.error = 'You must be logged in to view your bookings.';
        this.loading = false;
        return;
      }

      // Only load bookings if the user is logged in
      this.loadBookings();
    });
  }

  loadBookings(): void {
    if (!this.isUserLoggedIn) {
      this.error = 'You must be logged in to view your bookings.';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;

    this.bookingService.getMyBookings().subscribe({
      next: (response) => {
        if (response.success) {
          this.bookings = Array.isArray(response.data) ? response.data : [];
          this.applyFilter(this.activeFilter);
          console.log('Bookings loaded:', this.bookings);
        } else {
          this.error = response.message || 'Failed to load bookings.';
          this.bookings = [];
          this.filteredBookings = [];
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading bookings:', err);
        this.error =
          err.error?.message ||
          'An error occurred while loading your bookings.';
        this.loading = false;
        this.bookings = [];
        this.filteredBookings = [];
      },
    });
  }

  applyFilter(filter: 'all' | 'upcoming' | 'past' | 'cancelled'): void {
    this.activeFilter = filter;
    const today = new Date();

    switch (filter) {
      case 'all':
        this.filteredBookings = [...this.bookings];
        break;
      case 'upcoming':
        this.filteredBookings = this.bookings.filter((booking) => {
          const checkOutDate = new Date(booking.checkOut);
          return checkOutDate >= today && booking.status !== 'cancelled';
        });
        break;
      case 'past':
        this.filteredBookings = this.bookings.filter((booking) => {
          const checkOutDate = new Date(booking.checkOut);
          return checkOutDate < today && booking.status !== 'cancelled';
        });
        break;
      case 'cancelled':
        this.filteredBookings = this.bookings.filter(
          (booking) => booking.status === 'cancelled'
        );
        break;
    }
  }

  cancelBooking(bookingId: string): void {
    if (
      !confirm(
        'Are you sure you want to cancel this booking? This action cannot be undone.'
      )
    ) {
      return;
    }

    this.bookingService.cancelBooking(bookingId).subscribe({
      next: (response) => {
        if (response.success) {
          // Update booking status in the local array
          const bookingIndex = this.bookings.findIndex(
            (b) => b._id === bookingId
          );
          if (bookingIndex !== -1) {
            this.bookings[bookingIndex].status = 'cancelled';
            this.applyFilter(this.activeFilter);
          }
          alert('Booking cancelled successfully.');
        } else {
          alert(response.message || 'Failed to cancel booking.');
        }
      },
      error: (err) => {
        console.error('Error cancelling booking:', err);
        alert(
          err.error?.message ||
            'An error occurred while cancelling the booking.'
        );
      },
    });
  }

  // Helper method to check if booking is cancellable (e.g., not in the past and not already cancelled)
  canCancelBooking(booking: Booking): boolean {
    const today = new Date();
    const checkInDate = new Date(booking.checkIn);
    return (
      checkInDate > today &&
      booking.status !== 'cancelled' &&
      booking.status !== 'completed'
    );
  }

  // Helper method to format date for display
  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Helper to calculate number of nights
  calculateNights(checkIn: string | Date, checkOut: string | Date): number {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Get status label class based on booking status
  getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'status-confirmed';
      case 'pending':
        return 'status-pending';
      case 'cancelled':
        return 'status-cancelled';
      case 'completed':
        return 'status-completed';
      default:
        return '';
    }
  }
}
