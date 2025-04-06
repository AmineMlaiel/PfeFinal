export interface Property {
  _id?: string;
  title: string;
  description: string;
  propertyType: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  location?: {
    coordinates: number[];
    type?: string;
  };
  features: string[];
  availability: {
    isAvailable: boolean;
    availableFrom: Date | string;
    minimumStay: number;
  };
  images: string[];
  rating?: number;
  reviewCount?: number;
  isBookmarked?: boolean;
  host?: {
    _id: string;
    name?: string;
    email?: string;
    avatar?: string;
  };
}
