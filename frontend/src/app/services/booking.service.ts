import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private apiUrl = 'http://localhost:3900/api/bookings';

  constructor(private http: HttpClient) {}

  // Create a new booking
  createBooking(bookingData: any): Observable<any> {
    return this.http.post(this.apiUrl, bookingData);
  }

  // Get all bookings
  getBookings(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  // Get a single booking by ID
  getBooking(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  // Get bookings for a specific property
  getPropertyBookings(propertyId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/property/${propertyId}`);
  }

  // Get bookings made by the current user
  getMyBookings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/my-bookings`);
  }

  // Update booking status (approve, reject, cancel, complete)
  updateBookingStatus(id: string, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/status`, { status });
  }

  // Add a message to a booking
  addBookingMessage(id: string, message: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/messages`, { message });
  }

  // Get booking calendar data for a property
  getBookingCalendar(propertyId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/calendar/${propertyId}`);
  }

  // Check availability for specific dates
  checkAvailability(
    propertyId: string,
    startDate: string,
    endDate: string
  ): Observable<any> {
    return this.http.get(`${this.apiUrl}/check-availability`, {
      params: {
        property: propertyId,
        startDate,
        endDate,
      },
    });
  }
}
