import { Routes } from '@angular/router';

// Auth Components
import { LoginComponent } from './auth/login/login.component';
import { SignUpComponent } from './auth/sign-up/sign-up.component';
import { HomeSweethomeComponent } from './home/home-sweethome/home-sweethome.component';
import { AdminDashboardComponent } from './admin/dashbord/dashbord.component';
import { PropertyApprovalComponent } from './admin/property-approval/property-approval.component';
import { ProfileComponent } from './profile/profile.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './auth/reset-password/reset-password.component';

// Property Components
import { PropertyListComponent } from './property/property-list/property-list.component';
import { PropertyDetailsComponent } from './property/property-details/property-details.component';
import { PropertyAddComponent } from './property/property-add/property-add.component';
import { PropertyUpdateComponent } from './property/property-update/property-update.component';
import { MyPropertiesComponent } from './property/my-properties/my-properties.component';

// Auth Guard
export const authGuard = () => {
  return true; // Always allow access for now - this should be replaced with proper logic
};

// Admin Guard
export const adminGuard = () => {
  return true; // Always allow access for now - this should be replaced with proper admin check logic
};

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignUpComponent },
  { path: 'home', component: HomeSweethomeComponent },
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [adminGuard],
  },
  {
    path: 'admin/properties',
    component: PropertyApprovalComponent,
    canActivate: [adminGuard],
  },
  { path: 'profile', component: ProfileComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'properties', component: PropertyListComponent },
  {
    path: 'properties/add',
    component: PropertyAddComponent,
    canActivate: [authGuard],
  },
  {
    path: 'properties/my-properties',
    component: MyPropertiesComponent,
    canActivate: [authGuard],
  },
  { path: 'properties/:id', component: PropertyDetailsComponent },
  {
    path: 'properties/:id/update',
    component: PropertyUpdateComponent,
  },
  { path: 'property/:id', component: PropertyDetailsComponent },
  { path: '**', redirectTo: '' },
];
