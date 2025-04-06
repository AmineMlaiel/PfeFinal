import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { AuthService } from '../../auth/auth.service';
import { FormsModule } from '@angular/forms';
import { GoogleMapsModule } from '@angular/google-maps';

// Interface for Google Maps options
interface MapOptions {
  center: { lat: number; lng: number };
  zoom: number;
  mapTypeId: string;
  mapTypeControl: boolean;
  streetViewControl: boolean;
  fullscreenControl: boolean;
}

// Interface for Marker position
interface MarkerPosition {
  lat: number;
  lng: number;
}

// Interface for Marker options
interface MarkerOptions {
  draggable: boolean;
}

@Component({
  selector: 'app-property-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DatePipe,
    GoogleMapsModule,
  ],
  templateUrl: './property-details.component.html',
  styleUrl: './property-details.component.scss',
})
export class PropertyDetailsComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('mapDiv') mapElement: ElementRef | undefined;

  propertyId: string = '';
  property: any = null;
  reviews: any[] = [];
  loading: boolean = true;
  error: string = '';
  isOwner: boolean = false;
  isLoggedIn: boolean = false;
  selectedImageIndex: number = 0;
  today: Date = new Date();
  private isBrowser: boolean = false;
  private map: any = null; // Will hold the Google Map instance
  private marker: any = null; // Will hold the marker

  // Google Maps properties
  mapOptions: MapOptions = {
    center: { lat: 40.7128, lng: -74.006 }, // Default New York City
    zoom: 15,
    mapTypeId: 'roadmap',
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  };
  markerPosition: MarkerPosition = { lat: 40.7128, lng: -74.006 };
  markerOptions: MarkerOptions = { draggable: false };
  mapLoaded = false;

  // Booking-related properties
  bookingStartDate: string = '';
  bookingEndDate: string = '';
  bookingDuration: number = 0;
  bookingTotal: number = 0;
  bookingError: string = '';

  // Review-related properties
  newReview = {
    rating: 5,
    comment: '',
  };
  reviewSubmitted = false;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private propertyService: PropertyService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.propertyId = id;
        this.loadPropertyDetails();
      } else {
        this.error = 'Property ID not provided';
        this.loading = false;
      }
    });

    this.authService.isLoggedIn().subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
    });
  }

  ngAfterViewInit(): void {
    // We'll initialize the map in the callback when data is loaded
  }

  ngOnDestroy(): void {
    // Cleanup
    this.map = null;
    this.marker = null;
  }

  // Initialize the map with property coordinates using the newer Google Maps JS API
  initializeMap(): void {
    if (!this.isBrowser || !window.google || !window.google.maps) {
      console.error('Google Maps not available');
      return;
    }

    // Get coordinates
    let latitude = 40.7128; // Default New York City
    let longitude = -74.006;

    // Check the structure of location data and extract coordinates correctly
    if (this.property?.location) {
      if (
        this.property.location.coordinates &&
        Array.isArray(this.property.location.coordinates)
      ) {
        // MongoDB GeoJSON format: [longitude, latitude]
        if (this.property.location.coordinates.length === 2) {
          longitude = this.property.location.coordinates[0];
          latitude = this.property.location.coordinates[1];
          console.log(
            'Using coordinates from location.coordinates array:',
            longitude,
            latitude
          );
        }
      } else if (
        this.property.location.latitude !== undefined &&
        this.property.location.longitude !== undefined
      ) {
        // Direct lat/lng properties
        latitude = this.property.location.latitude;
        longitude = this.property.location.longitude;
        console.log('Using direct lat/lng properties:', latitude, longitude);
      }
    } else if (
      this.property?.latitude !== undefined &&
      this.property?.longitude !== undefined
    ) {
      // Some APIs store coordinates at the root level
      latitude = this.property.latitude;
      longitude = this.property.longitude;
      console.log('Using root-level coordinates:', latitude, longitude);
    }

    console.log('Final coordinates being used for map:', latitude, longitude);

    // Update marker position and map options
    this.markerPosition = { lat: latitude, lng: longitude };
    this.mapOptions = {
      ...this.mapOptions,
      center: { lat: latitude, lng: longitude },
    };

    // Initialize the map
    const mapDiv = document.getElementById('property-map');
    if (!mapDiv) {
      console.error('Map container not found');
      return;
    }

    try {
      // Create the map
      this.map = new google.maps.Map(mapDiv, {
        center: { lat: latitude, lng: longitude },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: true,
        fullscreenControl: true,
      });

      // Create an info window for the marker
      const infoWindow = new google.maps.InfoWindow({
        content: `<div><strong>${
          this.property.title || 'Property'
        }</strong><br>${this.property.address?.street || ''}</div>`,
      });

      // Check if we can use the newer AdvancedMarkerElement
      if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
        // Use the newer AdvancedMarkerElement
        this.marker = new google.maps.marker.AdvancedMarkerElement({
          map: this.map,
          position: { lat: latitude, lng: longitude },
          title: this.property.title || 'Property Location',
        });

        // Add a click listener to show info
        this.marker.addListener('click', () => {
          const advancedMarkerPosition = this.marker.position;
          const position = {
            lat: advancedMarkerPosition.lat,
            lng: advancedMarkerPosition.lng,
          };
          infoWindow.setPosition(position);
          infoWindow.open(this.map);
        });
      } else {
        // Fall back to the old Marker
        this.marker = new google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map: this.map,
          title: this.property.title || 'Property Location',
        });

        // Add a click listener to show info
        this.marker.addListener('click', () => {
          infoWindow.open(this.map, this.marker);
        });
      }

      // Set the map as loaded
      this.mapLoaded = true;
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  // Added method for template
  getFeatureIcon(feature: string): string {
    const iconMap: { [key: string]: string } = {
      parking: 'fa-car',
      furnished: 'fa-couch',
      airConditioning: 'fa-snowflake',
      heating: 'fa-fire',
      internet: 'fa-wifi',
      elevator: 'fa-arrow-up',
      balcony: 'fa-archway',
      pool: 'fa-swimming-pool',
      gym: 'fa-dumbbell',
      security: 'fa-shield-alt',
      petFriendly: 'fa-paw',
      garden: 'fa-tree',
      laundry: 'fa-soap',
    };

    return iconMap[feature] || 'fa-check';
  }

  loadPropertyDetails(): void {
    this.loading = true;
    this.propertyService.getProperty(this.propertyId).subscribe({
      next: (response) => {
        if (response.data) {
          this.property = response.data;
          this.reviews = response.reviews || [];

          // Check if current user is the owner
          if (this.isLoggedIn && this.property.owner) {
            this.authService.getCurrentUser().subscribe((user) => {
              this.isOwner = user && user._id === this.property.owner._id;
            });
          }

          // Set default dates for booking
          const today = new Date();
          const tomorrow = new Date();
          tomorrow.setDate(today.getDate() + 1);

          this.bookingStartDate = this.formatDate(today);
          this.bookingEndDate = this.formatDate(tomorrow);
          this.calculateBookingDetails();

          // Initialize map after data is loaded
          if (this.isBrowser) {
            setTimeout(() => this.initializeMap(), 300);
          }
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading property details:', err);
        this.error = 'Failed to load property details. Please try again.';
        this.loading = false;
      },
    });
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  selectImage(index: number): void {
    this.selectedImageIndex = index;
  }

  calculateBookingDetails(): void {
    if (!this.bookingStartDate || !this.bookingEndDate) return;

    const start = new Date(this.bookingStartDate);
    const end = new Date(this.bookingEndDate);

    // Calculate number of days
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff <= 0) {
      this.bookingError = 'Check-out date must be after check-in date';
      this.bookingDuration = 0;
      this.bookingTotal = 0;
      return;
    }

    this.bookingError = '';
    this.bookingDuration = daysDiff;
    this.bookingTotal = daysDiff * this.property.price;
  }

  bookProperty(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], {
        queryParams: { redirect: `/properties/${this.propertyId}` },
      });
      return;
    }

    if (!this.bookingStartDate || !this.bookingEndDate) {
      this.bookingError = 'Please select check-in and check-out dates';
      return;
    }

    this.calculateBookingDetails();
    if (this.bookingError) return;

    const bookingData = {
      property: this.propertyId,
      checkIn: this.bookingStartDate,
      checkOut: this.bookingEndDate,
      totalPrice: this.bookingTotal,
    };

    // Navigate to booking confirmation page with booking details
    this.router.navigate(['/booking/confirm'], {
      state: { bookingData: bookingData, property: this.property },
    });
  }

  submitReview(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], {
        queryParams: { redirect: `/properties/${this.propertyId}` },
      });
      return;
    }

    if (!this.newReview.comment.trim()) {
      return;
    }

    const reviewData = {
      property: this.propertyId,
      rating: this.newReview.rating,
      comment: this.newReview.comment,
    };

    this.propertyService.addReview(this.propertyId, reviewData).subscribe({
      next: (response) => {
        this.reviewSubmitted = true;
        this.reviews.unshift(response.data);
        this.newReview = { rating: 5, comment: '' };

        // Update property rating
        if (this.property) {
          this.property.rating =
            response.propertyRating || this.property.rating;
          this.property.reviewCount = this.reviews.length;
        }
      },
      error: (err) => {
        console.error('Error submitting review:', err);
      },
    });
  }

  bookmarkProperty(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], {
        queryParams: { redirect: `/properties/${this.propertyId}` },
      });
      return;
    }

    this.propertyService.bookmarkProperty(this.propertyId).subscribe({
      next: (response) => {
        this.property.isBookmarked = !this.property.isBookmarked;
      },
      error: (err) => {
        console.error('Error bookmarking property:', err);
      },
    });
  }

  editProperty(): void {
    this.router.navigate(['/properties/edit', this.propertyId]);
  }

  deleteProperty(): void {
    if (
      confirm(
        'Are you sure you want to delete this property? This action cannot be undone.'
      )
    ) {
      this.propertyService.deleteProperty(this.propertyId).subscribe({
        next: () => {
          this.router.navigate(['/properties']);
        },
        error: (err) => {
          console.error('Error deleting property:', err);
          this.error = 'Failed to delete property. Please try again.';
        },
      });
    }
  }
}
