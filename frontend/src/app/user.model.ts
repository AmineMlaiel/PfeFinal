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
