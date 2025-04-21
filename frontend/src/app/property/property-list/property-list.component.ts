import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PropertyService } from '../../services/property.service';
import { AuthService } from '../../auth/auth.service';

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface Property {
  _id: string;
  title: string;
  description: string;
  price: number;
  address: Address;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  images: string[];
  features: string[];
  availability: {
    isAvailable: boolean;
    availableFrom: Date;
    minimumStay: number;
  };
  owner: string;
  rating: number;
  reviewCount: number;
  isBookmarked?: boolean;
  [key: string]: any;
}

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './property-list.component.html',
  styleUrls: ['./property-list.component.scss'],
})
export class PropertyListComponent implements OnInit {
  properties: Property[] = [];
  loading = false;
  error = '';
  filters: any = {
    propertyType: '',
    minPrice: null,
    maxPrice: null,
    bedrooms: null,
    bathrooms: null,
    search: '',
    title : '',
    description : '',
    location : ''
  };
  isLoggedIn = false;
  isBrowser: boolean;

  constructor(
    private propertyService: PropertyService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.loadProperties();

    if (this.isBrowser) {
      this.authService.isLoggedIn().subscribe((loggedIn) => {
        this.isLoggedIn = loggedIn;
      });
    }
  }

  loadProperties(): void {
    this.loading = true;
    this.error = ''; // Clear any previous errors

    this.propertyService.getProperties(this.applyFilters()).subscribe({
      next: (response) => {
        console.log('API Response:', response);

        if (response && response.data) {
          this.properties = response.data;
          console.log('Properties loaded:', this.properties.length);
        } else {
          // If the API response structure is different than expected
          this.properties = Array.isArray(response) ? response : [];
          console.log(
            'Properties loaded (alternate format):',
            this.properties.length
          );
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading properties:', err);
        this.error = `Error loading properties: ${
          err.message || 'Unknown error'
        }`;
        this.properties = [];
        this.loading = false;
      },
    });
  }

  applyFilters(): any {
    const appliedFilters: any = {};
  
    // Simple text search (combines all text fields)
    if (this.filters.search) {
      appliedFilters.search = this.filters.search;
    }
  
    // Specific field searches
    if (this.filters.title) appliedFilters.title = this.filters.title;
    if (this.filters.description) appliedFilters.description = this.filters.description;
    
    // Location searches
    if (this.filters.city) appliedFilters.city = this.filters.city;
    if (this.filters.area) appliedFilters.area = this.filters.area;
  
    // Numeric filters
    if (this.filters.minPrice) appliedFilters.minPrice = this.filters.minPrice;
    if (this.filters.maxPrice) appliedFilters.maxPrice = this.filters.maxPrice;
    if (this.filters.bedrooms) appliedFilters.bedrooms = this.filters.bedrooms;
    if (this.filters.bathrooms) appliedFilters.bathrooms = this.filters.bathrooms;
  
    // Property type
    if (this.filters.propertyType) appliedFilters.propertyType = this.filters.propertyType;
  
    // Features (comma-separated if multiple)
    if (this.filters.features) {
      appliedFilters.features = Array.isArray(this.filters.features) 
        ? this.filters.features.join(',')
        : this.filters.features;
    }
  
    // Always include approved properties only
    appliedFilters.isApproved = true;
  
    console.log('Final filters:', appliedFilters);
    return appliedFilters;
  }
  resetFilters(): void {
    this.filters = {
      propertyType: '',
      minPrice: null,
      maxPrice: null,
      bedrooms: null,
      bathrooms: null,
      search: '',
    };
    this.loadProperties();
  }

  searchProperties(): void {
    this.loadProperties();
  }

  bookmarkProperty(propertyId: string): void {
    if (!this.isBrowser || !this.isLoggedIn) {
      return;
    }

    this.propertyService.bookmarkProperty(propertyId).subscribe({
      next: (response: any) => {
        // Find the property in the list and update its bookmarked status
        const propertyIndex = this.properties.findIndex(
          (p) => p._id === propertyId
        );
        if (propertyIndex !== -1) {
          this.properties[propertyIndex].isBookmarked =
            !this.properties[propertyIndex].isBookmarked;
        }
      },
      error: (err: any) => {
        console.error('Error bookmarking property:', err);
      },
    });
  }
}
