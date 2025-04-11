  import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = 'http://localhost:3900/api/users'; // Base user API URL
  private propertyApiUrl = 'http://localhost:3900/api/properties'; // Property API URL

  constructor(private http: HttpClient, private authService: AuthService) {}

  getUsers(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}`,
      this.authService.getHttpOptions()
    ); // Fetch all users
  }
  

  // Validate a user by changing their validation status
  validateUser(userId: string): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/validate/${userId}`,
      {},
      this.authService.getHttpOptions()
    ); // Update validation status
  }

  // Update a user's details
  updateUser(userId: string, updatedUserData: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/update/${userId}`,
      updatedUserData,
      this.authService.getHttpOptions()
    ); // Update user by ID
  }

  // Delete a user
  deleteUser(userId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/delete/${userId}`,
      this.authService.getHttpOptions()
    ); // Delete user by ID
  }

  // Get all properties (for admin) including pending approval
  getAllProperties(): Observable<any> {
    // Use the admin-specific endpoint that doesn't filter by approval status
    console.log('Admin fetching all properties with admin endpoint...');

    return this.http
      .get<any>(
        `${this.propertyApiUrl}/admin/all`,
        this.authService.getHttpOptions()
      )
      .pipe(
        tap((response) => console.log('Admin properties response:', response))
      );
  }

  // Approve a property
  approveProperty(
    propertyId: string,
    approved: boolean,
    rejectionReason?: string
  ): Observable<any> {
    const payload: any = { approved };

    // Include rejection reason if provided
    if (!approved && rejectionReason) {
      payload.rejectionReason = rejectionReason;
    }

    return this.http.put<any>(
      `${this.propertyApiUrl}/${propertyId}/approve`,
      payload,
      this.authService.getHttpOptions()
    );
  }
}
