import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  tap,map,
  catchError,
  throwError,
} from 'rxjs';
import { User } from '../user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:3900/api/users';
  private loggedIn = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<any>(null);

   constructor(private http: HttpClient, private router: Router) {
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    if (typeof window !== 'undefined') {
      const token = this.getToken();
      if (token) {
        this.getUserProfile().subscribe({
          next: (user) => {
            if (user) {
              localStorage.setItem('user', JSON.stringify(user));
              this.currentUserSubject.next(user);
              this.loggedIn.next(true);
            } else {
              // If getUserProfile succeeds but returns no user, treat as logout
              this.logout();
            }
          },
          error: (err) => {
            console.error('Failed to initialize auth state by fetching profile:', err);
            this.logout(); // Token might be invalid/expired
          }
        });
      } else {
        // No token, ensure logged out state
        this.loggedIn.next(false);
        this.currentUserSubject.next(null);
      }
    }
  }

  getHttpHeaders(): HttpHeaders {
    if (typeof window === 'undefined') {
      return new HttpHeaders({
        'Content-Type': 'application/json',
      });
    }

    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  getHttpOptions(): any {
    return {
      headers: this.getHttpHeaders(),
    };
  }

  signup(user: Partial<User>): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/register`, user)
      .pipe(catchError(this.handleError));
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        if (response.success && response.token && response.user) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.loggedIn.next(true);
          this.currentUserSubject.next(response.user);
        }
      }),
      catchError(this.handleError)
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/forgot-password`, { email })
      .pipe(catchError(this.handleError));
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/reset-password`, { token, password })
      .pipe(catchError(this.handleError));
  }

  getUserProfile(): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/profile`, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  updateProfile(userData: any): Observable<any> {
    return this.http
      .put(`${this.apiUrl}/profile`, userData, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  isLoggedIn(): Observable<boolean> {
    return this.loggedIn.asObservable();
  }

    getCurrentUser(): Observable<any> {
    const token = this.getToken();
    const storedUser = this.getUserData();

    if (token && storedUser) {
      if (!this.currentUserSubject.value) {
        this.currentUserSubject.next(storedUser);
        this.loggedIn.next(true);
      }
      return this.currentUserSubject.asObservable();
    }

    if (token && !storedUser) {
      return this.getUserProfile().pipe(
        tap(user => {
          localStorage.setItem('user', JSON.stringify(user));
          this.currentUserSubject.next(user);
          this.loggedIn.next(true);
        }),
        catchError(error => {
          this.logout();
          return throwError(() => error);
        }),
        map(() => this.currentUserSubject.value)
      );
    }

    this.loggedIn.next(false);
    this.currentUserSubject.next(null);
    return this.currentUserSubject.asObservable();
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  isUserVerified(): boolean {
    const user = this.getUserData();
    return !!user?.isVerified;
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  getUserData(): any {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }

  isAdmin(): boolean {
    const user = this.getUserData();
    return user && user.role === 'admin';
  }

  isOwner(): boolean {
    const user = this.getUserData();
    return user && (user.role === 'owner' || user.role === 'admin');
  }

  isRenter(): boolean {
    const user = this.getUserData();
    return user && user.role === 'renter';
  }

  upgradeToOwner(): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/upgrade-to-owner`, {}, this.getHttpOptions())
      .pipe(
        catchError(this.handleError),
        tap((response: any) => {
          if (response && response.success) {
            const user = this.getUserData();
            if (user) {
              user.role = 'owner';
              localStorage.setItem('user', JSON.stringify(user));
              this.currentUserSubject.next(user);
            }
          }
        })
      );
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.loggedIn.next(false);
      this.currentUserSubject.next(null);
      this.router.navigate(['/login']);
    }
  }

  private handleError(error: any) {
    console.error('An error occurred:', error);
    const errorMessage =
      error.error?.message ||
      `Error Code: ${error.status}\nMessage: ${error.message}`;
    return throwError(() => new Error(errorMessage));
  }

  getUser(): any {
    return this.getUserData();
  }
}
