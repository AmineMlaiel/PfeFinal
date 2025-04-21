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
  
  // For delete confirmation modal
  showDeleteModal = false;
  bookingToDelete: string = '';

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
          // Handle both monthly bookings and legacy bookings
          if (booking.bookingMonth) {
            const bookingDate = new Date(booking.bookingMonth);
            const lastDayOfMonth = new Date(bookingDate.getFullYear(), bookingDate.getMonth() + 1, 0);
            return lastDayOfMonth >= today && booking.status !== 'cancelled';
          } else if (booking.checkOut) {
            const checkOutDate = new Date(booking.checkOut);
            return checkOutDate >= today && booking.status !== 'cancelled';
          }
          return false;
        });
        break;
      case 'past':
        this.filteredBookings = this.bookings.filter((booking) => {
          // Handle both monthly bookings and legacy bookings
          if (booking.bookingMonth) {
            const bookingDate = new Date(booking.bookingMonth);
            const lastDayOfMonth = new Date(bookingDate.getFullYear(), bookingDate.getMonth() + 1, 0);
            return lastDayOfMonth < today && booking.status !== 'cancelled';
          } else if (booking.checkOut) {
            const checkOutDate = new Date(booking.checkOut);
            return checkOutDate < today && booking.status !== 'cancelled';
          }
          return false;
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

  // New method to confirm deletion with modal
  confirmDeleteBooking(bookingId: string): void {
    this.bookingToDelete = bookingId;
    this.showDeleteModal = true;
  }
  
  deleteBooking(): void {
    if (!this.bookingToDelete) {
      this.showDeleteModal = false;
      return;
    }
  
    this.bookingService.deleteBooking(this.bookingToDelete).subscribe({
      next: (response) => {
        // Remove the booking from the local array
        this.bookings = this.bookings.filter((b) => b._id !== this.bookingToDelete);
        this.applyFilter(this.activeFilter);  // Reapply any filters
        alert('Booking request deleted successfully.');
      },
      error: (err) => {
        console.error('Error deleting booking:', err);
        alert(err.error?.message || 'An error occurred while deleting the booking request.');
      },
      complete: () => {
        this.showDeleteModal = false;  // Hide the modal after operation
        this.bookingToDelete = '';     // Reset the booking to delete
      }
    });
  }
  
  

  // Helper method to check if booking is cancellable (e.g., not in the past and not already cancelled)
 // Can the booking be canceled?
canCancelBooking(booking: Booking): boolean {
  const today = new Date();
  // Check if it's a monthly booking or a regular booking
  if (booking.bookingMonth) {
    const bookingDate = new Date(booking.bookingMonth);
    const lastDayOfMonth = new Date(bookingDate.getFullYear(), bookingDate.getMonth() + 1, 0);
    return lastDayOfMonth >= today && booking.status !== 'cancelled' && booking.status !== 'completed';
  } else if (booking.checkIn) {
    const checkInDate = new Date(booking.checkIn);
    return checkInDate > today && booking.status !== 'cancelled' && booking.status !== 'completed';
  }
  return false;
}

// Can the booking be deleted? (Check pending status and canDelete flag)
canDeleteBooking(booking: Booking): boolean {
  return booking.status === 'pending' && (booking.canDelete !== false);
}


  // Helper method to format date for display
  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Helper method to format month for display
  formatMonth(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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
