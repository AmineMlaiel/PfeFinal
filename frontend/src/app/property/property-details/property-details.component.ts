import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { AuthService } from '../../auth/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-property-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DatePipe],
  templateUrl: './property-details.component.html',
  styleUrl: './property-details.component.scss',
})
export class PropertyDetailsComponent implements OnInit {
  propertyId: string = '';
  property: any = null;
  reviews: any[] = [];
  loading: boolean = true;
  error: string = '';
  isOwner: boolean = false;
  isLoggedIn: boolean = false;
  selectedImageIndex: number = 0;
  today: Date = new Date(); // Added for template

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
    public router: Router, // Changed to public for template access
    private propertyService: PropertyService,
    private authService: AuthService
  ) {}

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
