import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../admin.service';
import { AuthService } from '../../auth/auth.service';
import { Property } from '../../models/property.model';

@Component({
  selector: 'app-property-approval',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './property-approval.component.html',
  styleUrl: './property-approval.component.scss',
})
export class PropertyApprovalComponent implements OnInit {
  properties: Property[] = [];
  filteredProperties: Property[] = [];
  loading = true;
  error: string | null = null;
  activeFilter: 'all' | 'pending' | 'approved' | 'rejected' = 'pending';

  constructor(
    private adminService: AdminService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check if user is authorized (admin)
    if (!this.authService.isAdmin()) {
      this.error = 'You are not authorized to access this page.';
      this.loading = false;
      return;
    }

    this.loadProperties();
  }

  loadProperties(): void {
    this.loading = true;
    this.error = null;
    console.log('Loading properties for admin panel...');

    this.adminService.getAllProperties().subscribe({
      next: (response) => {
        console.log('Full response from getAllProperties:', response);

        if (response && response.success) {
          this.properties = response.data || [];
          console.log(
            'Properties loaded successfully, count:',
            this.properties.length
          );
          console.log('Properties data:', this.properties);

          // Check if we received any properties with isApproved=false
          const pendingProperties = this.properties.filter(
            (p) => p.isApproved === false
          );
          console.log('Pending properties count:', pendingProperties.length);

          this.applyFilter(this.activeFilter);
        } else {
          console.error('Response was not successful:', response);
          this.error =
            'Failed to load properties: ' +
            (response?.message || 'Unknown error');
          this.properties = [];
          this.filteredProperties = [];
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading properties:', err);

        let errorMessage = 'Error loading properties.';
        if (err.error?.message) {
          errorMessage += ' ' + err.error.message;
        } else if (err.message) {
          errorMessage += ' ' + err.message;
        } else {
          errorMessage += ' Please check console for details.';
        }

        if (err.status === 401) {
          errorMessage =
            'You are not authorized to access this data. Please login as admin.';
        }

        this.error = errorMessage;
        this.loading = false;
        this.properties = [];
        this.filteredProperties = [];
      },
    });
  }

  applyFilter(filter: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.activeFilter = filter;

    switch (filter) {
      case 'all':
        this.filteredProperties = [...this.properties];
        break;
      case 'pending':
        this.filteredProperties = this.properties.filter(
          (p) => p.isApproved === false
        );
        break;
      case 'approved':
        this.filteredProperties = this.properties.filter(
          (p) => p.isApproved === true
        );
        break;
      case 'rejected':
        // For rejected properties, we could add an isRejected flag or similar
        // For now, just use approved = false as a placeholder
        this.filteredProperties = this.properties.filter(
          (p) => p.isApproved === false
        );
        break;
    }
  }

  approveProperty(propertyId: string): void {
    if (
      !confirm(
        'Are you sure you want to approve this property? It will become visible to all users.'
      )
    ) {
      return;
    }

    this.adminService.approveProperty(propertyId, true).subscribe({
      next: (response) => {
        if (response.success) {
          // Update the property in the list
          const index = this.properties.findIndex((p) => p._id === propertyId);
          if (index !== -1) {
            this.properties[index].isApproved = true;
            this.applyFilter(this.activeFilter);

            // Show success message (you can replace with a toast notification library)
            alert(
              'Property approved successfully. It is now visible to users.'
            );
          }
          console.log('Property approved successfully');
        } else {
          console.error('Failed to approve property:', response.message);
          alert('Failed to approve property: ' + response.message);
        }
      },
      error: (err) => {
        console.error('Error approving property:', err);
        alert(
          'Failed to approve property. ' +
            (err.error?.message || 'Please try again.')
        );
      },
    });
  }

  rejectProperty(propertyId: string): void {
    const isApproved = this.properties.find(
      (p) => p._id === propertyId
    )?.isApproved;
    const confirmMessage = isApproved
      ? 'Are you sure you want to revoke approval for this property? It will be hidden from users.'
      : 'Are you sure you want to decline this property? The owner will be notified.';

    if (!confirm(confirmMessage)) {
      return;
    }

    this.adminService.approveProperty(propertyId, false).subscribe({
      next: (response) => {
        if (response.success) {
          // Update the property in the list
          const index = this.properties.findIndex((p) => p._id === propertyId);
          if (index !== -1) {
            this.properties[index].isApproved = false;
            this.applyFilter(this.activeFilter);

            // Show success message
            const message = isApproved
              ? 'Property approval revoked successfully. It is now hidden from users.'
              : 'Property declined successfully.';
            alert(message);
          }
          console.log('Property rejected successfully');
        } else {
          console.error('Failed to reject property:', response.message);
          alert('Failed to reject property: ' + response.message);
        }
      },
      error: (err) => {
        console.error('Error rejecting property:', err);
        alert(
          'Failed to reject property. ' +
            (err.error?.message || 'Please try again.')
        );
      },
    });
  }
}
