// auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { User } from '../user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:3900/api/users';
  private loggedIn = new BehaviorSubject<boolean>(false); // Track login status
  private currentUserSubject = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient, private router: Router) {
    // Check if we're running in a browser environment
    if (typeof window !== 'undefined') {
      // Check if user is already logged in from localStorage
      const token = this.getToken();
      const userData = this.getUserData();
      if (token && userData) {
        this.loggedIn.next(true);
        this.currentUserSubject.next(userData);
      }
    }
  }

  // Get HTTP options with auth token
  private getHttpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getToken()}`,
      }),
    };
  }

  // Signup method
  signup(user: Partial<User>): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/register`, user)
      .pipe(catchError(this.handleError));
  }

  // Login method
  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        if (response.success && response.token) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.loggedIn.next(true);
          this.currentUserSubject.next(response.user);
        }
      }),
      catchError(this.handleError)
    );
  }

  // Forgot password
  forgotPassword(email: string): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/forgot-password`, { email })
      .pipe(catchError(this.handleError));
  }

  // Reset password
  resetPassword(token: string, password: string): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/reset-password`, { token, password })
      .pipe(catchError(this.handleError));
  }

  // Get user profile
  getUserProfile(): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/profile`, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  // Update user profile
  updateProfile(userData: any): Observable<any> {
    return this.http
      .put(`${this.apiUrl}/profile`, userData, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  // Check if user is logged in
  isLoggedIn(): Observable<boolean> {
    return this.loggedIn.asObservable();
  }

  // Get current user data
  getCurrentUser(): Observable<any> {
    // Log the token for debugging
    console.log('Token in getCurrentUser:', this.getToken());

    return this.currentUserSubject
      .asObservable()
      .pipe(
        tap((user) => console.log('Current user from BehaviorSubject:', user))
      );
  }

  // Get token from localStorage
  getToken(): string | null {
    // Check if we're running in a browser environment
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  // Get user data from localStorage
  getUserData(): any {
    // Check if we're running in a browser environment
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }

  // Check if user is admin
  isAdmin(): boolean {
    const userData = this.getUserData();
    return userData && userData.role === 'admin';
  }

  // Logout method
  logout(): void {
    // Check if we're running in a browser environment
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.loggedIn.next(false);
      this.currentUserSubject.next(null);
      this.router.navigate(['/login']);
    }
  }

  // Error handling
  private handleError(error: any) {
    console.error('An error occurred:', error);

    let errorMessage = 'Unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage =
        error.error?.message ||
        `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    return throwError(() => error);
  }
}
