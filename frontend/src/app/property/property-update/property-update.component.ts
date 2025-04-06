import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { AuthService } from '../../auth/auth.service';
import { Property } from '../../models/property.model';
import { take } from 'rxjs/operators';

// Property features to select from - same as in add component
const PROPERTY_FEATURES = [
  { value: 'wifi', label: 'Wi-Fi', icon: 'fa-wifi' },
  { value: 'parking', label: 'Parking', icon: 'fa-parking' },
  { value: 'pool', label: 'Swimming Pool', icon: 'fa-swimming-pool' },
  { value: 'gym', label: 'Gym', icon: 'fa-dumbbell' },
  { value: 'airConditioning', label: 'Air Conditioning', icon: 'fa-snowflake' },
  { value: 'heating', label: 'Heating', icon: 'fa-temperature-high' },
  { value: 'washer', label: 'Washer', icon: 'fa-soap' },
  { value: 'dryer', label: 'Dryer', icon: 'fa-wind' },
  { value: 'tv', label: 'TV', icon: 'fa-tv' },
  { value: 'kitchen', label: 'Kitchen', icon: 'fa-utensils' },
  { value: 'breakfast', label: 'Breakfast', icon: 'fa-coffee' },
  { value: 'desk', label: 'Workspace', icon: 'fa-desktop' },
  { value: 'petFriendly', label: 'Pet Friendly', icon: 'fa-paw' },
  { value: 'smokingAllowed', label: 'Smoking Allowed', icon: 'fa-smoking' },
];

// Property types - same as in add component
const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'other', label: 'Other' },
];

