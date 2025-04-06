import {
  ApplicationConfig,
  inject,
  isDevMode,
  importProvidersFrom,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
  HttpInterceptorFn,
  withFetch,
} from '@angular/common/http';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { GoogleMapsModule } from '@angular/google-maps';

// Create a functional interceptor instead of using the class-based one
const authInterceptorFn: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Get the token from the auth service
  const token = authService.getToken();

  // If the token exists, add it to the Authorization header
  if (token) {
    // Clone the request and add the Authorization header
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Pass the request to the next handler with error handling
  return next(req).pipe(
    catchError((error) => {
      // Only handle client-side navigation in browser context
      if (typeof window !== 'undefined') {
        // Handle 401 Unauthorized errors (token expired or invalid)
        if (error.status === 401) {
          authService.logout(); // Clear local storage and redirect to login
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptorFn]), withFetch()),
    importProvidersFrom(GoogleMapsModule),
  ],
};
