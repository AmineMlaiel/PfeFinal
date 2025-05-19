import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Add this import
import { RouterModule } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../auth/auth.service';
import { Booking } from '../../models/booking.model';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// interfaces
interface User {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  FirstName?: string;
  LastName?: string;
  profileImage?: string;
}

interface booking {
  _id: string;
  conversation?: Array<{
    message: string;
    sender: User;
    createdAt: Date;
  }>;
}
interface RawMessage {
  _id: string;
  message: string;
  sender: {
    _id: string;
    name: string;
  };
  attachments?: any[];
  createdAt: string;
}

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatSnackBarModule],
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
  // chat variables
  demands: booking[] = [];
  message: string = '';
isLoadingMessages: Record<string, boolean> = {};
  isSending: boolean = false;
  private messageDebounceTimer: any;
  currentUserId: string = '';
  
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
      
      // Get the current user ID
      this.authService.getCurrentUser().subscribe(user => {
        if (user) {
          this.currentUserId = user._id || user.id || '';
        }
      });
        
      // Only load bookings if the user is logged in
      this.loadBookings();
    });
  }

  scrollToBottom(delay: number = 100): void {
    setTimeout(() => {
      const chatContainers = document.querySelectorAll('.max-h-64.overflow-y-auto');
      chatContainers.forEach(container => {
        container.scrollTop = container.scrollHeight;
      });
    }, delay);
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
        this.bookings = (Array.isArray(response.data) ? response.data : [])
          .map(booking => ({
            ...booking,
            conversation: booking.preBookingMessages?.map((msg: RawMessage) => ({
              _id: msg._id,
              message: msg.message,
              sender: {
                _id: msg.sender, // This comes as string
                firstName: typeof msg.sender === 'string' ? 'User' : msg.sender.name.split(' ')[0] || 'User',
                lastName: typeof msg.sender === 'string' ? '' : msg.sender.name.split(' ')[1] || '',
                profileImage: ''
              },
              createdAt: new Date(msg.createdAt),
              attachments: msg.attachments || []
            })) || []
          }));

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

  async getMessages(demand: booking): Promise<void> {
    if (!demand._id) return;
    try {
      this.isLoadingMessages[demand._id] = true;
      const response = await this.bookingService.getMessages(demand._id).toPromise();
      if (response?.success && response.data?.messages) {
        demand.conversation = (response.data.messages as RawMessage[]).map((message) => ({
          _id: message._id,
          message: message.message,
          sender: {
            _id: message.sender._id,
            firstName: message.sender.name.split(' ')[0],
            lastName: message.sender.name.split(' ')[1] || '',
            profileImage: ''
          },
          attachments: message.attachments || [],
          createdAt: new Date(message.createdAt)
        }));
        
        // Scroll to the bottom of the chat after messages are loaded
        this.scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to load messages', error);
    } finally {
      this.isLoadingMessages[demand._id] = false;
    }
  }

  async sendMessage(demand: booking, index: number): Promise<void> {
    if (!this.message.trim()) return;
    clearTimeout(this.messageDebounceTimer);
    this.messageDebounceTimer = setTimeout(async () => {
      try {
        this.isSending = true;
        const response = await this.bookingService.sendMessage(demand._id, this.message).toPromise();
        if (response?.success && response.conversation) {
          const newMessage = {
            _id: response.conversation._id,
            message: response.conversation.message,
            sender: {
              _id: response.conversation.sender._id,
              firstName: response.conversation.sender.name.split(' ')[0],
              lastName: response.conversation.sender.name.split(' ')[1] || '',
              profileImage: ''
            },
            attachments: response.conversation.attachments || [],
            createdAt: new Date(response.conversation.createdAt)
          };
          if (demand.conversation) {
            demand.conversation.push(newMessage);
          } else {
            demand.conversation = [newMessage];
          }
          this.message = '';
          
          // Scroll to the bottom after adding a new message
          this.scrollToBottom();
        }
      } catch (error) {
        console.error('Failed to send message', error);
      } finally {
        this.isSending = false;
      }
    }, 500);
  }
  activeChat: string | null = null;

toggleChat(bookingId: string): void {
  this.activeChat = this.activeChat === bookingId ? null : bookingId;
}

}