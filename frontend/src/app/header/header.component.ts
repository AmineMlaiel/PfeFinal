import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';

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
        }
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
      this.isAdmin = userData && userData.role === 'admin';
      this.isOwner =
        userData && (userData.role === 'owner' || userData.role === 'admin');
    }
  }
}
