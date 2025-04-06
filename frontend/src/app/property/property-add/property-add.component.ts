import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
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
export class PropertyAddComponent implements OnInit, AfterViewInit, OnDestroy {
  loading = false;
  error = '';
  success = false;
  today = new Date();

  propertyTypes = PROPERTY_TYPES;
  availableFeatures = PROPERTY_FEATURES;

  // For map selection
  latitude: number | null = null;
  longitude: number | null = null;
  private map: any = null;
  private marker: any = null;

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

  ngAfterViewInit(): void {
    // Initialize map after view is loaded
    setTimeout(() => this.initMap(), 300);
  }

  ngOnDestroy(): void {
    // Clean up map resources
    if (this.map) {
      if (typeof this.map.remove === 'function') {
        this.map.remove();
      } else if (this.marker) {
        // Google Maps doesn't have a remove method, need to handle differently
        this.marker.setMap(null);
      }
      this.map = null;
      this.marker = null;
    }
  }

  // Initialize the Google Map for location selection
  private initMap(): void {
    // Make sure Google Maps API is loaded
    if (!window.google || !window.google.maps) {
      console.error('Google Maps API not loaded');
      return;
    }

    // Get the map container
    const mapElement = document.getElementById('location-select-map');
    if (!mapElement) {
      console.error('Map container not found');
      return;
    }

    // Try to get initial coordinates based on the address entered so far
    let initialLat = 34.415248154118444; // Default to New York
    let initialLng = 8.803669105208915;

    // Set up the map
    this.map = new google.maps.Map(mapElement, {
      center: { lat: initialLat, lng: initialLng },
      zoom: 10,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    // Add click listener to the map
    this.map.addListener('click', (event: any) => {
      const clickedLat = event.latLng.lat();
      const clickedLng = event.latLng.lng();
      this.setMapMarker(clickedLat, clickedLng);
    });

    // Trigger geocoding when address fields change
    document
      .getElementById('street')
      ?.addEventListener('blur', () => this.geocodeAddress());
    document
      .getElementById('city')
      ?.addEventListener('blur', () => this.geocodeAddress());
    document
      .getElementById('country')
      ?.addEventListener('blur', () => this.geocodeAddress());
  }

  // Attempt to geocode the entered address and update the map
  private geocodeAddress(): void {
    // Only proceed if we have sufficient address info
    if (!this.property.address.street || !this.property.address.city) {
      return;
    }

    if (!window.google || !window.google.maps) return;

    const geocoder = new google.maps.Geocoder();
    const address = `${this.property.address.street}, ${
      this.property.address.city
    }, ${this.property.address.state || ''}, ${
      this.property.address.country || ''
    }`;

    geocoder.geocode({ address }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;

        // Update the map view
        this.map.setCenter(location);
        this.map.setZoom(15);

        // Set the marker at this location
        const lat = location.lat();
        const lng = location.lng();
        this.setMapMarker(lat, lng);
      }
    });
  }

  // Set or update the marker on the map
  private setMapMarker(lat: number, lng: number): void {
    // Update our form values
    this.latitude = lat;
    this.longitude = lng;

    // Update property coordinates (MongoDB format is [longitude, latitude])
    this.property.location.coordinates = [lng, lat];

    // Remove existing marker if any
    if (this.marker) {
      this.marker.setMap(null);
    }

    // Create a new marker
    this.marker = new google.maps.Marker({
      position: { lat, lng },
      map: this.map,
      draggable: true, // Allow users to fine-tune the position
      animation: google.maps.Animation.DROP,
    });

    // Add drag end listener to update coordinates when marker is moved
    this.marker.addListener('dragend', () => {
      const position = this.marker.getPosition();
      if (position) {
        this.latitude = position.lat();
        this.longitude = position.lng();
        // Use non-null assertion since we know these values exist at this point
        this.property.location.coordinates = [this.longitude!, this.latitude!];
      }
    });

    console.log('Selected coordinates:', [lng, lat]);
  }

  updateCoordinates(): void {
    if (this.longitude !== null && this.latitude !== null) {
      this.property.location.coordinates = [this.longitude, this.latitude];
      console.log('Coordinates updated:', this.property.location.coordinates);
    }
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

    // Use manually entered coordinates if available, otherwise skip geocoding
    if (this.latitude === null || this.longitude === null) {
      console.log(
        'Using default coordinates [0, 0] as no manual coordinates were provided'
      );
    } else {
      // Update coordinates one more time before submission
      this.updateCoordinates();
    }

    // Create the property with the current coordinates
    this.propertyService.createProperty(this.property).subscribe({
      next: (propertyResponse) => {
        const propertyId = propertyResponse.data._id;

        // Then upload images if there are any
        if (this.imageFiles.length > 0) {
          // Create FormData for image upload
          const formData = new FormData();

          // Backend expects "images" as the field name for file uploads
          // If multiple files, append each one with the same field name
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
                this.success = true;

                setTimeout(() => {
                  this.router.navigate(['/properties', propertyId]);
                }, 2000);
              },
            });
        } else {
          this.success = true;
          this.loading = false;

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
  }
}
