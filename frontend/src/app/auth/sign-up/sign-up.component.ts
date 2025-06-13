import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss'],
  imports: [CommonModule, FormsModule,RouterModule],
})
export class SignUpComponent implements OnInit {
  user = {
    name: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
    role: 'renter', // Default role is renter
  };

  loading = false;
  passwordVisible = false;
  confirmPasswordVisible = false;
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
    this.authService.isLoggedIn().subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        this.router.navigate(['/profile']);
      }
    });
  }

  // Toggle password visibility
  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.passwordVisible = !this.passwordVisible;
    } else {
      this.confirmPasswordVisible = !this.confirmPasswordVisible;
    }
  }

  onSubmit(form: NgForm) {
    // Don't process form during SSR
    if (!this.isBrowser) {
      return;
    }

    // Ensure all fields are marked as touched for better UX
    Object.keys(form.controls).forEach((key) => {
      form.controls[key].markAsTouched();
    });

    // Validate the form
    if (form.valid) {
      // Password and Confirm Password match
      if (this.user.password !== this.user.confirmPassword) {
        Swal.fire({
          title: 'Password Mismatch',
          text: 'Passwords do not match. Please check and try again.',
          icon: 'error',
          confirmButtonText: 'OK',
        });
        return;
      }

      // Password length and complexity check
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
      if (!passwordRegex.test(this.user.password)) {
        Swal.fire({
          title: 'Weak Password',
          text: 'Password must be at least 8 characters long and contain both letters and numbers.',
          icon: 'error',
          confirmButtonText: 'OK',
        });
        return;
      }

      this.loading = true;

      // Create a copy of the user object without confirmPassword
      const { confirmPassword, ...userData } = this.user;

      // Call the signup service
      this.authService.signup(userData as any).subscribe({
        next: (response) => {
          this.loading = false;
          console.log('Signup successful:', response);

          if (response.success) {
            Swal.fire({
              title: 'Registration Successful!',
              text: 'You have successfully registered! Please check your email to verify your account.',
              icon: 'success',
              confirmButtonText: 'Go to Login',
            }).then(() => {
              // Redirect to the login page after successful registration
              this.router.navigate(['/profile']);
            });
          } else {
            Swal.fire({
              title: 'Registration Issue',
              text: response.message || 'There was an issue with your registration.',
              icon: 'warning',
              confirmButtonText: 'Try Again',
            });
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Signup failed:', error);

          const errorMessage = error.error?.message || 'Registration failed. Please try again.';

          if (error.error?.message === 'User already exists') {
            Swal.fire({
              title: 'Email Already Registered',
              text: 'This email address is already registered. Please use a different email or login.',
              icon: 'warning',
              confirmButtonText: 'OK',
            });
          } else {
            Swal.fire({
              title: 'Registration Failed',
              text: errorMessage,
              icon: 'error',
              confirmButtonText: 'Try Again',
            });
          }
        },
      });
    } else {
      Swal.fire({
        title: 'Invalid Form',
        text: 'Please fill in all required fields correctly.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  }
}
