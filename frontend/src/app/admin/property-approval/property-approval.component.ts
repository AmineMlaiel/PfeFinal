import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../admin.service';
import { AuthService } from '../../auth/auth.service';
import { Property } from '../../models/property.model';

@Component({
  selector: 'app-property-approval',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './property-approval.component.html',
  styleUrl: './property-approval.component.scss',
})
export class PropertyApprovalComponent implements OnInit {
  properties: Property[] = [];
  filteredProperties: Property[] = [];
  loading = true;
  error: string | null = null;
  activeFilter: 'all' | 'pending' | 'approved' | 'rejected' = 'pending';

  // Rejection modal properties
  showRejectionModal = false;
  propertyToReject: Property | null = null;
  rejectionReason = '';

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
            (p) => p.status === 'pending' || (!p.status && !p.isApproved)
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

    console.log('Applying filter:', filter);
    console.log('Properties before filtering:', this.properties.length);

    switch (filter) {
      case 'all':
        this.filteredProperties = [...this.properties];
        break;
      case 'pending':
        // Check explicitly for pending status or missing status with isApproved=false
        this.filteredProperties = this.properties.filter((p) => {
          const isPending =
            p.status === 'pending' ||
            (p.status === undefined && p.isApproved === false);
          console.log(
            `Property ${p._id}: status=${p.status}, isApproved=${p.isApproved}, isPending=${isPending}`
          );
          return isPending;
        });
        break;
      case 'approved':
        // Check explicitly for approved status or missing status with isApproved=true
        this.filteredProperties = this.properties.filter((p) => {
          const isApproved =
            p.status === 'approved' ||
            (p.status === undefined && p.isApproved === true);
          console.log(
            `Property ${p._id}: status=${p.status}, isApproved=${p.isApproved}, isApproved=${isApproved}`
          );
          return isApproved;
        });
        break;
      case 'rejected':
        // Only explicitly rejected properties
        this.filteredProperties = this.properties.filter((p) => {
          const isRejected = p.status === 'rejected';
          console.log(
            `Property ${p._id}: status=${p.status}, isRejected=${isRejected}`
          );
          return isRejected;
        });
        break;
    }

    console.log('Filtered properties count:', this.filteredProperties.length);
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
            this.properties[index].status = 'approved';
            this.properties[index].rejectionReason = undefined;
            this.applyFilter(this.activeFilter);

            // Show success message
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

  // Open rejection modal
  openRejectionModal(property: Property): void {
    this.propertyToReject = property;
    this.rejectionReason = property.rejectionReason || '';
    this.showRejectionModal = true;
  }

  // Close rejection modal
  closeRejectionModal(): void {
    this.showRejectionModal = false;
    this.propertyToReject = null;
    this.rejectionReason = '';
  }

  // Submit rejection
  submitRejection(): void {
    if (!this.propertyToReject) return;

    if (!this.rejectionReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    const propertyId = this.propertyToReject._id || '';

    this.adminService
      .approveProperty(propertyId, false, this.rejectionReason)
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Update the property in the list
            const index = this.properties.findIndex(
              (p) => p._id === propertyId
            );
            if (index !== -1) {
              this.properties[index].isApproved = false;
              this.properties[index].status = 'rejected';
              this.properties[index].rejectionReason = this.rejectionReason;
              this.applyFilter(this.activeFilter);

              // Show success message
              alert('Property rejected successfully with provided reason.');
            }
            this.closeRejectionModal();
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

  rejectProperty(propertyId: string): void {
    const property = this.properties.find((p) => p._id === propertyId);
    if (!property) return;

    // Open the rejection modal
    this.openRejectionModal(property);
  }

  // Get property status badge class
  getStatusBadgeClass(property: Property): string {
    if (property.status === 'rejected') {
      return 'badge-rejected';
    } else if (property.status === 'approved' || property.isApproved) {
      return 'badge-approved';
    } else {
      return 'badge-pending';
    }
  }

  // Get property status text
  getStatusText(property: Property): string {
    if (property.status === 'rejected') {
      return 'Rejected';
    } else if (property.status === 'approved' || property.isApproved) {
      return 'Approved';
    } else {
      return 'Pending Approval';
    }
  }

  // Get counts for badges
  getPendingCount(): number {
    return this.properties.filter(
      (p) =>
        p.status === 'pending' ||
        (p.status === undefined && p.isApproved === false)
    ).length;
  }

  getApprovedCount(): number {
    return this.properties.filter(
      (p) =>
        p.status === 'approved' ||
        (p.status === undefined && p.isApproved === true)
    ).length;
  }

  getRejectedCount(): number {
    return this.properties.filter((p) => p.status === 'rejected').length;
  }
}
