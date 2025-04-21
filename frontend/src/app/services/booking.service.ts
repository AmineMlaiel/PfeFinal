import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Booking, BookingResponse } from '../models/booking.model';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private apiUrl = 'http://localhost:3900/api/bookings';

  constructor(private http: HttpClient, private authService: AuthService) {}

  // Create a new booking
  createBooking(bookingData: Booking): Observable<BookingResponse> {
    const headers = this.authService.getHttpHeaders();
    return this.http.post<BookingResponse>(this.apiUrl, bookingData, {
      headers,
    });
  }

  // Get all bookings for the current user
  getMyBookings(): Observable<BookingResponse> {
    const headers = this.authService.getHttpHeaders();
    return this.http.get<BookingResponse>(`${this.apiUrl}/my-bookings`, {
      headers,
    });
  }

  // Get bookings for a specific property (for owner)
  getPropertyBookings(propertyId: string): Observable<BookingResponse> {
    const headers = this.authService.getHttpHeaders();
    return this.http.get<BookingResponse>(
      `${this.apiUrl}/property/${propertyId}`,
      { headers }
    );
  }

  // Get a single booking by ID
  getBookingById(bookingId: string): Observable<BookingResponse> {
    const headers = this.authService.getHttpHeaders();
    return this.http.get<BookingResponse>(`${this.apiUrl}/${bookingId}`, {
      headers,
    });
  }

  // Update booking status (confirm or cancel)
  updateBookingStatus(
    bookingId: string,
    status: 'confirmed' | 'cancelled' | 'completed'
  ): Observable<BookingResponse> {
    const headers = this.authService.getHttpHeaders();
    return this.http.put<BookingResponse>(
      `${this.apiUrl}/${bookingId}/status`,
      { status },
      { headers }
    );
  }

  // Cancel a booking (user side)
  cancelBooking(bookingId: string): Observable<BookingResponse> {
    return this.updateBookingStatus(bookingId, 'cancelled');
  }

  // Delete a booking (user side)
  deleteBooking(bookingId: string): Observable<any> {
    const headers = this.authService.getHttpHeaders();
    return this.http.delete<any>(`${this.apiUrl}/${bookingId}`, {
      headers,
    });
  }

  // Calculate price for a booking - updated for monthly booking
  calculateBookingPrice(
    propertyId: string,
    bookingMonth: string,
    guests: { adults: number; children: number }
  ): Observable<{
    success: boolean;
    data: {
      breakdown: {
        basePrice: number;
        daysInMonth: number;
        monthlyDiscount: string;
        additionalGuestFee: number;
        cleaningFee: number;
        serviceFee: number;
        totalPrice: number;
      };
    };
    message?: string;
  }> {
    return this.http.post<{
      success: boolean;
      data: {
        breakdown: {
          basePrice: number;
          daysInMonth: number;
          monthlyDiscount: string;
          additionalGuestFee: number;
          cleaningFee: number;
          serviceFee: number;
          totalPrice: number;
        };
      };
      message?: string;
    }>(`${this.apiUrl}/calculate`, { propertyId, bookingMonth, guests });
  }

  // Check if a property is available for specific month - updated for monthly booking
  checkAvailability(
    propertyId: string,
    bookingMonth: string
  ): Observable<{
    success: boolean;
    isAvailable: boolean;
    message: string;
  }> {
    return this.http.post<{
      success: boolean;
      isAvailable: boolean;
      message: string;
    }>(`${this.apiUrl}/check-availability`, { propertyId, bookingMonth });
  }
}
