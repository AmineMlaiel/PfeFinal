import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = 'http://localhost:3900/api/users'; // Update to match the correct API URL

  constructor(private http: HttpClient) {}

  // Get the list of users
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`); // Fetch all users
  }

  // Validate a user by changing their validation status
  validateUser(userId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/validate/${userId}`, {}); // Update validation status
  }

  // Update a user's details
  updateUser(userId: string, updatedUserData: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/update/${userId}`,
      updatedUserData
    ); // Update user by ID
  }

  // Delete a user
  deleteUser(userId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete/${userId}`); // Delete user by ID
  }
}
