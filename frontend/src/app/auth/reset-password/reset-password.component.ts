import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  token: string = '';
  password: string = '';
  confirmPassword: string = '';
  loading: boolean = false;
  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;
  isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.route.queryParams.subscribe((params) => {
        this.token = params['token'];

        if (!this.token) {
          Swal.fire({
            title: 'Invalid Link',
            text: 'The password reset link is invalid or has expired.',
            icon: 'error',
            confirmButtonText: 'Back to Login',
          }).then(() => {
            this.router.navigate(['/login']);
          });
        }
      });
    }
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.passwordVisible = !this.passwordVisible;
    } else {
      this.confirmPasswordVisible = !this.confirmPasswordVisible;
    }
  }

  onSubmit(): void {
    if (!this.isBrowser) {
      return;
    }

    if (!this.token) {
      Swal.fire({
        title: 'Invalid Link',
        text: 'The password reset link is invalid or has expired.',
        icon: 'error',
        confirmButtonText: 'Back to Login',
      }).then(() => {
        this.router.navigate(['/login']);
      });
      return;
    }

    if (!this.password || !this.confirmPassword) {
      Swal.fire({
        title: 'Missing Information',
        text: 'Please enter both password fields.',
        icon: 'warning',
        confirmButtonText: 'OK',
      });
      return;
    }

    if (this.password !== this.confirmPassword) {
      Swal.fire({
        title: 'Password Mismatch',
        text: 'The passwords you entered do not match.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
      return;
    }

    if (this.password.length < 6) {
      Swal.fire({
        title: 'Password Too Short',
        text: 'Your password must be at least 6 characters long.',
        icon: 'warning',
        confirmButtonText: 'OK',
      });
      return;
    }

    this.loading = true;

    this.authService.resetPassword(this.token, this.password).subscribe({
      next: (response) => {
        this.loading = false;

        this.router.navigate(['/login'], {
          queryParams: {
            passwordReset: 'true',
            email: this.route.snapshot.queryParams['email'] || '',
          },
        });
      },
      error: (error) => {
        this.loading = false;

        let errorMessage = 'An error occurred while resetting your password.';
        if (error.error && error.error.message === 'Invalid or expired token') {
          errorMessage =
            'This password reset link is invalid or has expired. Please request a new one.';
        }

        Swal.fire({
          title: 'Reset Failed',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'Try Again',
        });
      },
    });
  }
}
