export interface Booking {
  _id?: string;
  propertyId: string;
  userId?: string;
  checkIn: Date | string;
  checkOut: Date | string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  guests: {
    adults: number;
    children: number;
  };
  contactInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  specialRequests?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
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
  };
}

export interface BookingResponse {
  success: boolean;
  data?: Booking | Booking[];
  message?: string;
}
