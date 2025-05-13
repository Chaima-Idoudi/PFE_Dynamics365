import { Component } from '@angular/core';
import { ProfileService, UserProfile } from './profile.service';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from '../../Avatar/avatar/avatar.component';


@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, AvatarComponent],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css'
})
export class UserProfileComponent {
userProfile: UserProfile | null = null;
  error: string | null = null;

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.profileService.getUserProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.error = null;
      },
      error: (err) => {
        this.error = err.message || 'Erreur lors du chargement du profil.';
        this.userProfile = null;
      }
    });
  }
}
