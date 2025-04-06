import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { AuthService } from '../../auth/auth.service';
import { Property } from '../../models/property.model';

@Component({
  selector: 'app-my-properties',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-properties.component.html',
  styleUrl: './my-properties.component.scss',
})
export class MyPropertiesComponent implements OnInit {
  properties: Property[] = [];
  filteredProperties: Property[] = [];
  loading = true;
  error: string | null = null;
  activeFilter: 'all' | 'pending' | 'approved' | 'rejected' = 'all';

  constructor(
    private propertyService: PropertyService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check if user is authorized (owner or admin)
    if (!this.authService.isOwner()) {
      // Redirect or show error if not authorized
      this.error = 'You are not authorized to view this page.';
      this.loading = false;
      return;
    }

    this.loadProperties();
  }

  loadProperties(): void {
    this.loading = true;
    this.propertyService.getMyProperties().subscribe({
      next: (response) => {
        if (response.success) {
          this.properties = response.data;
          console.log('My properties loaded:', this.properties);
          this.applyFilter(this.activeFilter);
        } else {
          this.error = 'Failed to load properties';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading properties:', err);
        this.error = 'Error loading properties. Please try again.';
        this.loading = false;
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

  deleteProperty(propertyId: string): void {
    if (
      !confirm(
        'Are you sure you want to delete this property? This action cannot be undone.'
      )
    ) {
      return;
    }

    this.propertyService.deleteProperty(propertyId).subscribe({
      next: (response) => {
        if (response.success) {
          // Remove the deleted property from the list
          this.properties = this.properties.filter((p) => p._id !== propertyId);
          this.applyFilter(this.activeFilter);
          console.log('Property deleted successfully');
        } else {
          console.error('Failed to delete property:', response.message);
        }
      },
      error: (err) => {
        console.error('Error deleting property:', err);
        alert(
          'Failed to delete property. ' +
            (err.error?.message || 'Please try again.')
        );
      },
    });
  }

  // Helper method to get property status badge class
  getStatusBadgeClass(property: any): string {
    if (property.status === 'rejected') {
      return 'badge-rejected';
    } else if (
      !property.isApproved &&
      (!property.status || property.status === 'pending')
    ) {
      return 'badge-pending';
    } else if (!property.isActive) {
      return 'badge-inactive';
    } else if (property.availability?.isAvailable) {
      return 'badge-available';
    } else {
      return 'badge-unavailable';
    }
  }

  // Helper method to get property status text
  getStatusText(property: any): string {
    if (property.status === 'rejected') {
      return 'Rejected';
    } else if (
      !property.isApproved &&
      (!property.status || property.status === 'pending')
    ) {
      return 'Pending Approval';
    } else if (!property.isActive) {
      return 'Inactive';
    } else if (property.availability?.isAvailable) {
      return 'Available';
    } else {
      return 'Unavailable';
    }
  }

  // Check if any properties are pending approval
  hasPendingProperties(): boolean {
    return this.properties.some((property) => !property.isApproved);
  }

  // Check if any properties are approved
  hasApprovedProperties(): boolean {
    return this.properties.some((property) => property.isApproved);
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
