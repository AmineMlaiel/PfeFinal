import { Component, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute, RouterModule } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { Title } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faTachometerAlt, faUsers, faBuilding, faCalendarCheck, faChartBar, faCog, faC } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-admin-layout',
  standalone:true,
  imports:[CommonModule,RouterModule,FontAwesomeModule],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent implements OnInit {
  @ViewChild('userDropdown') userDropdown!: ElementRef;
  isSidebarCollapsed = false;
  showUserDropdown = false;
  showNotificationsDropdown = false;
  pageTitle = 'Dashboard';
  notificationCount = 5;
  currentUser: any = null;
  userInitials = 'AU';

 navigationItems: { label: string; route: string; icon: IconDefinition }[] = [
  { label: 'Dashboard', route: '/admin/dashboard', icon: faTachometerAlt },
  { label: 'Users', route: '/admin/users', icon: faUsers },
  { label: 'Properties', route: '/admin/properties', icon: faBuilding },
  { label: 'Bookings', route: '/admin/bookings', icon: faCalendarCheck },
  { label: 'Reports', route: '/admin/reports', icon: faChartBar },
  { label: 'Settings', route: '/admin/settings', icon: faCog }
];

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    // Get user information
    this.loadUserData();
    
    // Set page title based on the route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => {
        let route = this.activatedRoute;
        while (route.firstChild) route = route.firstChild;
        return route;
      }),
      filter(route => route.outlet === 'primary'),
    ).subscribe(route => {
      const routeData = route.snapshot.data;
      if (routeData && routeData['title']) {
        this.pageTitle = routeData['title'];
        this.titleService.setTitle(`Rentify Admin - ${routeData['title']}`);
      } else {
        // Extract page title from URL
        const urlParts = this.router.url.split('/');
        if (urlParts.length > 0) {
          const lastPart = urlParts[urlParts.length - 1];
          this.pageTitle = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
          this.titleService.setTitle(`Rentify Admin - ${this.pageTitle}`);
        }
      }
    });
    
    // Set sidebar state based on screen size
    this.checkScreenSize();
  }

  loadUserData(): void {
    // In a real application, you would get this from your auth service
    // this.authService.getCurrentUser().subscribe(user => {
    //   this.currentUser = user;
    //   this.generateUserInitials();
    // });
    
    // For now, using static data
    this.currentUser = {
      name: 'Admin User',
      email: 'admin@rentify.com',
      role: 'Administrator'
    };
    this.generateUserInitials();
  }

  generateUserInitials(): void {
    if (this.currentUser && this.currentUser.name) {
      const nameParts = this.currentUser.name.split(' ');
      if (nameParts.length >= 2) {
        this.userInitials = `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
      } else if (nameParts.length === 1) {
        this.userInitials = nameParts[0].charAt(0);
      }
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkScreenSize();
  }

  checkScreenSize(): void {
    this.isSidebarCollapsed = window.innerWidth < 768;
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleUserDropdown(): void {
    this.showUserDropdown = !this.showUserDropdown;
    this.showNotificationsDropdown = false;
  }

  toggleNotifications(): void {
    this.showNotificationsDropdown = !this.showNotificationsDropdown;
    this.showUserDropdown = false;
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event): void {
    if (this.userDropdown && !this.userDropdown.nativeElement.contains(event.target)) {
      this.showUserDropdown = false;
    }
  }

  isActive(route: string): boolean {
    return this.router.isActive(route, false);
  }

  logout(): void {
    // Call your auth service to log out
    // this.authService.logout().subscribe(() => {
    //   this.router.navigate(['/login']);
    // });
    
    // For now, just navigate to login
    this.router.navigate(['/login']);
  }
}