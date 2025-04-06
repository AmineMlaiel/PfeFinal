import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { AuthService } from '../../auth/auth.service';

// Property features to select from
const PROPERTY_FEATURES = [
  { value: 'parking', label: 'Parking', icon: 'fa-car' },
  { value: 'furnished', label: 'Furnished', icon: 'fa-couch' },
  { value: 'airConditioning', label: 'Air Conditioning', icon: 'fa-snowflake' },
  { value: 'heating', label: 'Heating', icon: 'fa-fire' },
  { value: 'internet', label: 'Internet', icon: 'fa-wifi' },
  { value: 'elevator', label: 'Elevator', icon: 'fa-arrow-up' },
  { value: 'balcony', label: 'Balcony', icon: 'fa-archway' },
  { value: 'pool', label: 'Swimming Pool', icon: 'fa-swimming-pool' },
  { value: 'gym', label: 'Gym', icon: 'fa-dumbbell' },
  { value: 'security', label: 'Security', icon: 'fa-shield-alt' },
  { value: 'petFriendly', label: 'Pet Friendly', icon: 'fa-paw' },
  { value: 'garden', label: 'Garden', icon: 'fa-tree' },
  { value: 'laundry', label: 'Laundry', icon: 'fa-soap' },
];

// Property types
const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'condo', label: 'Condo' },
  { value: 'villa', label: 'Villa' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'studio', label: 'Studio' },
  { value: 'office', label: 'Office' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' },
];

@Component({
  selector: 'app-property-add',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './property-add.component.html',
  styleUrl: './property-add.component.scss',
})
export class PropertyAddComponent implements OnInit {
  loading = false;
  error = '';
  success = false;
  today = new Date();

  propertyTypes = PROPERTY_TYPES;
  availableFeatures = PROPERTY_FEATURES;

  // Property model
  property = {
    title: '',
    description: '',
    propertyType: '',
    price: null as number | null,
    bedrooms: null as number | null,
    bathrooms: null as number | null,
    area: null as number | null,
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    location: {
      coordinates: [0, 0], // Default coordinates [longitude, latitude]
    },
    features: [] as string[],
    availability: {
      isAvailable: true,
      availableFrom: this.formatDate(new Date()),
      minimumStay: 1,
    },
    images: [] as string[],
  };

  // For image upload
  imageFiles: File[] = [];
  imagePreviews: string[] = [];

  constructor(
    private propertyService: PropertyService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is logged in
    this.authService.isLoggedIn().subscribe((loggedIn) => {
      if (!loggedIn) {
        this.router.navigate(['/login'], {
          queryParams: { redirect: '/properties/add' },
        });
      }
    });
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  toggleFeature(feature: string): void {
    const index = this.property.features.indexOf(feature);
    if (index > -1) {
      this.property.features.splice(index, 1);
    } else {
      this.property.features.push(feature);
    }
  }

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    files.forEach((file) => {
      // Check if file is an image
      if (!file.type.match(/image.*/)) return;

      // Add to files array
      newFiles.push(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string);
          this.imagePreviews = [...this.imagePreviews, ...newPreviews];
        }
      };
      reader.readAsDataURL(file);
    });

    this.imageFiles = [...this.imageFiles, ...newFiles];
  }

  removeImage(index: number): void {
    this.imageFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  validateForm(): boolean {
    // Required fields
    if (!this.property.title.trim()) {
      this.error = 'Title is required';
      return false;
    }

    if (!this.property.description.trim()) {
      this.error = 'Description is required';
      return false;
    }

    if (!this.property.propertyType) {
      this.error = 'Property type is required';
      return false;
    }

    if (this.property.price === null || this.property.price <= 0) {
      this.error = 'Valid price is required';
      return false;
    }

    if (this.property.bedrooms === null || this.property.bedrooms < 0) {
      this.error = 'Valid number of bedrooms is required';
      return false;
    }

    if (this.property.bathrooms === null || this.property.bathrooms < 0) {
      this.error = 'Valid number of bathrooms is required';
      return false;
    }

    if (this.property.area === null || this.property.area <= 0) {
      this.error = 'Valid area is required';
      return false;
    }

    // Address validation
    if (!this.property.address.street.trim()) {
      this.error = 'Street address is required';
      return false;
    }

    if (!this.property.address.city.trim()) {
      this.error = 'City is required';
      return false;
    }

    if (!this.property.address.state.trim()) {
      this.error = 'State/Province is required';
      return false;
    }

    if (!this.property.address.zipCode.trim()) {
      this.error = 'Zip/Postal code is required';
      return false;
    }

    if (!this.property.address.country.trim()) {
      this.error = 'Country is required';
      return false;
    }

    // At least one image required
    if (this.imageFiles.length === 0) {
      this.error = 'At least one image is required';
      return false;
    }

    return true;
  }

  submitProperty(): void {
    this.error = '';
    this.loading = true;

    if (!this.validateForm()) {
      this.loading = false;
      return;
    }

    // Get coordinates from address
    this.getCoordinatesFromAddress()
      .then(() => {
        // First create the property
        this.propertyService.createProperty(this.property).subscribe({
          next: (propertyResponse) => {
            const propertyId = propertyResponse.data._id;

            // Then upload images if there are any
            if (this.imageFiles.length > 0) {
              // Create FormData for image upload
              const formData = new FormData();
              this.imageFiles.forEach((file) => {
                formData.append('images', file);
              });

              // Upload images
              this.propertyService
                .uploadPropertyImages(propertyId, formData)
                .subscribe({
                  next: (imageResponse) => {
                    this.success = true;
                    this.loading = false;

                    // Redirect to property details after a short delay
                    setTimeout(() => {
                      this.router.navigate(['/properties', propertyId]);
                    }, 1500);
                  },
                  error: (err) => {
                    console.error('Error uploading images:', err);
                    this.error =
                      'Property created but failed to upload images. You can add images later.';
                    this.loading = false;
                    this.success = true; // Still consider it a success

                    // Redirect to property details after a short delay
                    setTimeout(() => {
                      this.router.navigate(['/properties', propertyId]);
                    }, 2000);
                  },
                });
            } else {
              this.success = true;
              this.loading = false;

              // Redirect to property details after a short delay
              setTimeout(() => {
                this.router.navigate(['/properties', propertyId]);
              }, 1500);
            }
          },
          error: (err) => {
            console.error('Error creating property:', err);
            this.error = 'Failed to create property. Please try again.';
            this.loading = false;
          },
        });
      })
      .catch((error) => {
        console.error('Error geocoding address:', error);
        this.error =
          'Failed to geocode address. Please verify your address is correct.';
        this.loading = false;
      });
  }

  // Get coordinates from address using Nominatim API (OpenStreetMap)
  async getCoordinatesFromAddress(): Promise<void> {
    const { street, city, state, zipCode, country } = this.property.address;
    const addressString = `${street}, ${city}, ${state}, ${zipCode}, ${country}`;

    try {
      // Encode the address for URL
      const encodedAddress = encodeURIComponent(addressString);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}`
      );

      if (!response.ok) {
        throw new Error('Failed to geocode address');
      }

      const data = await response.json();

      if (data && data.length > 0) {
        // Nominatim returns [lat, lon] but MongoDB expects [lon, lat]
        this.property.location.coordinates = [
          parseFloat(data[0].lon),
          parseFloat(data[0].lat),
        ];
      } else {
        // If no results found, use default coordinates
        this.property.location.coordinates = [0, 0];
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      // If error, use default coordinates
      this.property.location.coordinates = [0, 0];
    }
  }
}
