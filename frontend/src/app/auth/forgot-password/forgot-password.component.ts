import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent implements OnInit {
  email: string = '';
  loading: boolean = false;
  isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Check if user is already logged in
    if (this.isBrowser) {
      this.authService.isLoggedIn().subscribe((isLoggedIn) => {
        if (isLoggedIn) {
          this.router.navigate(['/profile']);
        }
      });
    }
  }

  onSubmit(): void {
    if (!this.isBrowser) {
      return; // Don't process in SSR
    }

    if (!this.email) {
      Swal.fire({
        title: 'Email Required',
        text: 'Please enter your email address.',
        icon: 'warning',
        confirmButtonText: 'OK',
      });
      return;
    }

    // Validate email format
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(this.email)) {
      Swal.fire({
        title: 'Invalid Email',
        text: 'Please enter a valid email address.',
        icon: 'warning',
        confirmButtonText: 'OK',
      });
      return;
    }

    this.loading = true;

    this.authService.forgotPassword(this.email).subscribe({
      next: (response) => {
        this.loading = false;

        // Mask part of the email for privacy in the message
        const maskedEmail = this.maskEmail(this.email);

        Swal.fire({
          title: 'Email Sent',
          text: `If an account exists with ${maskedEmail}, password reset instructions have been sent. Please check your inbox and spam folder.`,
          icon: 'success',
          confirmButtonText: 'Back to Login',
        }).then(() => {
          this.router.navigate(['/login']);
        });
      },
      error: (error) => {
        this.loading = false;

        // Even if there's an error, we show the same message for security
        const maskedEmail = this.maskEmail(this.email);

        Swal.fire({
          title: 'Email Sent',
          text: `If an account exists with ${maskedEmail}, password reset instructions have been sent. Please check your inbox and spam folder.`,
          icon: 'success',
          confirmButtonText: 'Back to Login',
        }).then(() => {
          this.router.navigate(['/login']);
        });
      },
    });
  }

  // Helper method to mask part of the email for privacy
  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return email;

    const name = parts[0];
    const domain = parts[1];

    // If name is 1 or 2 characters, show just the first
    // If longer, show first and last character with asterisks in between
    let maskedName = '';
    if (name.length <= 2) {
      maskedName = name.substring(0, 1) + '*';
    } else {
      maskedName =
        name.substring(0, 1) +
        '*'.repeat(Math.min(5, name.length - 2)) +
        name.substring(name.length - 1);
    }

    return `${maskedName}@${domain}`;
  }
}
