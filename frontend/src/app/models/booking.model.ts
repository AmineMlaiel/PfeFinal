// Interface for guest count
export interface Guest {
  adults: number;
  children: number;
}

// Interface for price breakdown returned by backend
export interface PriceBreakdown {
  basePrice: number;
  daysInMonth?: number;
  monthlyDiscount?: string;
  additionalGuestFee: number;
  cleaningFee: number;
  serviceFee: number;
  totalPrice: number;
}

// Main Booking interface (used throughout the app)
export interface Booking {
  _id?: string;
  propertyId: string;
  userId?: string;
  bookingMonth?: string | null;
  bookingDate?: string | null;
  isMonthlyBooking: boolean;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  guests: Guest;
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
  specialRequests?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;

  // Properties used in my-bookings.component.ts
  checkIn?: string | Date;
  checkOut?: string | Date;
  canDelete?: boolean;

  // For display purposes
  property?: {
    _id: string;
    title: string;
    images: string[];
    address: {
      city: string;
      state: string;
    };
    price: number;
  };
  user?: {
    _id: string;
    name: string;
    email: string;
    mobileNumber : string;
    isVerified?:boolean;
  };
}

// Response from API when calculating price
export interface BookingResponse {
  success: boolean;
  message?: string;
  data?: {
    breakdown?: PriceBreakdown;
    booking?: Booking;
    bookings?: Booking[];
  };
  isAvailable?: boolean;
}
export interface User {
  name: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  password: string;
  confirmPassword?: string;
  isVerified?: boolean;
  role?: 'renter' | 'owner' | 'admin';
  id?: string;
}
