// sidebar.component.ts
import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ChatService } from '../../Chat-System/chat.service';

interface MenuItem {
  path: string;
  icon: string;
  label: string;
  notification?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  isSidebarOpen = false;
  isMobileView = false;
  @Input() collapsed = false;
  @Output() toggleCollapse = new EventEmitter<void>();
  chatUnreadCount = 0;

  menuItems: MenuItem[] = [
    { icon: 'fas fa-tachometer-alt', label: 'Dashboard', path: '/home/subdashbord' },
    { icon: 'fas fa-wrench', label: 'Tickets', path: '/home/myCases' },
    { icon: 'fas fa-comment', label: 'Chat', path: '/home/chat' },
    
  ];

   constructor(private chatService: ChatService) {}

  ngOnInit() {
    this.checkViewport();
    this.chatService.unreadCount$.subscribe({
      next: count => {
        this.chatUnreadCount = count || 0;
      },
      error: err => console.error('Error in unread count subscription:', err)
    });
  }

  checkViewport() {
    this.isMobileView = window.innerWidth < 768;
    this.isSidebarOpen = !this.isMobileView;
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkViewport();
  }

  trackByPath(index: number, item: MenuItem): string {
    return item.path;
  }
}