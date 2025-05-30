import { Component } from '@angular/core';
import { KanbanModule } from '@syncfusion/ej2-angular-kanban';

import { RouterLinkActive, RouterOutlet ,RouterLink} from '@angular/router';
import { NotificationService } from './Notifications/notification.service';

@Component({
  selector: 'app-root',
  imports: [KanbanModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Dynamics365_Frontend';

  constructor(private notificationService: NotificationService) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.notificationService.startConnection();
    } catch (err) {
      console.error('SignalR initialization error:', err);
    }
  }

  async ngOnDestroy(): Promise<void> {
    await this.notificationService.stopConnection();
  }
  
}
