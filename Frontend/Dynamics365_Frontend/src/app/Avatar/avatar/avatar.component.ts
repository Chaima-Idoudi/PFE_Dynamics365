import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  imports: [],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.css'
})
export class AvatarComponent {
  @Input() imageUrl: string | null = null;
  @Input() name: string = '';
  @Input() size: number = 0 ; 
  @Input() borderColor: string = 'rgba(0, 32, 80, 0.1)';

  
  get initials(): string {
    return this.name
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0].toUpperCase())
      .join('')
      .slice(0, 2); 
  }

  
  get backgroundColor(): string {
    const colors = ['#002050', '#3B82F6', '#10B981', '#F59E0B', '#6366F1'];
    const hash = this.name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[Math.abs(hash) % colors.length];
  }
}
