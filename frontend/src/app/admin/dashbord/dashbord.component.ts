import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { AdminService } from '../admin.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router'; // Add Router import for navigation
import { HttpClient } from '@angular/common/http'; // Add HttpClient for API calls
import { FormsModule } from '@angular/forms'; // <-- Import FormsModule here
import Swal from 'sweetalert2';

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  templateUrl: './dashbord.component.html',
  styleUrls: ['./dashbord.component.scss'],
  imports: [CommonModule, FormsModule], // Add CommonModule to imports for structural directives
})
export class AdminDashboardComponent implements OnInit {
  users: any[] = [];
  showModal = false;
  selectedUser: any = null;
  isBrowser: boolean;

  constructor(
    private adminService: AdminService,
    private router: Router,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Skip data fetching during SSR
    if (!this.isBrowser) {
      return;
    }

    // Fetch users when the component loads
    this.adminService.getUsers().subscribe({
      next: (response : any) => {
        this.users = response.users;
      },
      error: (error) => {
        console.error('Error fetching users:', error);
        if (this.isBrowser) {
          Swal.fire({
            title: 'Error',
            text: 'Failed to load users. Please try again later.',
            icon: 'error',
            confirmButtonText: 'OK',
          });
        }
      },
    });
  }

  validateUser(userId: string): void {
    if (!this.isBrowser) {
      return;
    }

    // Call the backend to validate the user
    this.adminService.validateUser(userId).subscribe({
      next: (response) => {
        // Update the validation status in the UI
        const user = this.users.find((u) => u._id === userId);
        if (user) {
          user.validation = true;
        }

        if (this.isBrowser) {
          Swal.fire({
            title: 'Success',
            text: 'User validated successfully',
            icon: 'success',
            confirmButtonText: 'OK',
          });
        }
      },
      error: (error) => {
        console.error('Error validating user:', error);
        if (this.isBrowser) {
          Swal.fire({
            title: 'Error',
            text: 'Failed to validate user. Please try again.',
            icon: 'error',
            confirmButtonText: 'OK',
          });
        }
      },
    });
  }

  updateUser(userId: string): void {
    if (!this.isBrowser) {
      return;
    }

    // Navigate to the edit page with the user ID
    this.router.navigate(['/edit-user', userId]);
  }

  deleteUser(userId: string): void {
    if (!this.isBrowser) {
      return;
    }

    if (this.isBrowser) {
      Swal.fire({
        title: 'Confirm Deletion',
        text: 'Are you sure you want to delete this user? This cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel',
      }).then((result) => {
        if (result.isConfirmed) {
          // Call the backend to delete the user
          this.adminService.deleteUser(userId).subscribe({
            next: () => {
              // Remove the deleted user from the UI
              this.users = this.users.filter((user) => user._id !== userId);

              Swal.fire({
                title: 'Deleted!',
                text: 'User has been deleted.',
                icon: 'success',
                confirmButtonText: 'OK',
              });
            },
            error: (error) => {
              console.error('Error deleting user:', error);
              Swal.fire({
                title: 'Error',
                text: 'Failed to delete user. Please try again.',
                icon: 'error',
                confirmButtonText: 'OK',
              });
            },
          });
        }
      });
    }
  }

  //modal opening and closing
  openModal(userId: string): void {
    if (!this.isBrowser) {
      return;
    }

    // Find the user by ID
    this.selectedUser = this.users.find((user) => user._id === userId);
    this.showModal = true; // Show the modal
  }

  closeModal(): void {
    if (!this.isBrowser) {
      return;
    }

    this.showModal = false; // Close the modal
    this.selectedUser = null; // Reset the selected user
  }

  // Handle user update
  saveUpdatedUser(): void {
    if (!this.isBrowser) {
      return;
    }

    if (this.selectedUser) {
      this.adminService
        .updateUser(this.selectedUser._id, this.selectedUser)
        .subscribe({
          next: (response) => {
            console.log('User updated successfully', response);
            // Handle success
            this.closeModal();

            if (this.isBrowser) {
              Swal.fire({
                title: 'Success',
                text: 'User updated successfully',
                icon: 'success',
                confirmButtonText: 'OK',
              });
            }
          },
          error: (error) => {
            console.error('Error updating user', error);

            if (this.isBrowser) {
              Swal.fire({
                title: 'Error',
                text: 'Failed to update user. Please try again.',
                icon: 'error',
                confirmButtonText: 'OK',
              });
            }
          },
        });
    }
  }
}
