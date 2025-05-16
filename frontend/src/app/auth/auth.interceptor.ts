import { Injectable, Injector } from '@angular/core'; // <<< Import Injector
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Injectable( )
export class AuthInterceptor implements HttpInterceptor {
  // Remove AuthService from constructor, inject Injector instead
  constructor(private injector: Injector, private router: Router) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Get AuthService lazily from the injector
    const authService = this.injector.get(AuthService);

    // Get the token from the auth service
    const token = authService.getToken();

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Get AuthService again here if you need to call logout, 
          // or ensure the instance from above is still in scope and valid.
          const authServiceInstance = this.injector.get(AuthService);
          authServiceInstance.logout(); 
          // Note: router.navigate might also cause issues if Router itself is part of a cycle
          // but usually it is fine. The primary issue is AuthService here.
        }
        return throwError(() => error);
      })
    );
  }
}
