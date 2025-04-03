import { Component, EventEmitter, Output } from '@angular/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
interface Notification {
  id: number;
  message: string;
  time: string;
  read: boolean;
}
@Component({
  selector: 'app-header',
  imports: [FormsModule,CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  
  searchQuery = '';
  notifications: Notification[] = [
    { id: 1, message: 'New order received', time: '10 min ago', read: false },
    { id: 2, message: 'System update available', time: '1 hour ago', read: true },
    { id: 3, message: 'New user registered', time: '2 hours ago', read: true }
  ];

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }
  
}