@Component({
  selector: 'app-property-update',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './property-update.component.html',
  styleUrl: './property-update.component.scss',
})
export class PropertyUpdateComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  propertyId: string = '';
  loading = true;
  error: string | null = null;
  success = false;
  today = new Date();
  notFound = false;
  notAuthorized = false;

  propertyTypes = PROPERTY_TYPES;
  availableFeatures = PROPERTY_FEATURES;

  // For map selection
  latitude: number | null = null;
  longitude: number | null = null;
  private map: any = null;
  private marker: any = null;

  // Property model - same structure as add component
  property!: Property;

  // For image upload
  imageFiles: File[] = [];
  imagePreviews: string[] = [];
  existingImages: string[] = [];
  imagesToDelete: string[] = [];

  constructor(
    private propertyService: PropertyService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check if user is logged in
    this.authService.isLoggedIn().subscribe((loggedIn) => {
      if (!loggedIn) {
        this.router.navigate(['/login'], {
          queryParams: { redirect: this.router.url },
        });
        return;
      }

      // Get property ID from route
      this.route.paramMap.subscribe((params) => {
        const id = params.get('id');
        if (id) {
          this.propertyId = id;
          this.loadPropertyData();
        } else {
          this.router.navigate(['/properties']);
        }
      });
    });
  }

  ngAfterViewInit(): void {
    // Map will be initialized after property data is loaded
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

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

    // Initial coordinates - use existing property coordinates if available
    let initialLat = 40.7128; // Default to New York
    let initialLng = -74.006;

    if (
      this.property.location &&
      this.property.location.coordinates &&
      this.property.location.coordinates.length === 2
    ) {
      // MongoDB stores as [longitude, latitude]
      initialLng = this.property.location.coordinates[0];
      initialLat = this.property.location.coordinates[1];

      // Also set our form values
      this.longitude = initialLng;
      this.latitude = initialLat;
    }

    // Set up the map
    this.map = new google.maps.Map(mapElement, {
      center: { lat: initialLat, lng: initialLng },
      zoom: 14,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    });

    // Create initial marker with existing coordinates
    this.setMapMarker(initialLat, initialLng);

    // Add click listener to the map to allow changing the location
    this.map.addListener('click', (event: any) => {
      const clickedLat = event.latLng.lat();
      const clickedLng = event.latLng.lng();
      this.setMapMarker(clickedLat, clickedLng);
    });
  }

  // Set or update the marker on the map
  private setMapMarker(lat: number, lng: number): void {
    // Update our form values
    this.latitude = lat;
    this.longitude = lng;

    // Update property coordinates (MongoDB format is [longitude, latitude])
    if (this.property && this.property.location) {
      this.property.location.coordinates = [lng, lat];
    }

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
        if (this.property && this.property.location) {
          this.property.location.coordinates = [
            this.longitude!,
            this.latitude!,
          ];
        }
      }
    });

    console.log('Selected coordinates:', [lng, lat]);
  }

  // Update coordinates from map selection
  updateCoordinates(): void {
    if (
      this.longitude !== null &&
      this.latitude !== null &&
      this.property.location
    ) {
      // MongoDB stores coordinates as [longitude, latitude]
      this.property.location.coordinates = [this.longitude, this.latitude];
      console.log('Coordinates updated:', this.property.location.coordinates);
    }
  }

  loadPropertyData(): void {
    this.loading = true;
    this.propertyService.getProperty(this.propertyId).subscribe({
      next: (response) => {
        if (!response || !response.data) {
          this.notFound = true;
          this.loading = false;
          return;
        }

        const propertyData = response.data;

        // Check if current user is the owner
        this.authService.getCurrentUser().subscribe((user) => {
          if (user && propertyData.host && user._id === propertyData.host._id) {
            // Populate form with property data
            this.property = propertyData;
            this.existingImages = [...this.property.images];

            // Make sure availability date is correctly formatted
            if (typeof this.property.availability.availableFrom === 'string') {
              this.property.availability.availableFrom = new Date(
                this.property.availability.availableFrom
              );
            }

            // Extract latitude and longitude for the map
            if (
              this.property.location &&
              this.property.location.coordinates &&
              this.property.location.coordinates.length === 2
            ) {
              this.longitude = this.property.location.coordinates[0];
              this.latitude = this.property.location.coordinates[1];
            }

            // Initialize map after property data is loaded
            setTimeout(() => this.initMap(), 500);
          } else {
            // Not authorized
            this.notAuthorized = true;
          }

          this.loading = false;
        });
      },
      error: (err) => {
        console.error('Error loading property data:', err);
        this.error = 'Failed to load property data. Please try again.';
        this.loading = false;
      },
    });
  }

  toggleFeature(feature: string): void {
    const index = this.property.features.indexOf(feature);
    if (index === -1) {
      this.property.features.push(feature);
    } else {
      this.property.features.splice(index, 1);
    }
  }

  onImageSelect(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files) {
      const totalImages =
        this.existingImages.length +
        this.imageFiles.length +
        inputElement.files.length;

      if (totalImages > 10) {
        this.error = 'You can only upload a maximum of 10 images in total.';
        return;
      }

      for (let i = 0; i < inputElement.files.length; i++) {
        const file = inputElement.files[i];

        // Validate file type and size
        if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
          this.error = 'Please upload only image files (JPEG, PNG, GIF).';
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          // 5MB max
          this.error = 'Image size should not exceed 5MB.';
          continue;
        }

        this.imageFiles.push(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviews.push(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeImage(index: number): void {
    if (index >= 0 && index < this.imagePreviews.length) {
      this.imagePreviews.splice(index, 1);
      this.imageFiles.splice(index, 1);
    }
  }

  removeExistingImage(url: string): void {
    this.imagesToDelete.push(url);
    this.existingImages = this.existingImages.filter((image) => image !== url);
  }

  restoreImage(url: string): void {
    const index = this.imagesToDelete.indexOf(url);
    if (index > -1) {
      this.imagesToDelete.splice(index, 1);
      this.existingImages.push(url);
    }
  }

  validateForm(): boolean {
    // Reset error
    this.error = null;

    // Check required fields
    if (
      !this.property.title ||
      !this.property.description ||
      !this.property.propertyType
    ) {
      this.error = 'Please fill in all required fields.';
      return false;
    }

    // Check property price, bedrooms, bathrooms, area
    if (!this.property.price || this.property.price <= 0) {
      this.error = 'Please enter a valid price.';
      return false;
    }

    if (
      this.property.bedrooms < 0 ||
      this.property.bathrooms < 0 ||
      this.property.area <= 0
    ) {
      this.error =
        'Please enter valid values for bedrooms, bathrooms, and area.';
      return false;
    }

    // Check address
    if (
      !this.property.address.street ||
      !this.property.address.city ||
      !this.property.address.state ||
      !this.property.address.zipCode ||
      !this.property.address.country
    ) {
      this.error = 'Please fill in all address fields.';
      return false;
    }

    // Check if at least one image is present
    if (this.existingImages.length === 0 && this.imageFiles.length === 0) {
      this.error = 'Please upload at least one image of your property.';
      return false;
    }

    // Ensure availability date is valid
    if (!this.property.availability.availableFrom) {
      this.error = 'Please select an availability date.';
      return false;
    }

    return true;
  }

  updateProperty(): void {
    if (!this.validateForm()) return;

    this.loading = true;
    this.error = null;

    // Use manually entered coordinates if available
    if (this.latitude !== null && this.longitude !== null) {
      this.updateCoordinates();
      if (this.property.location && this.property.location.coordinates) {
        console.log(
          'Using manually entered coordinates:',
          this.property.location.coordinates
        );
      }
    } else {
      console.log('No manual coordinates provided, using existing coordinates');
    }

    // First delete any images that need to be removed
    const updateProperty = () => {
      // Clone the property to avoid any reference issues
      const updatedProperty = { ...this.property };

      // Update existing images in property data
      updatedProperty.images = [...this.existingImages];

      // Handle property update with potential new images
      const updateWithImages = () => {
        if (this.imageFiles.length > 0) {
          // If there are new images, upload them first
          const formData = new FormData();
          this.imageFiles.forEach((file) => {
            formData.append('images', file);
          });

          this.propertyService
            .uploadPropertyImages(this.propertyId, formData)
            .subscribe(
              (imageUrls) => {
                // Combine existing and new images
                updatedProperty.images = [
                  ...updatedProperty.images,
                  ...imageUrls,
                ];

                // Now update the property data
                this.propertyService
                  .updateProperty(this.propertyId, updatedProperty)
                  .subscribe(
                    () => this.handleSuccess(),
                    (error) => this.handleError(error)
                  );
              },
              (error) => this.handleError(error)
            );
        } else {
          // No new images to upload, just update property data
          this.propertyService
            .updateProperty(this.propertyId, updatedProperty)
            .subscribe(
              () => this.handleSuccess(),
              (error) => this.handleError(error)
            );
        }
      };

      // Process any images to delete
      if (this.imagesToDelete.length > 0) {
        this.propertyService
          .deletePropertyImages(this.propertyId, this.imagesToDelete)
          .subscribe(
            () => updateWithImages(),
            (error) => this.handleError(error)
          );
      } else {
        updateWithImages();
      }
    };

    updateProperty();
  }

  private handleSuccess(): void {
    this.success = true;
    this.loading = false;

    // Redirect back to property details after update
    setTimeout(() => {
      this.router.navigate(['/properties', this.propertyId]);
    }, 2000);
  }

  private handleError(error: any): void {
    this.loading = false;
    this.error =
      'Error updating property: ' + (error.message || 'Unknown error');
    console.error('Property update error:', error);
  }
}
