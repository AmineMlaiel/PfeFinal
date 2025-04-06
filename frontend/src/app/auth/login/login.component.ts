import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  loading: boolean = false;
  passwordVisible: boolean = false;
  isBrowser: boolean;
  passwordResetComplete: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Check if user is already logged in
    this.authService.isLoggedIn().subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        this.router.navigate(['/profile']);
      }
    });

    // Only run browser-specific code if we're in the browser
    if (this.isBrowser) {
      // Check for query parameters
      this.route.queryParams.subscribe((params) => {
        const verified = params['verified'];
        const passwordReset = params['passwordReset'];

        if (verified === 'true') {
          Swal.fire({
            title: 'Email Verified!',
            text: 'Your email has been successfully verified. You can now log in.',
            icon: 'success',
            confirmButtonText: 'OK',
          });
          // Clear the query parameters
          this.router.navigate([], {
            queryParams: {},
            replaceUrl: true,
          });
        }

        if (passwordReset === 'true') {
          this.passwordResetComplete = true;
          Swal.fire({
            title: 'Password Reset Successful',
            text: 'Your password has been reset. You can now log in with your new password.',
            icon: 'success',
            confirmButtonText: 'OK',
          });
          // Clear the query parameters
          this.router.navigate([], {
            queryParams: {},
            replaceUrl: true,
          });
        }
      });
    }
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  onSubmit() {
    if (!this.isBrowser) {
      return; // Don't attempt login in SSR
    }

    if (!this.email || !this.password) {
      Swal.fire({
        title: 'Missing Information',
        text: 'Please enter both your email and password.',
        icon: 'warning',
        confirmButtonText: 'OK',
      });
      return;
    }

    this.loading = true;

    this.authService
      .login({ email: this.email, password: this.password })
      .subscribe({
        next: (response) => {
          if (response.success) {
            // If user just reset their password, show a special success message
            if (this.passwordResetComplete) {
              Swal.fire({
                title: 'Welcome Back!',
                text: 'You have successfully logged in with your new password.',
                icon: 'success',
                confirmButtonText: 'Continue',
              });
            }
          } else {
            // Handle unsuccessful login but with a 200 status code
            Swal.fire({
              title: 'Login Failed',
              text: response.message || 'An error occurred during login.',
              icon: 'error',
              confirmButtonText: 'Try Again',
            });
            this.loading = false;
          }
        },
        error: (err) => {
          this.loading = false;

          // Extract the error message from the backend response
          const errorMessage =
            err.error?.message || 'An error occurred during login.';

          // Show specific notifications based on the error message
          switch (errorMessage) {
            case 'User not found':
              Swal.fire({
                title: 'User Not Found',
                text: 'No account exists with this email address. Please sign up.',
                icon: 'error',
                confirmButtonText: 'OK',
              });
              break;

            case 'Invalid credentials':
              if (this.passwordResetComplete) {
                Swal.fire({
                  title: 'Password Reset Issue',
                  text: 'It seems there was an issue with the password reset. Please try requesting a new password reset.',
                  icon: 'error',
                  confirmButtonText: 'Go to Forgot Password',
                }).then((result) => {
                  if (result.isConfirmed) {
                    this.router.navigate(['/forgot-password']);
                  }
                });
              } else {
                Swal.fire({
                  title: 'Invalid Password',
                  text: 'The password you entered is incorrect. Please try again.',
                  icon: 'error',
                  confirmButtonText: 'Try Again',
                });
              }
              break;

            case 'Account not verified. Please verify your email.':
              Swal.fire({
                title: 'Account Not Verified',
                text: 'Please verify your email address before logging in.',
                icon: 'warning',
                confirmButtonText: 'OK',
              });
              break;

            default:
              Swal.fire({
                title: 'Login Failed!',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'Try Again',
              });
              break;
          }
        },
        complete: () => {
          this.loading = false;
        },
      });
  }
}
