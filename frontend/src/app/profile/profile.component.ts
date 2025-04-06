import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { isPlatformBrowser } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  user: any = null;
  loading = false;
  passwordLoading = false;
  upgradeLoading = false;
  isBrowser: boolean;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Initialize the profile form
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobileNumber: ['', Validators.required],
    });

    // Initialize the password form
    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    // Skip auth check during SSR
    if (!this.isBrowser) {
      return;
    }

    // Check if the user is logged in
    this.authService.isLoggedIn().subscribe((isLoggedIn) => {
      if (!isLoggedIn) {
        this.router.navigate(['/login']);
        return;
      }

      // Load user data
      this.loadUserData();
    });
  }

  // Load user data from the backend or local storage
  loadUserData() {
    if (!this.isBrowser) {
      return;
    }

    // First try to get it from local storage for immediate display
    const userData = this.authService.getUserData();
    if (userData) {
      this.user = userData;
      this.updateFormWithUserData(userData);
    }

    // Then fetch fresh data from the API
    this.authService.getUserProfile().subscribe({
      next: (response) => {
        if (response.success) {
          this.user = response.user;
          this.updateFormWithUserData(response.user);
        }
      },
      error: (error) => {
        console.error('Error fetching user profile:', error);
        if (this.isBrowser) {
          Swal.fire({
            title: 'Error',
            text: 'Failed to load your profile data. Please try again later.',
            icon: 'error',
            confirmButtonText: 'OK',
          });
        }
      },
    });
  }

  // Update the form with user data
  updateFormWithUserData(userData: any) {
    this.profileForm.patchValue({
      name: userData.name || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      mobileNumber: userData.mobileNumber || '',
    });
  }

  // Custom validator to check if new password and confirm password match
  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  }

  // Submit profile form
  onProfileSubmit() {
    if (!this.isBrowser) {
      return;
    }

    if (this.profileForm.invalid) {
      Swal.fire({
        title: 'Invalid Form',
        text: 'Please fill in all required fields correctly.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
      return;
    }

    this.loading = true;
    const profileData = this.profileForm.value;

    this.authService.updateProfile(profileData).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          // Update local storage with new user data
          if (this.isBrowser) {
            const userData = this.authService.getUserData();
            const updatedUserData = { ...userData, ...profileData };
            localStorage.setItem('user', JSON.stringify(updatedUserData));

            Swal.fire({
              title: 'Profile Updated',
              text: 'Your profile has been successfully updated.',
              icon: 'success',
              confirmButtonText: 'OK',
            });
          }
        } else {
          if (this.isBrowser) {
            Swal.fire({
              title: 'Update Failed',
              text: response.message || 'Failed to update your profile.',
              icon: 'error',
              confirmButtonText: 'OK',
            });
          }
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error updating profile:', error);
        if (this.isBrowser) {
          Swal.fire({
            title: 'Update Failed',
            text:
              error.error?.message ||
              'An error occurred while updating your profile.',
            icon: 'error',
            confirmButtonText: 'OK',
          });
        }
      },
    });
  }

  // Submit password form
  onPasswordSubmit() {
    if (!this.isBrowser) {
      return;
    }

    if (this.passwordForm.invalid) {
      Swal.fire({
        title: 'Invalid Form',
        text: 'Please fill in all password fields correctly.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
      return;
    }

    if (this.passwordForm.hasError('passwordMismatch')) {
      Swal.fire({
        title: 'Password Mismatch',
        text: 'New password and confirmation do not match.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
      return;
    }

    this.passwordLoading = true;
    const passwordData = {
      currentPassword: this.passwordForm.value.currentPassword,
      password: this.passwordForm.value.newPassword,
    };

    this.authService.updateProfile(passwordData).subscribe({
      next: (response) => {
        this.passwordLoading = false;
        if (response.success) {
          if (this.isBrowser) {
            Swal.fire({
              title: 'Password Updated',
              text: 'Your password has been successfully updated.',
              icon: 'success',
              confirmButtonText: 'OK',
            });
          }
          this.passwordForm.reset();
        } else {
          if (this.isBrowser) {
            Swal.fire({
              title: 'Update Failed',
              text: response.message || 'Failed to update your password.',
              icon: 'error',
              confirmButtonText: 'OK',
            });
          }
        }
      },
      error: (error) => {
        this.passwordLoading = false;
        console.error('Error updating password:', error);

        if (this.isBrowser) {
          // Special handling for wrong current password
          if (error.error?.message === 'Current password is incorrect') {
            Swal.fire({
              title: 'Incorrect Password',
              text: 'Your current password is incorrect.',
              icon: 'error',
              confirmButtonText: 'OK',
            });
          } else {
            Swal.fire({
              title: 'Update Failed',
              text:
                error.error?.message ||
                'An error occurred while updating your password.',
              icon: 'error',
              confirmButtonText: 'OK',
            });
          }
        }
      },
    });
  }

  // Upgrade account from renter to owner
  upgradeToOwner() {
    if (!this.isBrowser) {
      return;
    }

    this.upgradeLoading = true;

    this.authService.upgradeToOwner().subscribe({
      next: (response) => {
        this.upgradeLoading = false;
        if (response.success) {
          // Update local UI to reflect new role
          if (this.user) {
            this.user.role = 'owner';
          }

          Swal.fire({
            title: 'Account Upgraded',
            text: 'Your account has been upgraded to property owner!',
            icon: 'success',
            confirmButtonText: 'Start Listing Properties',
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigate(['/properties/add']);
            }
          });
        } else {
          Swal.fire({
            title: 'Upgrade Failed',
            text: response.message || 'Failed to upgrade your account.',
            icon: 'error',
            confirmButtonText: 'OK',
          });
        }
      },
      error: (error) => {
        this.upgradeLoading = false;
        console.error('Error upgrading account:', error);

        Swal.fire({
          title: 'Upgrade Failed',
          text:
            error.error?.message ||
            'An error occurred while upgrading your account.',
          icon: 'error',
          confirmButtonText: 'OK',
        });
      },
    });
  }

  // Logout
  logout() {
    if (!this.isBrowser) {
      return;
    }

    Swal.fire({
      title: 'Logout',
      text: 'Are you sure you want to log out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, log me out',
      cancelButtonText: 'No, stay logged in',
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout();
      }
    });
  }
}
