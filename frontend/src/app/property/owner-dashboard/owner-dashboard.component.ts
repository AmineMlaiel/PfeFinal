import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './owner-dashboard.component.html',
})
export class OwnerDashboardComponent implements OnInit {
  // Initial state
  isLoading = true;
  dashboardData: any = null;
  errorMessage: string | null = null;

  constructor() { }

  ngOnInit(): void {
    this.loadDashboardData();
    
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    // Simulate API call
    setTimeout(() => {
      try {
        // Replace with actual data fetching logic
        this.dashboardData = {
          totalProperties: 0,
          activeListings: 0,
          pendingRequests: 0,
          recentActivities: []
        };
        this.isLoading = false;
      } catch (error) {
        this.errorMessage = 'Failed to load dashboard data';
        this.isLoading = false;
      }
    }, 1000);
  }

  refreshDashboard(): void {
    this.loadDashboardData();
  }

  resetDashboard(): void {
    this.dashboardData = null;
    this.errorMessage = null;
    this.isLoading = true;
    // Additional reset logic can go here
  }
}