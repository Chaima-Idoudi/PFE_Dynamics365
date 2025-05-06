import { Component, EventEmitter, Output, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../login/services/auth.service';
import { Router } from '@angular/router';
import { ProfileService } from '../../profile/profile.service';

interface Notification {
  id: number;
  message: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  fullName: string | null = '';
  userPhoto: string = 'https://plus.unsplash.com/premium_photo-1664536392779-049ba8fde933?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
  @Output() toggleSidebar = new EventEmitter<void>();
  ngOnInit(): void {
    this.fullName = this.authService.getFullName();
    this.loadUserProfile();  
  }
  navigateToProfile() {
    this.isUserDropdownOpen = false;
    this.router.navigate(['/dashboard/profile']);
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
  searchQuery = '';
  isUserDropdownOpen = false;
  notifications: Notification[] = [
    { id: 1, message: 'New order received', time: '10 min ago', read: false },
    { id: 2, message: 'System update available', time: '1 hour ago', read: true },
    { id: 3, message: 'New user registered', time: '2 hours ago', read: true }
  ];

  constructor(private elementRef: ElementRef,private authService: AuthService,
    private router: Router , private profileService: ProfileService) {}
  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  onToggleClick() {
    this.toggleSidebar.emit();
  }

  toggleUserDropdown() {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  
  isLoading = false;
  errorMessage: string | null = null;
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
    // On déconnecte quand même côté client
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