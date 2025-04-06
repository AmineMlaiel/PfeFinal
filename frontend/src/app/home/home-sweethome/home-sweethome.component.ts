import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';

interface Property {
  _id: string;
  title: string;
  description: string;
  price: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  images: string[];
  address: {
    city: string;
    state: string;
  };
  [key: string]: any;
}

@Component({
  selector: 'app-home-sweethome',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home-sweethome.component.html',
  styleUrl: './home-sweethome.component.scss',
})
export class HomeSweethomeComponent implements OnInit {
  featuredProperties: Property[] = [];
  loading = false;
  error = '';
  searchTerm = '';

  propertyTypes = [
    { value: 'apartment', label: 'Apartments' },
    { value: 'house', label: 'Houses' },
    { value: 'condo', label: 'Condos' },
    { value: 'villa', label: 'Villas' },
  ];

  constructor(private propertyService: PropertyService) {}

  ngOnInit(): void {
    this.loadFeaturedProperties();
  }

  loadFeaturedProperties(): void {
    this.loading = true;

    // Get properties with a limit of 6 for the homepage
    this.propertyService
      .getProperties({ limit: 6, sort: '-rating' })
      .subscribe({
        next: (response) => {
          if (response && response.data) {
            this.featuredProperties = response.data;
          } else {
            this.featuredProperties = Array.isArray(response) ? response : [];
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading featured properties:', err);
          this.error = 'Unable to load featured properties';
          this.loading = false;
        },
      });
  }

  searchProperties(): void {
    if (this.searchTerm.trim()) {
      // Navigate to properties page with search filter
      window.location.href = `/properties?search=${encodeURIComponent(
        this.searchTerm
      )}`;
    }
  }
}
