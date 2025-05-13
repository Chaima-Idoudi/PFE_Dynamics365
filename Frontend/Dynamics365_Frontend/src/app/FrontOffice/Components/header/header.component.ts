import { Component, EventEmitter, Output, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../login/services/auth.service';
import { Router } from '@angular/router';
import { ProfileService } from '../../../BackOffice/profile/profile.service';
import { AvatarComponent } from '../../../Avatar/avatar/avatar.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule, CommonModule, AvatarComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  fullName: string | null = '';
  userPhoto: string | null = null;
  @Output() toggleSidebar = new EventEmitter<void>();
  isUserDropdownOpen = false;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private elementRef: ElementRef,
    private authService: AuthService,
    private router: Router,
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
    this.fullName = this.authService.getFullName();
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.profileService.getUserProfile().subscribe({
      next: (profile) => {
        if (profile.Photo) {
          this.userPhoto = profile.Photo;
        }
        if (profile.FullName) {
          this.fullName = profile.FullName;
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement du profil', err);
      }
    });
  }

  navigateToProfile() {
    this.isUserDropdownOpen = false;
    this.router.navigate(['/home/userProfile']);
  }

  onToggleClick() {
    this.toggleSidebar.emit();
  }

  toggleUserDropdown() {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  logout(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.authService.logout().subscribe({
      next: () => {
        this.handleLogoutSuccess();
      },
      error: (err) => {
        this.handleLogoutError(err);
      }
    });
  }

  private handleLogoutSuccess(): void {
    this.isLoading = false;
    this.authService.clearUserId();
    this.router.navigate(['/login']);
  }

  private handleLogoutError(error: any): void {
    this.isLoading = false;
    this.errorMessage = 'Une erreur est survenue lors de la déconnexion';
    console.error('Logout error:', error);
    this.authService.clearUserId();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isUserDropdownOpen = false;
    }
  }
}