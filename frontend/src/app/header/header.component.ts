import { Component, OnInit, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  isLoggedIn = false;
  isAdmin = false;
  isOwner = false;
  mobileMenuOpen = false;
  isBrowser: boolean;
  showHeader = false;
  currentUrl: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.authService.isLoggedIn().subscribe((loggedIn) => {
        this.isLoggedIn = loggedIn;

        if (loggedIn) {
          this.checkUserRoles();
        } else {
          this.isAdmin = false;
          this.isOwner = false;
        }
      });

      // Check current route and listen to changes
      this.currentUrl = this.router.url;
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        this.currentUrl = event.url;
      });
    }
  }

  logout(): void {
    if (this.isBrowser) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  private checkUserRoles(): void {
    if (this.isBrowser) {
      const userData = this.authService.getUserData();
      this.isAdmin = userData?.role === 'admin';
      // this.isOwner = userData?.role === 'owner' || this.isAdmin; // Admin should also have owner privileges
      this.isOwner = userData?.role === 'owner' && !this.isAdmin;
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isBrowser) {
      this.showHeader = event.clientY <= 30; // when mouse is at the top 30px
    }
  }
}