import { Routes } from '@angular/router';

// Auth Components
import { LoginComponent } from './auth/login/login.component';
import { SignUpComponent } from './auth/sign-up/sign-up.component';
import { HomeSweethomeComponent } from './home/home-sweethome/home-sweethome.component';

// Admin Components
import { AdminLayoutComponent } from './admin/admin-layout/admin-layout.component'; // Import the new layout
import { AdminDashboardComponent } from './admin/dashbord/dashbord.component';
import { PropertyApprovalComponent } from './admin/property-approval/property-approval.component';
// TODO: You will need to create and import components for other admin sections if they don't exist
// For example, based on your admin-layout.component.html navigation:
// import { AdminUsersComponent } from './admin/users/users.component'; // If you have a users management page
// import { AdminBookingsComponent } from './admin/bookings/bookings.component'; // If you have a bookings management page
// import { AdminReportsComponent } from './admin/reports/reports.component'; // If you have a reports page
// import { AdminSettingsComponent } from './admin/settings/settings.component'; // If you have a settings page

import { ProfileComponent } from './profile/profile.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './auth/reset-password/reset-password.component';

// Property Components
import { PropertyListComponent } from './property/property-list/property-list.component';
import { PropertyDetailsComponent } from './property/property-details/property-details.component';
import { PropertyAddComponent } from './property/property-add/property-add.component';
import { PropertyUpdateComponent } from './property/property-update/property-update.component';
import { MyPropertiesComponent } from './property/my-properties/my-properties.component';
import { MyBookingsComponent } from './booking/my-bookings/my-bookings.component';
import { OwnerDashboardComponent } from './property/owner-dashboard/owner-dashboard.component';
import { DemandsComponent } from './property/demands/demands.component';

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
    component: AdminLayoutComponent, // Use AdminLayoutComponent as the wrapper for admin routes
    canActivate: [adminGuard],       // The guard can be applied to the parent layout route
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // Default child for /admin, redirects to /admin/dashboard
      { path: 'dashboard', component: AdminDashboardComponent, data: { title: 'Dashboard' } },
      { path: 'properties', component: PropertyApprovalComponent, data: { title: 'Property Approval' } },
      // TODO: Define routes for other admin sections. Create components if they don't exist yet.
      // Your admin-layout.component.html has links for 'Users', 'Bookings', 'Reports', 'Settings'.
      // You would add their routes here once the components are created, for example:
      // { path: 'users', component: AdminUsersComponent, data: { title: 'Manage Users' } },
      // { path: 'bookings', component: AdminBookingsComponent, data: { title: 'Bookings' } }, 
      // { path: 'reports', component: AdminReportsComponent, data: { title: 'Reports' } },
      // { path: 'settings', component: AdminSettingsComponent, data: { title: 'Settings' } },
    ]
  },
  // The old individual admin routes (like the direct '/admin' to AdminDashboardComponent and '/admin/properties')
  // are now part of the children array above, so they should be removed from this top level.
  {
    path: 'profile',
    component: ProfileComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },
  {
    path: 'properties',
    component: PropertyListComponent
  },
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
  {
    path: 'my-bookings',
    component: MyBookingsComponent,
    canActivate: [authGuard],
  },
  {
    path: 'properties/:id',
    component: PropertyDetailsComponent
  },
  {
    path: 'properties/:id/update',
    component: PropertyUpdateComponent,
  },
  {
  path: 'demands',
  component:DemandsComponent,
  canActivate: [authGuard] // si besoin
},

  {
    path: 'property/:id',
    component: PropertyDetailsComponent
  },
  {
    path: 'owner',
    component: OwnerDashboardComponent,
  },
  { path: '**', redirectTo: '/home' }, // Consistent wildcard redirect
];

