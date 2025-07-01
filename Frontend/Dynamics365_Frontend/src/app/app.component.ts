import { Component, OnInit, OnDestroy } from '@angular/core';
import { KanbanModule } from '@syncfusion/ej2-angular-kanban';
import { RouterLinkActive, RouterOutlet, RouterLink } from '@angular/router';
import { NotificationService } from './Notifications/notification.service';
import { ChatService } from './Chat-System/chat.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [KanbanModule, RouterOutlet, ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Dynamics365_Frontend';

  constructor(
    private notificationService: NotificationService, 
    private chatService: ChatService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      // Initialiser les deux services de connexion
      await this.notificationService.startConnection();
      
    } catch (err) {
      console.error('Initialization error:', err);
    }

    console.log('Initializing chat service...');
    this.chatService.initializeConnection();
    
    // Test de réception
    this.chatService.unreadCount$.subscribe(count => {
      console.log('Unread messages count:', count);
    });
  
  }

  async ngOnDestroy(): Promise<void> {
    try {
      await this.notificationService.stopConnection();
      this.chatService.disconnect();
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }
}